import { parseHunks } from './parse-hunks';
import type { Hunk, Change } from './parse-hunks';

const emptyHunk = '';

const singleHunk = `@@ -1,3 +1,4 @@\n This is the first line.\n-This is the second line.\n This is the third line.\n+This is the fourth line.\n+This is the fifth line.\n`;

const multipleHunks = `@@ -1,10 +1,10 @@
-import AWS from "aws-sdk";
+import { SQSClient, SendMessageCommand, SendMessageBatchCommand } from "@aws-sdk/client-sqs";
 import { z } from "zod";
 import type { ZodRawShape, ZodAny, ZodObject } from "zod";
 import { nanoid } from "nanoid";
 import type { SQSEvent } from "aws-lambda";

-const sqs = new AWS.SQS();
+const sqs = new SQSClient();

 type Content<Shape extends ZodRawShape> = z.infer<ZodObject<Shape, "strip", ZodAny>>

@@ -36,10 +36,10 @@ export function createMessage<QueueUrl extends string, Shape extends ZodRawShape
   });

   const send: Send<Shape, MetadataShape> = async (content, metadata) => {
-    await sqs.sendMessage({
+    await sqs.send(new SendMessageCommand({
       QueueUrl: queueUrl,
       MessageBody: JSON.stringify(messageSchema.parse({ content, metadata })),
-    }).promise();
+    }))
   }

   const sendAll: BatchSend<Shape, MetadataShape> = async (contentArray, metadata) => {
@@ -53,10 +53,10 @@ export function createMessage<QueueUrl extends string, Shape extends ZodRawShape
         }));
       batches.push(Entries);
     }
-    const result = await Promise.allSettled(batches.map(batch => sqs.sendMessageBatch({
+    const result = await Promise.allSettled(batches.map(batch => sqs.send(new SendMessageBatchCommand({
       QueueUrl: queueUrl,
       Entries: batch,
-    }).promise()));
+    }))));

     result.forEach((r, i) => {
       if (r.status === 'rejected') {`;

const deletionMultipleHunks = `@@ -3,7 +3,6 @@ import { z } from "zod";

 import { MergeRequestSchema } from "@acme/extract-schema/src/merge-requests";
 import { createEvent } from "./create-event";
-import { NamespaceSchema, RepositorySchema } from "@acme/extract-schema";

 const extractRepositoryEventSchema = z.object({
   repositoryId: z.number(),
@@ -19,8 +18,6 @@ const metadataSchema = z.object({
 });
 const extractMergeRequestEventSchema = z.object({
   mergeRequestIds: z.array(MergeRequestSchema.shape.id),
-  repositoryId: RepositorySchema.shape.id,
-  namespaceId: NamespaceSchema.shape.id
 });

 export type extractMergeRequestsEventMessage = z.infer<typeof extractMergeRequestEventSchema>;`;

describe('parse-hunks:', () => {
  describe('parseHunk', () => {
    test('should parse empty hunk', () => {
      const result = parseHunks(emptyHunk);
      expect(result).toEqual([]);
    });
    test('should parse single hunk', () => {
      const result = parseHunks(singleHunk);
      expect(result).toEqual([
        {
          content: singleHunk,
          oldStart: 1,
          newStart: 1,
          oldLines: 3,
          newLines: 4,
          additions: 2,
          deletions: 1,
          changes: [
            {
              content: 'This is the first line.',
              newLineNumber: 1,
              oldLineNumber: 1,
              type: 'normal',
            },
            {
              content: 'This is the second line.',
              lineNumber: 2,
              type: 'delete',
            },
            {
              content: 'This is the third line.',
              newLineNumber: 2,
              oldLineNumber: 3,
              type: 'normal',
            },
            {
              content: 'This is the fourth line.',
              lineNumber: 3,
              type: 'insert',
            },
            {
              content: 'This is the fifth line.',
              lineNumber: 4,
              type: 'insert',
            },
            {
              content: '',
              type: 'normal',
              newLineNumber: 5,
              oldLineNumber: 4,
            },
          ] satisfies Change[]
        },
      ] satisfies Hunk[])
    })
    test('should parse multiple hunks', () => {
      const result = parseHunks(multipleHunks);
      expect(result).toEqual(
        [
          {
            content: "@@ -1,10 +1,10 @@\n-import AWS from \"aws-sdk\";\n+import { SQSClient, SendMessageCommand, SendMessageBatchCommand } from \"@aws-sdk/client-sqs\";\n import { z } from \"zod\";\n import type { ZodRawShape, ZodAny, ZodObject } from \"zod\";\n import { nanoid } from \"nanoid\";\n import type { SQSEvent } from \"aws-lambda\";\n\n-const sqs = new AWS.SQS();\n+const sqs = new SQSClient();\n\n type Content<Shape extends ZodRawShape> = z.infer<ZodObject<Shape, \"strip\", ZodAny>>\n",
            oldStart: 1,
            newStart: 1,
            oldLines: 10,
            newLines: 10,
            deletions: 2,
            additions: 2,
            changes: [
              {
                content: "import AWS from \"aws-sdk\";",
                type: "delete",
                lineNumber: 1
              },
              {
                content: "import { SQSClient, SendMessageCommand, SendMessageBatchCommand } from \"@aws-sdk/client-sqs\";",
                type: "insert",
                lineNumber: 1
              },
              {
                content: "import { z } from \"zod\";",
                type: "normal",
                oldLineNumber: 2,
                newLineNumber: 2
              },
              {
                content: "import type { ZodRawShape, ZodAny, ZodObject } from \"zod\";",
                type: "normal",
                oldLineNumber: 3,
                newLineNumber: 3
              },
              {
                content: "import { nanoid } from \"nanoid\";",
                type: "normal",
                oldLineNumber: 4,
                newLineNumber: 4
              },
              {
                content: "import type { SQSEvent } from \"aws-lambda\";",
                type: "normal",
                oldLineNumber: 5,
                newLineNumber: 5
              },
              {
                content: "",
                type: "normal",
                oldLineNumber: 6,
                newLineNumber: 6
              },
              {
                content: "const sqs = new AWS.SQS();",
                type: "delete",
                lineNumber: 7
              },
              {
                content: "const sqs = new SQSClient();",
                type: "insert",
                lineNumber: 7
              },
              {
                content: "",
                type: "normal",
                oldLineNumber: 8,
                newLineNumber: 8
              },
              {
                content: "type Content<Shape extends ZodRawShape> = z.infer<ZodObject<Shape, \"strip\", ZodAny>>",
                type: "normal",
                oldLineNumber: 9,
                newLineNumber: 9
              },
              {
                content: "",
                type: "normal",
                oldLineNumber: 10,
                newLineNumber: 10
              }
            ]
          },
          {
            content: "@@ -36,10 +36,10 @@ export function createMessage<QueueUrl extends string, Shape extends ZodRawShape\n   });\n\n   const send: Send<Shape, MetadataShape> = async (content, metadata) => {\n-    await sqs.sendMessage({\n+    await sqs.send(new SendMessageCommand({\n       QueueUrl: queueUrl,\n       MessageBody: JSON.stringify(messageSchema.parse({ content, metadata })),\n-    }).promise();\n+    }))\n   }\n\n   const sendAll: BatchSend<Shape, MetadataShape> = async (contentArray, metadata) => {",
            oldStart: 36,
            newStart: 36,
            oldLines: 10,
            newLines: 10,
            additions: 2,
            deletions: 2,
            changes: [
              {
                content: "  });",
                type: "normal",
                oldLineNumber: 36,
                newLineNumber: 36
              },
              {
                content: "",
                type: "normal",
                oldLineNumber: 37,
                newLineNumber: 37
              },
              {
                content: "  const send: Send<Shape, MetadataShape> = async (content, metadata) => {",
                type: "normal",
                oldLineNumber: 38,
                newLineNumber: 38
              },
              {
                content: "    await sqs.sendMessage({",
                type: "delete",
                lineNumber: 39
              },
              {
                content: "    await sqs.send(new SendMessageCommand({",
                type: "insert",
                lineNumber: 39
              },
              {
                content: "      QueueUrl: queueUrl,",
                type: "normal",
                oldLineNumber: 40,
                newLineNumber: 40
              },
              {
                content: "      MessageBody: JSON.stringify(messageSchema.parse({ content, metadata })),",
                type: "normal",
                oldLineNumber: 41,
                newLineNumber: 41
              },
              {
                content: "    }).promise();",
                type: "delete",
                lineNumber: 42
              },
              {
                content: "    }))",
                type: "insert",
                lineNumber: 42
              },
              {
                content: "  }",
                type: "normal",
                oldLineNumber: 43,
                newLineNumber: 43
              },
              {
                content: "",
                type: "normal",
                oldLineNumber: 44,
                newLineNumber: 44
              },
              {
                content: "  const sendAll: BatchSend<Shape, MetadataShape> = async (contentArray, metadata) => {",
                type: "normal",
                oldLineNumber: 45,
                newLineNumber: 45
              }
            ]
          },
          {
            content: "@@ -53,10 +53,10 @@ export function createMessage<QueueUrl extends string, Shape extends ZodRawShape\n         }));\n       batches.push(Entries);\n     }\n-    const result = await Promise.allSettled(batches.map(batch => sqs.sendMessageBatch({\n+    const result = await Promise.allSettled(batches.map(batch => sqs.send(new SendMessageBatchCommand({\n       QueueUrl: queueUrl,\n       Entries: batch,\n-    }).promise()));\n+    }))));\n\n     result.forEach((r, i) => {\n       if (r.status === 'rejected') {",
            oldStart: 53,
            newStart: 53,
            oldLines: 10,
            newLines: 10,
            additions: 2,
            deletions: 2,
            changes: [
              {
                content: "        }));",
                type: "normal",
                oldLineNumber: 53,
                newLineNumber: 53
              },
              {
                content: "      batches.push(Entries);",
                type: "normal",
                oldLineNumber: 54,
                newLineNumber: 54
              },
              {
                content: "    }",
                type: "normal",
                oldLineNumber: 55,
                newLineNumber: 55
              },
              {
                content: "    const result = await Promise.allSettled(batches.map(batch => sqs.sendMessageBatch({",
                type: "delete",
                lineNumber: 56
              },
              {
                content: "    const result = await Promise.allSettled(batches.map(batch => sqs.send(new SendMessageBatchCommand({",
                type: "insert",
                lineNumber: 56
              },
              {
                content: "      QueueUrl: queueUrl,",
                type: "normal",
                oldLineNumber: 57,
                newLineNumber: 57
              },
              {
                content: "      Entries: batch,",
                type: "normal",
                oldLineNumber: 58,
                newLineNumber: 58
              },
              {
                content: "    }).promise()));",
                type: "delete",
                lineNumber: 59
              },
              {
                content: "    }))));",
                type: "insert",
                lineNumber: 59
              },
              {
                content: "",
                type: "normal",
                oldLineNumber: 60,
                newLineNumber: 60
              },
              {
                content: "    result.forEach((r, i) => {",
                type: "normal",
                oldLineNumber: 61,
                newLineNumber: 61
              },
              {
                content: "      if (r.status === 'rejected') {",
                type: "normal",
                oldLineNumber: 62,
                newLineNumber: 62
              }
            ]
          }
        ]);
    });
    test('should parse deletion multiple hunks', () => {
      const result = parseHunks(deletionMultipleHunks);
      expect(result).toEqual(
        [
          {
            content: "@@ -3,7 +3,6 @@ import { z } from \"zod\";\n\n import { MergeRequestSchema } from \"@acme/extract-schema/src/merge-requests\";\n import { createEvent } from \"./create-event\";\n-import { NamespaceSchema, RepositorySchema } from \"@acme/extract-schema\";\n\n const extractRepositoryEventSchema = z.object({\n   repositoryId: z.number(),",
            oldStart: 3,
            newStart: 3,
            oldLines: 7,
            newLines: 6,
            additions: 0,
            deletions: 1,
            changes: [
              {
                content: "",
                type: "normal",
                oldLineNumber: 3,
                newLineNumber: 3,
              },
              {
                content: "import { MergeRequestSchema } from \"@acme/extract-schema/src/merge-requests\";",
                type: "normal",
                oldLineNumber: 4,
                newLineNumber: 4
              },
              {
                content: "import { createEvent } from \"./create-event\";",
                type: "normal",
                oldLineNumber: 5,
                newLineNumber: 5
              },
              {
                content: "import { NamespaceSchema, RepositorySchema } from \"@acme/extract-schema\";",
                type: "delete",
                lineNumber: 6
              },
              {
                content: "",
                type: "normal",
                oldLineNumber: 7,
                newLineNumber: 6
              },
              {
                content: "const extractRepositoryEventSchema = z.object({",
                type: "normal",
                oldLineNumber: 8,
                newLineNumber: 7
              },
              {
                content: "  repositoryId: z.number(),",
                type: "normal",
                oldLineNumber: 9,
                newLineNumber: 8
              }
            ]
          },
          {
            content: "@@ -19,8 +18,6 @@ const metadataSchema = z.object({\n });\n const extractMergeRequestEventSchema = z.object({\n   mergeRequestIds: z.array(MergeRequestSchema.shape.id),\n-  repositoryId: RepositorySchema.shape.id,\n-  namespaceId: NamespaceSchema.shape.id\n });\n\n export type extractMergeRequestsEventMessage = z.infer<typeof extractMergeRequestEventSchema>;",
            oldStart: 19,
            newStart: 18,
            oldLines: 8,
            newLines: 6,
            additions: 0,
            deletions: 2,
            changes: [
              {
                content: "});",
                type: "normal",
                oldLineNumber: 19,
                newLineNumber: 18
              },
              {
                content: "const extractMergeRequestEventSchema = z.object({",
                type: "normal",
                oldLineNumber: 20,
                newLineNumber: 19
              },
              {
                content: "  mergeRequestIds: z.array(MergeRequestSchema.shape.id),",
                type: "normal",
                oldLineNumber: 21,
                newLineNumber: 20
              },
              {
                content: "  repositoryId: RepositorySchema.shape.id,",
                type: "delete",
                lineNumber: 22
              },
              {
                content: "  namespaceId: NamespaceSchema.shape.id",
                type: "delete",
                lineNumber: 23
              },
              {
                content: "});",
                type: "normal",
                oldLineNumber: 24,
                newLineNumber: 21
              },
              {
                content: "",
                type: "normal",
                oldLineNumber: 25,
                newLineNumber: 22
              },
              {
                content: "export type extractMergeRequestsEventMessage = z.infer<typeof extractMergeRequestEventSchema>;",
                type: "normal",
                oldLineNumber: 26,
                newLineNumber: 23
              }
            ]
          }
        ]
      );
    });

  });
});

