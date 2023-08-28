import { SQSClient, SendMessageCommand, SendMessageBatchCommand } from "@aws-sdk/client-sqs";
import { z } from "zod";
import type { ZodRawShape, ZodAny, ZodObject } from "zod";
import { nanoid } from "nanoid";
import type { SQSEvent } from "aws-lambda";


import { Queue } from 'sst/node/queue'

const sqs = new SQSClient();

type Content<Shape extends ZodRawShape> = z.infer<ZodObject<Shape, "strip", ZodAny>>

type Send<Shape extends ZodRawShape, MetadataShape extends ZodRawShape> = (
  content: Content<Shape>,
  metadata: Content<MetadataShape>
) => Promise<void>;

type BatchSend<Shape extends ZodRawShape, MetadataShape extends ZodRawShape> = (
  content: Content<Shape>[],
  metadata: Content<MetadataShape>
) => Promise<void>;

type MessageProps<Shape extends ZodRawShape, MetadataShape extends ZodRawShape, Kind extends string> = {
  contentShape: Shape;
  metadataShape: MetadataShape;
  kind: Kind;
};

export function createMessage<Shape extends ZodRawShape, MetadataShape extends ZodRawShape, Kind extends string>({
  kind,
  contentShape,
  metadataShape,
}: MessageProps<Shape, MetadataShape, Kind>) {

  const queueUrl = Queue.ExtractQueue.queueUrl;

  const messageSchema = z.object({
    kind: z.literal(kind),
    content: z.object(contentShape),
    metadata: z.object(metadataShape),
  });

  const send: Send<Shape, MetadataShape> = async (content, metadata) => {
    await sqs.send(new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(messageSchema.parse({ content, metadata })),
    }))
  }

  const sendAll: BatchSend<Shape, MetadataShape> = async (contentArray, metadata) => {
    const batches: { Id: string, MessageBody: string }[][] = [];
    for (let i = 0; i < contentArray.length; i += 10) {
      const contentBatch = contentArray.slice(i, i + 10);
      const Entries = contentBatch.map(content => JSON.stringify(messageSchema.parse({ content, metadata })))
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

type Sender<Shape extends ZodRawShape, MetadataShape extends ZodRawShape> = {
  send: Send<Shape, MetadataShape>;
  sendAll: BatchSend<Shape, MetadataShape>
  shapes: { contentShape: Shape, metadataShape: MetadataShape };
  kind: string;
}

type MessagePayload<Shape extends ZodRawShape, MetadataShape extends ZodRawShape> = {
  content: Content<Shape>;
  metadata: Content<MetadataShape>;
  kind: string;
}

type MessageKindMap = Map<string, { sender: Sender<ZodRawShape, ZodRawShape>, handler: (message: MessagePayload<ZodRawShape, ZodRawShape>) => Promise<void> }>;

export function QueueHandler(map: MessageKindMap) {

  return async (event: SQSEvent) => {
    if (event.Records.length > 1) console.warn('WARNING: QueueHandler should process 1 message but got', event.Records.length);
    for (const record of event.Records) {
      const parsedEvent = JSON.parse(record.body) as unknown as MessagePayload<ZodRawShape, ZodRawShape>;

      const { sender, handler } = map.get(parsedEvent.kind) ?? { sender: null, handler: null };

      if (!sender || !handler) {
        console.error('No handler for message kind', parsedEvent.kind);
        break;
      }

      const schema = z.object({
        content: z.object(sender.shapes.contentShape),
        metadata: z.object(sender.shapes.metadataShape),
        kind: z.literal(sender.kind),
      });

      const validatedEvent = schema.parse(parsedEvent);

      await handler(validatedEvent);
    }
  }
}

/*export function QueueHandler<Shape extends ZodRawShape, MetadataShape extends ZodRawShape>(
  sender: Sender<Shape, MetadataShape>,
  cb: (
    message: MessagePayload<Shape, MetadataShape>
  ) => Promise<void>
) {
  const schema = z.object({
    content: z.object(sender.shapes.contentShape),
    metadata: z.object(sender.shapes.metadataShape),
    kind: z.literal(sender.kind),
  });
  return async (event: SQSEvent) => {
    if (event.Records.length > 1) console.warn('WARNING: QueueHandler should process 1 message but got', event.Records.length);
    for (const record of event.Records) {
      const parsed = schema.parse(JSON.parse(record.body) as unknown) as MessagePayload<Shape, MetadataShape>;
      await cb(parsed);
    }
  }
} */
