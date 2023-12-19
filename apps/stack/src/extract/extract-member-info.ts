import { GitHubSourceControl, GitlabSourceControl } from "@acme/source-control";
import type { Context, GetMemberInfoEntities, GetMemberInfoSourceControl } from "@acme/extract-functions";
import { members } from "@acme/extract-schema";
import { EventHandler } from "@stack/config/create-event";
import { extractMemberInfoEvent, extractMembersEvent } from "./events";
import { createMessageHandler } from "@stack/config/create-message";
import { MessageKind, metadataSchema } from "./messages";
import { z } from "zod";
import { getMemberInfo } from "@acme/extract-functions";
import { getClerkUserToken } from "./get-clerk-user-token";
import { insertEvent } from "@acme/crawl-functions";
import { events } from "@acme/crawl-schema";
import type { OmitDb } from "@stack/config/get-tenant-db";

export const memberInfoSenderHandler = createMessageHandler({
  queueId: 'ExtractQueue',
  kind: MessageKind.MemberInfo,
  metadataShape: metadataSchema.shape,
  contentShape: z.object({
    memberId: z.number(),
  }).shape,
  handler: async (message) => {
    const { sourceControl, userId } = message.metadata;
    const { memberId } = message.content;
    context.integrations.sourceControl = await initSourceControl(userId, sourceControl);
    await getMemberInfo({ memberId }, context);
    await extractMemberInfoEvent.publish({ memberId }, { ...message.metadata, timestamp: new Date().getTime(), version: 1, caller: "extract-member-info" });
  }
});

const { sender } = memberInfoSenderHandler;


const initSourceControl = async (userId: string, sourceControl: 'github' | 'gitlab') => {
  const accessToken = await getClerkUserToken(userId, `oauth_${sourceControl}`);
  if (sourceControl === 'github') return new GitHubSourceControl(accessToken);
  if (sourceControl === 'gitlab') return new GitlabSourceControl(accessToken);
  return null;
}

const context: OmitDb<Context<GetMemberInfoSourceControl, GetMemberInfoEntities>> = {
  entities: {
    members,
  },
  integrations: {
    sourceControl: null
  }
};

export const eventHandler = EventHandler(extractMembersEvent, async (ev) => {
  const { sourceControl, userId } = ev.metadata;
  const { memberIds } = ev.properties;
  await sender.sendAll(memberIds.map(memberId => ({ memberId })), {
    tenantId: ev.metadata.tenantId,
    crawlId: ev.metadata.crawlId,
    version: 1,
    caller: 'extract-member-info',
    sourceControl,
    userId,
    timestamp: new Date().getTime(),
    from: ev.metadata.from,
    to: ev.metadata.to,
  });

  await insertEvent({ crawlId: ev.metadata.crawlId, eventNamespace: 'memberInfo', eventDetail: 'crawlInfo', data: {calls: memberIds.length }}, {db, entities: { events }})

});
