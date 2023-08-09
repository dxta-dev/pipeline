import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import { z } from "zod";
import type { ZodRawShape, ZodAny, ZodObject } from "zod";


const client = new EventBridgeClient({});

type Properties<Shape extends ZodRawShape> = z.infer<ZodObject<Shape, "strip", ZodAny>>

type Publish<Shape extends ZodRawShape, MetadataShape extends ZodRawShape> = (
  properties: Properties<Shape>,
  metadata: z.infer<ZodObject<Exclude<MetadataShape, undefined>, "strip", ZodAny>>
) => Promise<void>;

type EventProps<Bus extends string, Source extends string, Type extends string, Shape extends ZodRawShape, MetadataShape extends ZodRawShape> = {
  source: Source;
  type: Type;
  propertiesShape: Shape;
  bus: Bus;
  metadataShape: MetadataShape;
};


export function createEvent<
  Bus extends string,
  Source extends string,
  Type extends string,
  Shape extends ZodRawShape,
  MetadataShape extends ZodRawShape,
>({
  source,
  type,
  propertiesShape,
  bus,
  metadataShape,
}: EventProps<Bus, Source, Type, Shape, MetadataShape>) {
  const propertiesSchema = z.object(propertiesShape);
  const metadataSchema = z.object(metadataShape);

  const publish: Publish<Shape, MetadataShape> = async (properties, metadata) => {
    console.log("publishing", { source, type, properties, metadata });
    await client.send(new PutEventsCommand({
      Entries: [{
        EventBusName: bus,
        Source: source,
        DetailType: type,
        Detail: JSON.stringify({
          propteries: propertiesSchema.parse(properties),
          metadata: metadataSchema.parse(metadata),
        }),
      }],
    }));
  };

  return {
    publish,
    source,
    type,
  };
}

