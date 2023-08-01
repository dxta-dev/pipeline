import { eventBuilder, extractRepositoryEvent } from "./events";

const event = eventBuilder(`${extractRepositoryEvent.source}.${extractRepositoryEvent.detailType}`, extractRepositoryEvent.schema.shape);

export async function handler() {
  await event.publish({
    repository: "abc123"
  }, {
    caller: "extract-repository",
    version: 1,
    timestamp: Date.now(),
  });
}
