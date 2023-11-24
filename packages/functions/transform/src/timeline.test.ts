import { describe, expect, test } from '@jest/globals';
import { TimelineMapKey } from '../src/merge-request-metrics';

// https://github.com/crocoder-dev/mr-tool-monorepo/pull/83
const pr83 = {
  authorExternalId: 7620347,
  timeline: [
    {
      type: 'commited',
      timestamp: 10,
      actorId: null,
      data: "{\"committerEmail\":\"david@crocoder.dev\",\"committerName\":\"David Abram\",\"committedDate\":\"10\"}"
    },
    {
      type: "merged",
      timestamp: 20,
      actorId: 7620347,
      data: null
    },
    {
      type: "closed",
      timestamp: 30,
      actorId: 7620347,
      data: null
    }
  ]
};

const pr83Expected = {
};


  describe("timelines", () => {



});
