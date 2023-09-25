import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { GitHubSourceControl, GitlabSourceControl } from "@acme/source-control";
import { Config } from "sst/node/config";
import type { Context, GetMemberInfoEntities, GetMemberInfoSourceControl } from "@acme/extract-functions";
import { members } from "@acme/extract-schema";
import { EventHandler } from "sst/node/event-bus";
import { extractMembersEvent } from "./events";
import { createMessageHandler } from "@stack/config/create-message";
import { MessageKind, metadataSchema } from "./messages";
import { z } from "zod";
import { getMemberInfo } from "@acme/extract-functions";
import { getClerkUserToken } from "./get-clerk-user-token";

export const memberInfoSenderHandler = createMessageHandler({
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
    // TODO: extractMemberInfoEvent.publish(/*...*/)
  }
});

const { sender } = memberInfoSenderHandler;


const client = createClient({ url: Config.DATABASE_URL, authToken: Config.DATABASE_AUTH_TOKEN });

const initSourceControl = async (userId: string, sourceControl: 'github' | 'gitlab') => {
  const accessToken = await getClerkUserToken(userId, `oauth_${sourceControl}`);
  if (sourceControl === 'github') return new GitHubSourceControl(accessToken);
  if (sourceControl === 'gitlab') return new GitlabSourceControl(accessToken);
  return null;
}

const db = drizzle(client);

const context: Context<GetMemberInfoSourceControl, GetMemberInfoEntities> = {
  db,
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
    version: 1,
    caller: 'extract-user-info',
    sourceControl,
    userId,
    timestamp: new Date().getTime(),
    from: ev.metadata.from,
    to: ev.metadata.to,
  });
});
