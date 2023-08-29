import { SQSClient, SendMessageCommand, SendMessageBatchCommand } from "@aws-sdk/client-sqs";
import { z } from "zod";
import type { ZodRawShape, ZodAny, ZodObject } from "zod";
import { nanoid } from "nanoid";
import type { SQSEvent } from "aws-lambda";

import { Queue } from 'sst/node/queue'

const sqs = new SQSClient();

type Content<Shape extends ZodRawShape> = z.infer<ZodObject<Shape, "strip", ZodAny>>;

type Send<Shape extends ZodRawShape, MetadataShape extends ZodRawShape> = (
  content: Content<Shape>,
  metadata: Content<MetadataShape>,
) => Promise<void>;

type BatchSend<Shape extends ZodRawShape, MetadataShape extends ZodRawShape> = (
  content: Content<Shape>[],
  metadata: Content<MetadataShape>,
) => Promise<void>;

type MessageProps<Shape extends ZodRawShape, MetadataShape extends ZodRawShape> = {
  contentShape: Shape;
  metadataShape: MetadataShape;
  kind: string;
};

export function createMessage<Shape extends ZodRawShape, MetadataShape extends ZodRawShape>({
  kind,
  contentShape,
  metadataShape,
}: MessageProps<Shape, MetadataShape>) {

  const queueUrl = Queue.ExtractQueue.queueUrl;

  const messageSchema = z.object({
    kind: z.literal(kind),
    content: z.object(contentShape),
    metadata: z.object(metadataShape),
  });

  const send: Send<Shape, MetadataShape> = async (content, metadata) => {
    await sqs.send(new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(messageSchema.parse({ content, metadata, kind })),
    }))
  }

  const sendAll: BatchSend<Shape, MetadataShape> = async (contentArray, metadata) => {
    const batches: { Id: string, MessageBody: string }[][] = [];
    for (let i = 0; i < contentArray.length; i += 10) {
      const contentBatch = contentArray.slice(i, i + 10);
      const Entries = contentBatch.map(content => JSON.stringify(messageSchema.parse({ content, metadata, kind })))
        .map(MessageBody => ({
          Id: nanoid(),
          MessageBody
        }));
      batches.push(Entries);
    }
    const result = await Promise.allSettled(batches.map(batch => sqs.send(new SendMessageBatchCommand({
      QueueUrl: queueUrl,
      Entries: batch,
    }))));

    result.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error('batch failed', r.reason, batches[i]);
      }
    });

  }

  return {
    kind,
    send,
    sendAll,
    shapes: {
      contentShape,
      metadataShape,
    }
  }
}

type MessagePayload<Shape extends ZodRawShape, MetadataShape extends ZodRawShape> = {
  content: Content<Shape>;
  metadata: Content<MetadataShape>;
  kind: string;
}


export function QueueHandler(map: Map<string, unknown>) {

  return async (event: SQSEvent) => {
    if (event.Records.length > 1) console.warn('WARNING: QueueHandler should process 1 message but got', event.Records.length);
    for (const record of event.Records) {
      const parsedEvent = JSON.parse(record.body) as unknown as MessagePayload<ZodRawShape, ZodRawShape>;

      const { sender, handler } = (map as MessageKindMap).get(parsedEvent.kind) ?? { sender: null, handler: null };

      if (!sender || !handler) {
        console.error('No handler for message kind', parsedEvent.kind);
        break;
      }

      const schema = z.object({
        content: z.object(sender.shapes.contentShape),
        metadata: z.object(sender.shapes.metadataShape),
        kind: z.string(),
      });

      const validatedEvent = schema.parse(parsedEvent);

      await handler(validatedEvent);
    }
  }
} 

export type MessageKindMap = Map<string, ReturnType<typeof createMessageHandler>>;

type CreateMassageHandlerProps<Shape extends ZodRawShape, MetadataShape extends ZodRawShape> = {
  contentShape: Shape;
  metadataShape: MetadataShape;
  kind: string;
  handler: (message: MessagePayload<Shape, MetadataShape>) => Promise<void> | Promise<unknown>;
};

export function createMessageHandler<Shape extends ZodRawShape, MetadataShape extends ZodRawShape>({
  kind,
  contentShape,
  metadataShape,
  handler,
}: CreateMassageHandlerProps<Shape, MetadataShape>) {
  const sender = createMessage({ kind, contentShape, metadataShape });
  return {
    sender,
    handler,
  };
}
