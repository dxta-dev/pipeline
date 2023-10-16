import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import { Config } from "sst/node/config";
import { EventHandler } from "@stack/config/create-event";

import { extractMemberInfoEvent } from "@stack/extract/events";
import * as extract from "@acme/extract-schema";
import * as transform from "@acme/transform-schema";
import type { Context, SetForgeUsersExtractEntities, SetForgeUsersTransformEntities } from "@acme/transform-functions";

import { setForgeUsers } from "@acme/transform-functions";

const context: Context<SetForgeUsersExtractEntities, SetForgeUsersTransformEntities> = {
  extract: {
    db: drizzle(createClient({ url: Config.EXTRACT_DATABASE_URL, authToken: Config.EXTRACT_DATABASE_AUTH_TOKEN })),
    entities: {
      members: extract.members
    }
  },
  transform: {
    db: drizzle(createClient({ url: Config.TRANSFORM_DATABASE_URL, authToken: Config.TRANSFORM_DATABASE_AUTH_TOKEN })),
    entities: {
      forgeUsers: transform.forgeUsers
    }
  }
}

export const eventHandler = EventHandler(extractMemberInfoEvent, async (evt) => {
  await setForgeUsers({ extractMemberIds: [evt.properties.memberId] }, context);
});
