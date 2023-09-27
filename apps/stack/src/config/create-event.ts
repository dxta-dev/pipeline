import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import type { EventBridgeEvent } from "aws-lambda";
import { EventBus } from "sst/node/event-bus";
import { z } from "zod";

const client = new EventBridgeClient({});
type InferShapeOutput<Shape extends z.ZodRawShape> = z.infer<z.ZodObject<Shape, "strip", z.ZodAny>>;

type EventProps<
  Bus extends keyof typeof EventBus,
  Source extends string,
  DetailType extends string,
  PropertiesShape extends z.ZodRawShape,
  MetadataShape extends z.ZodRawShape
> = {
  bus: Bus;
  source: Source;
  type: DetailType;
  propertiesShape: PropertiesShape;
  metadataShape: MetadataShape;
}

export const createEvent = <
  Bus extends keyof typeof EventBus,
  Source extends string,
  DetailType extends string,
  PropertiesShape extends z.ZodRawShape,
  MetadataShape extends z.ZodRawShape>({
    bus,
    source,
    type,
    propertiesShape,
    metadataShape,
  }: EventProps<Bus, Source, DetailType, PropertiesShape, MetadataShape>) => {
  const propertiesSchema = z.object(propertiesShape);
  const metadataSchema = z.object(metadataShape);

  const publish = async (properties: InferShapeOutput<PropertiesShape>, metadata: InferShapeOutput<MetadataShape>) => {
    await client.send(new PutEventsCommand({
      Entries: [{
        EventBusName: EventBus[bus].eventBusName,
        Source: source,
        DetailType: type,
        Detail: JSON.stringify({
          properties: propertiesSchema.parse(properties),
          metadata: metadataSchema.parse(metadata),
        }),
      }],
    }));
  };

  return {
    publish,
    source,
    type,
    shape: {
      metadata:metadataShape,
      properties:propertiesShape
    },
  };
}

export type EventDefinition<
  Source extends string,
  DetailType extends string,
  PropertiesShape extends z.ZodRawShape,
  MetadataShape extends z.ZodRawShape,
> = {
  source: Source,
  type: DetailType
  shape: {
    properties: PropertiesShape,
    metadata: MetadataShape
  }
}

type EventPayload<
  PropertiesShape extends z.ZodRawShape,
  MetadataShape extends z.ZodRawShape,
> = {
  properties: InferShapeOutput<PropertiesShape>;
  metadata: InferShapeOutput<MetadataShape>;
}

export const EventHandler = <
  Source extends string,
  DetailType extends string,
  PropertiesShape extends z.ZodRawShape,
  MetadataShape extends z.ZodRawShape>(
    event: EventDefinition<Source, DetailType, PropertiesShape, MetadataShape>,
    cb: (ev: EventPayload<PropertiesShape,MetadataShape>) => Promise<void>) => {
  const { source: targetSource, type: targetDetailType } = event;
  const eventSchema = z.object({
    properties: z.object(event.shape.properties),
    metadata: z.object(event.shape.metadata),
  });

  return async (
    event: EventBridgeEvent<string, unknown>
  ) => {
    if (event["detail-type"] !== targetDetailType || event.source !== targetSource) {
      console.warn(`Warning: Invalid event handler configuration, expected event ${targetSource}.${targetDetailType} but got ${event.source}.${event["detail-type"]}`);
    }
    const parseResult = eventSchema.safeParse(event.detail);
    if (!parseResult.success) return console.error(`ERROR: Failed to parse event detail '${targetSource}.${targetDetailType}'. Reason: ${parseResult.error}`);

    await cb(parseResult.data as EventPayload<PropertiesShape, MetadataShape>);
  }
}