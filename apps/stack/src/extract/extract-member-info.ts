import type {
  Context,
  GetMemberInfoEntities,
  GetMemberInfoSourceControl,
} from "@dxta/extract-functions";
import { members } from "@dxta/extract-schema";
import { EventHandler } from "@stack/config/create-event";
import { extractMemberInfoEvent, extractMembersEvent } from "./events";
import { createMessageHandler } from "@stack/config/create-message";
import { MessageKind, metadataSchema } from "./messages";
import { z } from "zod";
import { getMemberInfo } from "@dxta/extract-functions";
import { insertEvent } from "@dxta/crawl-functions";
import { events } from "@dxta/crawl-schema";
import { initDatabase, initSourceControl } from "./context";

type ExtractMemberInfoContext = Context<
  GetMemberInfoSourceControl,
  GetMemberInfoEntities
>;

export const memberInfoSenderHandler = createMessageHandler({
  queueId: "ExtractQueue",
  kind: MessageKind.MemberInfo,
  metadataShape: metadataSchema.shape,
  contentShape: z.object({
    memberId: z.number(),
  }).shape,
  handler: async (message) => {
    const { memberId } = message.content;

    const dynamicContext = {
      integrations: {
        sourceControl: await initSourceControl(message.metadata),
      },
      db: initDatabase(message.metadata),
    } satisfies Partial<ExtractMemberInfoContext>;

    await getMemberInfo({ memberId }, { ...staticContext, ...dynamicContext });
    await extractMemberInfoEvent.publish(
      { memberId },
      {
        ...message.metadata,
        timestamp: new Date().getTime(),
        version: 1,
        caller: "extract-member-info",
      },
    );
  },
});

const { sender } = memberInfoSenderHandler;

const staticContext = {
  entities: {
    members,
  },
} satisfies Partial<ExtractMemberInfoContext>;

export const eventHandler = EventHandler(extractMembersEvent, async (ev) => {
  const { sourceControl, userId } = ev.metadata;
  const { memberIds } = ev.properties;
  await sender.sendAll(
    memberIds.map((memberId) => ({ memberId })),
    {
      dbUrl: ev.metadata.dbUrl,
      crawlId: ev.metadata.crawlId,
      version: 1,
      caller: "extract-member-info",
      sourceControl,
      userId,
      timestamp: new Date().getTime(),
      from: ev.metadata.from,
      to: ev.metadata.to,
    },
  );

  await insertEvent(
    {
      crawlId: ev.metadata.crawlId,
      eventNamespace: "memberInfo",
      eventDetail: "crawlInfo",
      data: { calls: memberIds.length },
    },
    { db: initDatabase(ev.metadata), entities: { events } },
  );
});
