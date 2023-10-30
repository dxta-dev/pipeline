import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import type { EventBridgeEvent } from "aws-lambda";
import { EventBus } from "sst/node/event-bus";
import { z } from "zod";
import { crawlComplete, crawlFailed } from "./crawl";
import type { EventNamespaceType } from "@acme/crawl-schema";

const client = new EventBridgeClient({});
type InferShapeOutput<Shape extends z.ZodRawShape> = z.infer<
  z.ZodObject<Shape, "strip", z.ZodAny>
>;

type EventProps<
  Bus extends keyof typeof EventBus,
  Source extends string,
  DetailType extends string,
  PropertiesShape extends z.ZodRawShape,
  MetadataShape extends z.ZodRawShape,
> = {
  bus: Bus;
  source: Source;
  type: DetailType;
  propertiesShape: PropertiesShape;
  metadataShape: MetadataShape;
};

export const createEvent = <
  Bus extends keyof typeof EventBus,
  Source extends string,
  DetailType extends string,
  PropertiesShape extends z.ZodRawShape,
  MetadataShape extends z.ZodRawShape,
>({
  bus,
  source,
  type,
  propertiesShape,
  metadataShape,
}: EventProps<Bus, Source, DetailType, PropertiesShape, MetadataShape>) => {
  const propertiesSchema = z.object(propertiesShape);
  const metadataSchema = z.object(metadataShape);

  const publish = async (
    properties: InferShapeOutput<PropertiesShape>,
    metadata: InferShapeOutput<MetadataShape>,
  ) => {
    await client.send(
      new PutEventsCommand({
        Entries: [
          {
            EventBusName: EventBus[bus].eventBusName,
            Source: source,
            DetailType: type,
            Detail: JSON.stringify({
              properties: propertiesSchema.parse(properties),
              metadata: metadataSchema.parse(metadata),
            }),
          },
        ],
      }),
    );
  };

  return {
    publish,
    source,
    type,
    shape: {
      metadata: metadataShape,
      properties: propertiesShape,
    },
  };
};

export type EventDefinition<
  Source extends string,
  DetailType extends string,
  PropertiesShape extends z.ZodRawShape,
  MetadataShape extends z.ZodRawShape,
> = {
  source: Source;
  type: DetailType;
  shape: {
    properties: PropertiesShape;
    metadata: MetadataShape;
  };
};

type EventPayload<
  PropertiesShape extends z.ZodRawShape,
  MetadataShape extends z.ZodRawShape,
> = {
  properties: InferShapeOutput<PropertiesShape>;
  metadata: InferShapeOutput<MetadataShape>;
};


function createLog(event: unknown, propertiesToLog: string[], eventTypeName: string) {
  try {
    if (propertiesToLog.length === 0) return eventTypeName;
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

export const EventHandler = <
  Source extends string,
  DetailType extends string,
  PropertiesShape extends z.ZodRawShape,
  MetadataShape extends z.ZodRawShape,
>(
  event: EventDefinition<Source, DetailType, PropertiesShape, MetadataShape>,
  cb: (ev: EventPayload<PropertiesShape, MetadataShape>) => Promise<void>,
  propertiesToLog: string[] = [],
  crawlEventNamespace: (EventNamespaceType | null) = null,
) => {
  const { source: targetSource, type: targetDetailType } = event;
  const eventSchema = z.object({
    properties: z.object(event.shape.properties),
    metadata: z.object(event.shape.metadata),
  });

  return async (event: EventBridgeEvent<string, unknown>) => {
    if (
      event["detail-type"] !== targetDetailType ||
      event.source !== targetSource
    ) {
      console.warn(
        `Warning: Invalid event handler configuration, expected event ${targetSource}.${targetDetailType} but got ${event.source}.${event["detail-type"]}`,
      );
    }

    const isCrawlHandler = crawlEventNamespace !== null;
    const shouldLogHandling = propertiesToLog.length !== 0;
    const maybeCrawlEventDetail = event.detail as { metadata?: { crawlId?: number } };
    const crawlId = typeof maybeCrawlEventDetail.metadata?.crawlId === 'number' ? maybeCrawlEventDetail.metadata.crawlId : null;

    if (crawlId === null) return console.error(`Error: missing crawlId for event ${targetSource}.${targetDetailType}`);

    const parseResult = eventSchema.safeParse(event.detail);
    if (!parseResult.success) {
      console.error(
        `ERROR: Failed to parse event detail '${targetSource}.${targetDetailType}'. Reason: ${parseResult.error}`,
      );
      if (isCrawlHandler) return crawlFailed(crawlId, crawlEventNamespace, `Error: Failed to parse event ${targetDetailType} for crawl ${crawlEventNamespace}`);
      else return;
    }

    try {
      await cb(
        parseResult.data as EventPayload<PropertiesShape, MetadataShape>,
      );
      if (shouldLogHandling) console.log('Handled event', createLog(parseResult.data, propertiesToLog, `${targetSource}.${targetDetailType}`));
      if (isCrawlHandler) return crawlComplete(crawlId, targetDetailType as EventNamespaceType);
    } catch (e) {
      console.error('Failed to handle event', e, createLog(parseResult.data, propertiesToLog, `${targetSource}.${targetDetailType}`));
      if (isCrawlHandler) await crawlFailed(crawlId, crawlEventNamespace, e);
      throw e;
    }
  };
};
