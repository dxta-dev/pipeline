import { describe, expect, test } from '@jest/globals';
import { calculateTimeline } from './merge-request-metrics';
import type { MergeRequestNoteData, TimelineEventData, TimelineMapKey } from './merge-request-metrics';

const pr1 = {
  "authorExternalId": 2,
  "timeline": [
    {
      "type": "committed",
      "timestamp": 10,
      "actorId": null,
      "data": {
        "committerEmail": "Trnmc@dontemailme.com",
        "committerName": "Mr. Uzybq",
        "committedDate": 10
      }
    },
    {
      "type": "committed",
      "timestamp": 20,
      "actorId": null,
      "data": {
        "committerEmail": "Trnmc@dontemailme.com",
        "committerName": "Mr. Duiph",
        "committedDate": 20
      }
    },
    {
      "type": "merged",
      "timestamp": 30,
      "actorId": 1
    },
    {
      "type": "closed",
      "timestamp": 40,
      "actorId": 1
    }
  ]
};

const pr1Expected = {
  startedCodingAt: new Date(10),
  startedPickupAt: new Date(20),
  startedReviewAt: null,
  reviewed: false,
  reviewDepth: 0
};


const pr5 = {
  "authorExternalId": 2,
  "timeline": []
};

const pr5Expected = {
  startedCodingAt: null,
  startedPickupAt: null,
  startedReviewAt: null,
  reviewed: false,
  reviewDepth: 0
};

const fixtures = [
  ['pr1', { pr: pr1, expected: pr1Expected }],
  ['pr5', { pr: pr5, expected: pr5Expected }],
] as [string, { pr: typeof pr1 | typeof pr5, expected: typeof pr1Expected | typeof pr5Expected }][]


describe("timelines", () => {
  test.each(fixtures)("timeline %p", (_name, { pr, expected }) => {

    const authorExternalId = pr.authorExternalId;

    const keys = pr1.timeline.map((pr) => ({ type: pr.type, timestamp: new Date(pr.timestamp) }));

    const map = new Map();

    for (const pr of pr1.timeline) {
      map.set({ type: pr.type, timestamp: new Date(pr.timestamp) }, pr);
    }

    const result = calculateTimeline(keys as unknown as TimelineMapKey[], map as Map<TimelineMapKey, MergeRequestNoteData | TimelineEventData>, { authorExternalId });
    console.log(result);

    expect(result).toBe(expected);
  });
});
