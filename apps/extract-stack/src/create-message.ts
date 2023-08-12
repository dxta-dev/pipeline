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

export function createBatchMessage<QueueUrl extends string, Shape extends ZodRawShape, MetadataShape extends ZodRawShape>({
  queueUrl,
  contentShape,
  metadataShape,
}: MessageProps<QueueUrl, Shape, MetadataShape>) {

  const messageSchema = z.object({
    content: z.object(contentShape),
    metadata: z.object(metadataShape),
  });

  const send: BatchSend<Shape, MetadataShape> = async (content, metadata) => {
    console.log("sending", { content, metadata });
    await sqs.sendMessageBatch({
      QueueUrl: queueUrl,
      Entries: content.map((c) => ({
        Id: nanoid(),
        MessageBody: JSON.stringify(messageSchema.parse({ content: c, metadata })),
      })),
    }).promise();
  }

  return {
    send,
  }
}

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

  return {
    send,
  }
}

type Sender<Shape extends ZodRawShape, MetadataShape extends ZodRawShape> = {
  send: Send<Shape, MetadataShape>;
}

type BatchSender<Shape extends ZodRawShape, MetadataShape extends ZodRawShape> = {
  send: BatchSend<Shape, MetadataShape>
}

type MessagePayload<Shape extends ZodRawShape, MetadataShape extends ZodRawShape> = {
  content: Content<Shape>;
  metadata: Content<MetadataShape>;
}

export function QueueHandler<Shape extends ZodRawShape, MetadataShape extends ZodRawShape>(
  _sender: Sender<Shape, MetadataShape> | BatchSender<Shape, MetadataShape>,
  cb: (
    evt: MessagePayload<Shape, MetadataShape>[]
  ) => Promise<void>
) {
  /**
   * TODO:
   * - Do consumers always recieve batches ?
   * - How handle processing failures ?
   */
  return async (event: SQSEvent) => {
    await cb(event.Records.map((record) => JSON.parse(record.body) as MessagePayload<Shape, MetadataShape>))
  }
}