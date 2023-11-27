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
  mergedAt: new Date(30),
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
  mergedAt: null,
  reviewed: false,
  reviewDepth: 0
};


const pr83 = {
  "authorExternalId": 1,
  "timeline": [
    {
      "type": "committed",
      "timestamp": 10,
      "actorId": null,
      "data": {
        "committerEmail": "Rzgen@dontemailme.com",
        "committerName": "Mr. Jyetw",
        "committedDate": 10
      }
    },
    {
      "type": "merged",
      "timestamp": 20,
      "actorId": 1
    },
    {
      "type": "closed",
      "timestamp": 30,
      "actorId": 1
    }
  ]
};

const pr83Expected = {
  startedCodingAt: new Date(10),
  startedPickupAt: new Date(10),
  startedReviewAt: null,
  mergedAt: new Date(20),
  reviewed: false,
  reviewDepth: 0
};

const pr74 = {
  "authorExternalId": 1,
  "timeline": [
    {
      "type": "committed",
      "timestamp": 10,
      "actorId": null,
      "data": {
        "committerEmail": "Rzgen@dontemailme.com",
        "committerName": "Mr. Tqsas",
        "committedDate": 10
      }
    },
    {
      "type": "reviewed",
      "timestamp": 20,
      "actorId": 4,
      "data": {
        "state": "approved"
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
    },
    {
      "type": "reviewed",
      "timestamp": 50,
      "actorId": 3,
      "data": {
        "state": "approved"
      }
    }
  ]
};

const pr74Expected = {
  startedCodingAt: new Date(10),
  startedPickupAt: new Date(10),
  startedReviewAt: new Date(20),
  mergedAt: new Date(30),
  reviewed: true,
  reviewDepth: 1
};

const pr39 = {
  "authorExternalId": 1,
  "timeline": [
    {
      "type": "committed",
      "timestamp": 20,
      "actorId": null,
      "data": {
        "committerEmail": "Rzgen@dontemailme.com",
        "committerName": "Mr. Pqsiy",
        "committedDate": 20
      }
    },
    {
      "type": "committed",
      "timestamp": 30,
      "actorId": null,
      "data": {
        "committerEmail": "Rzgen@dontemailme.com",
        "committerName": "Mr. Txxub",
        "committedDate": 30
      }
    },
    {
      "type": "committed",
      "timestamp": 40,
      "actorId": null,
      "data": {
        "committerEmail": "Rzgen@dontemailme.com",
        "committerName": "Mr. Jrehm",
        "committedDate": 40
      }
    },
    {
      "type": "convert_to_draft",
      "timestamp": 50,
      "actorId": 1
    },
    {
      "type": "committed",
      "timestamp": 60,
      "actorId": null,
      "data": {
        "committerEmail": "Fehyq@dontemailme.com",
        "committerName": "Mr. Zimwu",
        "committedDate": 60
      }
    },
    {
      "type": "committed",
      "timestamp": 70,
      "actorId": null,
      "data": {
        "committerEmail": "Rzgen@dontemailme.com",
        "committerName": "Mr. Exgph",
        "committedDate": 70
      }
    },
    {
      "type": "committed",
      "timestamp": 80,
      "actorId": null,
      "data": {
        "committerEmail": "Rzgen@dontemailme.com",
        "committerName": "Mr. Zxqfu",
        "committedDate": 80
      }
    },
    {
      "type": "committed",
      "timestamp": 90,
      "actorId": null,
      "data": {
        "committerEmail": "Rzgen@dontemailme.com",
        "committerName": "Mr. Uinov",
        "committedDate": 90
      }
    },
    {
      "type": "committed",
      "timestamp": 100,
      "actorId": null,
      "data": {
        "committerEmail": "Rzgen@dontemailme.com",
        "committerName": "Mr. Tlygx",
        "committedDate": 100
      }
    },
    {
      "type": "committed",
      "timestamp": 110,
      "actorId": null,
      "data": {
        "committerEmail": "Rzgen@dontemailme.com",
        "committerName": "Mr. Kbofh",
        "committedDate": 110
      }
    },
    {
      "type": "committed",
      "timestamp": 120,
      "actorId": null,
      "data": {
        "committerEmail": "Rzgen@dontemailme.com",
        "committerName": "Mr. Gabrn",
        "committedDate": 120
      }
    },
    {
      "type": "reviewed",
      "timestamp": 10,
      "actorId": 139872861,
      "data": {
        "state": "pending"
      }
    },
    {
      "type": "committed",
      "timestamp": 130,
      "actorId": null,
      "data": {
        "committerEmail": "Rzgen@dontemailme.com",
        "committerName": "Mr. Cgfyi",
        "committedDate": 130
      }
    },
    {
      "type": "committed",
      "timestamp": 140,
      "actorId": null,
      "data": {
        "committerEmail": "Rzgen@dontemailme.com",
        "committerName": "Mr. Yfleg",
        "committedDate": 140
      }
    },
    {
      "type": "committed",
      "timestamp": 150,
      "actorId": null,
      "data": {
        "committerEmail": "Fehyq@dontemailme.com",
        "committerName": "Mr. Jqbqc",
        "committedDate": 150
      }
    },
    {
      "type": "ready_for_review",
      "timestamp": 160,
      "actorId": 1
    },
    {
      "type": "merged",
      "timestamp": 170,
      "actorId": 1
    },
    {
      "type": "closed",
      "timestamp": 180,
      "actorId": 1
    }
  ]
};

const pr39Expected = {
  startedCodingAt: new Date(20),
  startedPickupAt: new Date(160),
  startedReviewAt: null,
  mergedAt: new Date(170),
  reviewed: false,
  reviewDepth: 0
};

const pr143 = {
  "authorExternalId": 1,
  "timeline": [
    {
      "type": "committed",
      "timestamp": 10,
      "actorId": null,
      "data": {
        "committerEmail": "Rzgen@dontemailme.com",
        "committerName": "Mr. Gugot",
        "committedDate": 10
      }
    },
    {
      "type": "convert_to_draft",
      "timestamp": 20,
      "actorId": 1
    },
    {
      "type": "committed",
      "timestamp": 30,
      "actorId": null,
      "data": {
        "committerEmail": "Rzgen@dontemailme.com",
        "committerName": "Mr. Ugoev",
        "committedDate": 30
      }
    },
    {
      "type": "committed",
      "timestamp": 40,
      "actorId": null,
      "data": {
        "committerEmail": "Rzgen@dontemailme.com",
        "committerName": "Mr. Vzniz",
        "committedDate": 40
      }
    },
    {
      "type": "committed",
      "timestamp": 50,
      "actorId": null,
      "data": {
        "committerEmail": "Rzgen@dontemailme.com",
        "committerName": "Mr. Jgwlo",
        "committedDate": 50
      }
    },
    {
      "type": "committed",
      "timestamp": 60,
      "actorId": null,
      "data": {
        "committerEmail": "Rzgen@dontemailme.com",
        "committerName": "Mr. Savet",
        "committedDate": 60
      }
    },
    {
      "type": "committed",
      "timestamp": 70,
      "actorId": null,
      "data": {
        "committerEmail": "Rzgen@dontemailme.com",
        "committerName": "Mr. Vlpol",
        "committedDate": 70
      }
    },
    {
      "type": "committed",
      "timestamp": 80,
      "actorId": null,
      "data": {
        "committerEmail": "Rzgen@dontemailme.com",
        "committerName": "Mr. Lytya",
        "committedDate": 80
      }
    },
    {
      "type": "committed",
      "timestamp": 90,
      "actorId": null,
      "data": {
        "committerEmail": "Rzgen@dontemailme.com",
        "committerName": "Mr. Ilqqe",
        "committedDate": 90
      }
    },
    {
      "type": "committed",
      "timestamp": 100,
      "actorId": null,
      "data": {
        "committerEmail": "Rzgen@dontemailme.com",
        "committerName": "Mr. Cjoov",
        "committedDate": 100
      }
    },
    {
      "type": "committed",
      "timestamp": 110,
      "actorId": null,
      "data": {
        "committerEmail": "Rzgen@dontemailme.com",
        "committerName": "Mr. Byusa",
        "committedDate": 110
      }
    },
    {
      "type": "committed",
      "timestamp": 120,
      "actorId": null,
      "data": {
        "committerEmail": "Rzgen@dontemailme.com",
        "committerName": "Mr. Sufac",
        "committedDate": 120
      }
    },
    {
      "type": "committed",
      "timestamp": 130,
      "actorId": null,
      "data": {
        "committerEmail": "Rzgen@dontemailme.com",
        "committerName": "Mr. Jmsle",
        "committedDate": 130
      }
    },
    {
      "type": "commented",
      "timestamp": 140,
      "actorId": 1
    },
    {
      "type": "commented",
      "timestamp": 150,
      "actorId": 2
    },
    {
      "type": "ready_for_review",
      "timestamp": 160,
      "actorId": 1
    },
    {
      "type": "reviewed",
      "timestamp": 170,
      "actorId": 1,
      "data": {
        "state": "commented"
      }
    },
    {
      "type": "reviewed",
      "timestamp": 200,
      "actorId": 4,
      "data": {
        "state": "commented"
      }
    },
    {
      "type": "committed",
      "timestamp": 190,
      "actorId": null,
      "data": {
        "committerEmail": "Rzgen@dontemailme.com",
        "committerName": "Mr. Agatz",
        "committedDate": 190
      }
    },
    {
      "type": "committed",
      "timestamp": 220,
      "actorId": null,
      "data": {
        "committerEmail": "Rzgen@dontemailme.com",
        "committerName": "Mr. Ixokh",
        "committedDate": 220
      }
    },
    {
      "type": "commented",
      "timestamp": 230,
      "actorId": 1
    },
    {
      "type": "commented",
      "timestamp": 240,
      "actorId": 2,
    },
    {
      "type": "reviewed",
      "timestamp": 250,
      "actorId": 3,
      "data": {
        "state": "approved"
      }
    },
    {
      "type": "reviewed",
      "timestamp": 260,
      "actorId": 4,
      "data": {
        "state": "approved"
      }
    },
    {
      "type": "merged",
      "timestamp": 270,
      "actorId": 4
    },
    {
      "type": "closed",
      "timestamp": 280,
      "actorId": 4
    },
    {
      "createdAt": "2023-08-30T17:21:04.000Z",
      "authorExternalId": 1,
      "timestamp": 180
    },
    {
      "createdAt": "2023-08-31T08:11:15.000Z",
      "authorExternalId": 4,
      "timestamp": 210
    }
  ]
};

const pr143Expected = {
  startedCodingAt: new Date(10),
  startedPickupAt: new Date(160),
  startedReviewAt: new Date(170),
  mergedAt: new Date(270),
  reviewed: true,
  reviewDepth: 5,
};


const pr20 = {
  "authorExternalId": 2,
  "timeline": [
    {
      "type": "commented",
      "timestamp": 10,
      "actorId": 2
    }
  ]
};

const pr20Expected = {
  startedCodingAt: null,
  startedPickupAt: null,
  startedReviewAt: null,
  mergedAt: null,
  reviewed: false,
  reviewDepth: 0
};


const fixtures = [
  ['pr1', { pr: pr1, expected: pr1Expected }],
  ['pr5', { pr: pr5, expected: pr5Expected }],
  ['pr20', { pr: pr20, expected: pr20Expected }],
  ['pr39', { pr: pr39, expected: pr39Expected }],
  ['pr74', { pr: pr74, expected: pr74Expected }],
  ['pr83', { pr: pr83, expected: pr83Expected }],
  ['pr143', { pr: pr143, expected: pr143Expected }],
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

    expect(result).toBe(expected);
  });
});
