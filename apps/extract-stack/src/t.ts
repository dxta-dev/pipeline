import { EventHandler } from "sst/node/event-bus";
import { extractRepositoryEvent } from "./events";

export const handler = EventHandler(Todo.Events.Created, async (evt) => {
  console.log("Todo created", evt);
});
