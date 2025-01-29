import { SQSClient, SendMessageCommand, SendMessageBatchCommand } from "@aws-sdk/client-sqs";
import { z } from "zod";
import type { ZodRawShape, ZodAny, ZodObject } from "zod";
import { nanoid } from "nanoid";
import type { SQSEvent } from "aws-lambda";

import { Queue } from 'sst/node/queue'
import type { EventNamespaceType } from "@dxta/crawl-schema";
import { crawlComplete, crawlFailed } from "./crawl";
import type { Tenant } from "@dxta/super-schema";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { Config } from "sst/node/config";

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
  queueId: keyof typeof Queue
};

export function createMessage<Shape extends ZodRawShape, MetadataShape extends ZodRawShape>({
  kind,
  contentShape,
  metadataShape,
  queueId
}: MessageProps<Shape, MetadataShape>) {
  
  const messageSchema = z.object({
    kind: z.literal(kind),
    content: z.object(contentShape),
    metadata: z.object(metadataShape),
  });

  const send: Send<Shape, MetadataShape> = async (content, metadata) => {
    await sqs.send(new SendMessageCommand({
      QueueUrl: Queue[queueId].queueUrl,
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
      QueueUrl: Queue[queueId].queueUrl,
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

function createLog(event: unknown, eventTypeName: string, propertiesToLog?: string[]) {
  try {
    if (!propertiesToLog) return eventTypeName;
    const props = propertiesToLog.map((property) => property.split('.').reduce((acc, curr) => {
      const key = curr;
      if (acc?.value) return { key, value: (acc.value as Record<string, unknown>)[curr] };
      return { key, value: null }
    }, { key: '', value: event })
    ).filter((prop) => prop.value !== null);
    const logMessage = props.map(({ key, value }) => `- ${key}: ${JSON.stringify(value)}`).join('\n');
    return `${eventTypeName}\n${logMessage}`;
  } catch {
    return eventTypeName;
  }

}

export function QueueHandler(map: Map<string, unknown>, logMap: Map<string, string[]>, crawlNamespaceMap: Map<string, EventNamespaceType>) {

  return async (event: SQSEvent) => {
    if (event.Records.length > 1) console.warn('WARNING: QueueHandler should process 1 message but got', event.Records.length);
    for (const record of event.Records) {
      const parsedEvent = JSON.parse(record.body) as unknown as MessagePayload<ZodRawShape, ZodRawShape>;
      
      // Enforces all queue handlers to have dbUrl since it's required for extracts and crawls
      const dbUrl = parsedEvent.metadata?.dbUrl as unknown as (Tenant['dbUrl'] | undefined);
      if (dbUrl === undefined) {
        console.error(`No dbUrl for message kind ${parsedEvent.kind}`);
        break;
      }

      const { sender, handler } = (map as MessageKindMap).get(parsedEvent.kind) ?? { sender: null, handler: null };

      if (!sender || !handler) {
        console.error('No handler for message kind', parsedEvent.kind);
        break;
      }
      const propertiesToLog = logMap.get(parsedEvent.kind);

      const crawlId = parsedEvent.metadata?.crawlId as unknown as (number | undefined);

      const crawlEventNamespace = crawlNamespaceMap.get(parsedEvent.kind);

      const schema = z.object({
        content: z.object(sender.shapes.contentShape),
        metadata: z.object(sender.shapes.metadataShape),
        kind: z.string(),
      });
      const isCrawlMessage = schema.shape.metadata.shape.crawlId !== undefined; // required for extract-repositories
      const db = isCrawlMessage && dbUrl ? drizzle(createClient({
        url: dbUrl,
        authToken: Config.TENANT_DATABASE_AUTH_TOKEN
      })) : undefined;

      const validatedMessage = schema.safeParse(parsedEvent);

      if (!validatedMessage.success) {
        console.error(
          `ERROR: Failed to parse message '${parsedEvent.kind}'. Reason: ${validatedMessage.error}`,
        );
        await crawlFailed(isCrawlMessage, db, crawlId, crawlEventNamespace, `Error: Failed to parse message ${parsedEvent.kind} for crawl id: ${crawlId} - ${crawlEventNamespace}`);  
        return;        
      }

      let handlerError = null;
      
      try {
        await handler(validatedMessage.data);
      } catch (e) {
        handlerError = e;
      }

      if (!handlerError) {
        console.log('Handled message', createLog(validatedMessage.data, parsedEvent.kind, propertiesToLog))
        try {
          await crawlComplete(isCrawlMessage, db, crawlId, crawlEventNamespace);
        } catch (e) {
          console.error(`Failed to insert crawl complete event for id: ${crawlId} - ${crawlEventNamespace}`, e);
        } 
        return;
      }

      try {
        console.error('Failed to handle message', createLog(validatedMessage.data, parsedEvent.kind, propertiesToLog) + `\n- aws.attributes.ApproximateRecieveCount: ${record.attributes.ApproximateReceiveCount}`);
        await crawlFailed(isCrawlMessage, db, crawlId, crawlEventNamespace, handlerError);
      } catch (e) {
        console.error(`Failed to insert crawl failed event for id: ${crawlId} - ${crawlEventNamespace}`, e);
      }

      throw handlerError;
    }
  }
} 

export type MessageKindMap = Map<string, ReturnType<typeof createMessageHandler>>;

type CreateMessageHandlerProps<Shape extends ZodRawShape, MetadataShape extends ZodRawShape> = {
  contentShape: Shape;
  metadataShape: MetadataShape;
  kind: string;
  queueId: keyof typeof Queue;
  handler: (message: MessagePayload<Shape, MetadataShape>) => Promise<void> | Promise<unknown>;
};

export function createMessageHandler<Shape extends ZodRawShape, MetadataShape extends ZodRawShape>({
  kind,
  contentShape,
  metadataShape,
  queueId,
  handler,
}: CreateMessageHandlerProps<Shape, MetadataShape>) {
  const sender = createMessage({ kind, contentShape, metadataShape, queueId });
  return {
    sender,
    handler,
  };
}
