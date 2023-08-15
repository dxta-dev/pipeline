import AWS from "aws-sdk";
import { z } from "zod";
import type { ZodRawShape, ZodAny, ZodObject } from "zod";
import { nanoid } from "nanoid";
import type { SQSEvent } from "aws-lambda";

const sqs = new AWS.SQS();

type Content<Shape extends ZodRawShape> = z.infer<ZodObject<Shape, "strip", ZodAny>>

type Send<Shape extends ZodRawShape, MetadataShape extends ZodRawShape> = (
  content: Content<Shape>,
  metadata: Content<MetadataShape>
) => Promise<void>;

type BatchSend<Shape extends ZodRawShape, MetadataShape extends ZodRawShape> = (
  content: Content<Shape>[],
  metadata: Content<MetadataShape>
) => Promise<void>;

type MessageProps<QueueUrl extends string, Shape extends ZodRawShape, MetadataShape extends ZodRawShape> = {
  queueUrl: QueueUrl;
  contentShape: Shape;
  metadataShape: MetadataShape;
};

export function createMessage<QueueUrl extends string, Shape extends ZodRawShape, MetadataShape extends ZodRawShape>({
  queueUrl,
  contentShape,
  metadataShape,
}: MessageProps<QueueUrl, Shape, MetadataShape>) {

  const messageSchema = z.object({
    content: z.object(contentShape),
    metadata: z.object(metadataShape),
  });

  const send: Send<Shape, MetadataShape> = async (content, metadata) => {
    console.log("sending", { content, metadata });
    await sqs.sendMessage({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(messageSchema.parse({ content, metadata })),
    }).promise();
  }

  const sendAll: BatchSend<Shape, MetadataShape> = async (contentArray, metadata) => {
    for (let i = 0; i < contentArray.length; i += 10) {
      const contentBatch = contentArray.slice(i, i + 10);
      const Entries = contentBatch.map(content => JSON.stringify(messageSchema.parse({ content, metadata })))
        .map(MessageBody => ({
          Id: nanoid(),
          MessageBody
        }));
      console.log("sending batch", Entries);
      try {
        await sqs.sendMessageBatch({
          QueueUrl: queueUrl,
          Entries
        }).promise();
      } catch (error) {
        console.error(error);
      }
    }

  }

  return {
    send,
    sendAll
  }
}

type Sender<Shape extends ZodRawShape, MetadataShape extends ZodRawShape> = {
  send: Send<Shape, MetadataShape>;
  sendAll: BatchSend<Shape, MetadataShape>
}

type MessagePayload<Shape extends ZodRawShape, MetadataShape extends ZodRawShape> = {
  content: Content<Shape>;
  metadata: Content<MetadataShape>;
}

export function QueueHandler<Shape extends ZodRawShape, MetadataShape extends ZodRawShape>(
  _sender: Sender<Shape, MetadataShape>,
  cb: (
    message: MessagePayload<Shape, MetadataShape>
  ) => Promise<void>
) {
  /**
   * TODO:
   * - Do consumers always recieve batches ?
   * - How handle processing failures ?
   */
  return async (event: SQSEvent) => {
    if (event.Records.length > 1) console.warn('WARNING: QueueHandler should process 1 message but got', event.Records.length);
    for (const record of event.Records) {
      await cb(JSON.parse(record.body) as MessagePayload<Shape, MetadataShape>);
    }
  }
}