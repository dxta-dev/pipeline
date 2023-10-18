import type { EventDetailType, EventNamespaceType, CrawlInfo, CrawlFailed, CrawlComplete } from "@acme/crawl-schema";
import { CrawlInfoSchema, CrawlFailedSchema, CrawlCompleteSchema } from "@acme/crawl-schema";
import type { CrawlFunction, Entities } from "./config";


type Data = {
  eventDetail: 'crawlInfo';
  data: CrawlInfo;
} | {
  eventDetail: 'crawlFailed';
  data: CrawlFailed;
} | {
  eventDetail: 'crawlComplete';
  data: CrawlComplete;
};


export type InsertEventInput = {
  crawlId: number;
  eventNamespace: EventNamespaceType;
} & Data;

export type InsertEventOutput = {
  eventId: number;
};

export type InsertEventEntities = Pick<Entities, "events">;

export type InsertEventFunction = CrawlFunction<InsertEventInput, InsertEventOutput, InsertEventEntities>;

const validateData = (eventDetail: EventDetailType, data: CrawlInfo | CrawlComplete | CrawlFailed) => {
  switch (eventDetail) {
    case 'crawlInfo':
      return CrawlInfoSchema.parse(data);
    case 'crawlFailed':
      return CrawlFailedSchema.parse(data);
    case 'crawlComplete':
      return CrawlCompleteSchema.parse(data);
  }
}


export const insertEvent: InsertEventFunction = async (
  { crawlId, eventNamespace, eventDetail, data },
  { db, entities }
) => {

  const validatedData = validateData(eventDetail, data);

  const insertedEvents = await db.insert(entities.events)
    .values({ crawlId, namespace: eventNamespace, detail: eventDetail, data: validatedData })
    .onConflictDoNothing()
    .returning().get();

  return {
    eventId: insertedEvents.id,
  };
};
