import AWS from "aws-sdk";
import { z } from "zod";
import type { ZodRawShape, ZodAny, ZodObject } from "zod";

const sqs = new AWS.SQS();

type Content<Shape extends ZodRawShape> = z.infer<ZodObject<Shape, "strip", ZodAny>>

type Send<Shape extends ZodRawShape, MetadataShape extends ZodRawShape> = (
content: Content<Shape>,
metadata: MetadataShape
) => Promise<void>;

type MessageProps<QueueUrl extends string, Shape extends ZodRawShape, MetadataShape extends ZodRawShape> = {
  queueUrl: QueueUrl;
  contentShape: Content<Shape>;
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

  return {
    send
  }
}
