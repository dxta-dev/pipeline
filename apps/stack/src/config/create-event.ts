import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import type { EventBridgeEvent } from "aws-lambda";
import { EventBus } from "sst/node/event-bus";
import { z } from "zod";
import { log } from "./logger";

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
    if (propertiesToLog.length === 0) return;
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
    const parseResult = eventSchema.safeParse(event.detail);
    if (!parseResult.success) {
      return log({
        message: `Failed to parse event detail '${targetSource}.${targetDetailType}'`,
        error: parseResult.error,
        shouldRetry: false,
        hasFailed: true,
      });
    }

    try {
      await cb(
        parseResult.data as EventPayload<PropertiesShape, MetadataShape>,
      );
      return log({
        message: createLog(parseResult.data, propertiesToLog, `${targetSource}.${targetDetailType}`),
        shouldRetry: false,
        hasFailed: false,
      });
    } catch (e) {
      return log({
        message: createLog(parseResult.data, propertiesToLog, `${targetSource}.${targetDetailType}`),
        error: e,
        shouldRetry: true,
        hasFailed: true,
      });
    }
  };
};
