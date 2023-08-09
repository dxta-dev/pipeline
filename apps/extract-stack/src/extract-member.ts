import { EventHandler } from "sst/node/event-bus";
import { defineEvent, extractRepositoryEvent } from "./events";

// const repositoryEvent = defineEvent(extractRepositoryEvent);

// export const busHandler = EventHandler(repositoryEvent, async (evt) => {
//   console.log(evt);
// })

export const busHandler = (ev)=> {
  console.log(ev);
}