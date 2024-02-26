import { describe, expect, test } from '@jest/globals';
import { calculateTimeline } from './merge-request-metrics';
import type { MergeRequestNoteData, TimelineEventData, TimelineMapKey } from './merge-request-metrics';

const pr1 = {
  "openedAt": 10,
  "authorExternalId": 2,
  "timeline": [
    {
      "type": "committed",
      "timestamp": 20,
      "actorId": null,
      "data": {
        "committerEmail": "Efawl@dontemailme.com",
        "committerName": "Mr. Yvtla",
        "committedDate": 20,
        "committerId": 2
      }
    },
    {
      "type": "committed",
      "timestamp": 30,
      "actorId": null,
      "data": {
        "committerEmail": "Efawl@dontemailme.com",
        "committerName": "Mr. Urszj",
        "committedDate": 30,
        "committerId": 2
      }
    },
    {
      "type": "merged",
      "timestamp": 40,
      "actorId": 1
    },
    {
      "type": "closed",
      "timestamp": 50,
      "actorId": 1
    }
  ]
};

const pr1Expected = {
  startedCodingAt: new Date(10),
  startedPickupAt: new Date(20),
  startedReviewAt: null,
  mergedAt: new Date(40),
  reviewed: false,
  reviewDepth: 0,
  handover: 1
};


const pr5 = {
  "openedAt": 10,
  "authorExternalId": 2,
  "timeline": []
};

const pr5Expected = {
  startedCodingAt: null,
  startedPickupAt: null,
  startedReviewAt: null,
  mergedAt: null,
  reviewed: false,
  reviewDepth: 0,
  handover: 0
};


const pr83 = {
  "openedAt": 20,
  "authorExternalId": 1,
  "timeline": [
    {
      "type": "committed",
      "timestamp": 10,
      "actorId": null,
      "data": {
        "committerEmail": "Ourwp@dontemailme.com",
        "committerName": "Mr. Ytuvn",
        "committedDate": 10,
        "committerId": 1
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

const pr83Expected = {
  startedCodingAt: new Date(10),
  startedPickupAt: new Date(10),
  startedReviewAt: null,
  mergedAt: new Date(30),
  reviewed: false,
  reviewDepth: 0,
  handover: 0
};

const pr74 = {
  "openedAt": 20,
  "authorExternalId": 1,
  "timeline": [
    {
      "type": "committed",
      "timestamp": 10,
      "actorId": null,
      "data": {
        "committerEmail": "Ourwp@dontemailme.com",
        "committerName": "Mr. Lbniv",
        "committedDate": 10,
        "committerId": 1
      }
    },
    {
      "type": "reviewed",
      "timestamp": 30,
      "actorId": 4,
      "data": {
        "state": "approved"
      }
    },
    {
      "type": "merged",
      "timestamp": 40,
      "actorId": 1
    },
    {
      "type": "closed",
      "timestamp": 50,
      "actorId": 1
    },
    {
      "type": "reviewed",
      "timestamp": 60,
      "actorId": 5,
      "data": {
        "state": "approved"
      }
    }
  ]
};

const pr74Expected = {
  startedCodingAt: new Date(10),
  startedPickupAt: new Date(10),
  startedReviewAt: new Date(30),
  mergedAt: new Date(40),
  reviewed: true,
  reviewDepth: 1,
  handover: 2
};

const pr39 = {
  "openedAt": 50,
  "authorExternalId": 1,
  "timeline": [
    {
      "type": "reviewed",
      "timestamp": 10,
      "actorId": 3,
      "data": {
        "state": "pending"
      }
    },
    {
      "type": "committed",
      "timestamp": 20,
      "actorId": null,
      "data": {
        "committerEmail": "Ourwp@dontemailme.com",
        "committerName": "Mr. Saojq",
        "committedDate": 20,
        "committerId": 1
      }
    },
    {
      "type": "committed",
      "timestamp": 30,
      "actorId": null,
      "data": {
        "committerEmail": "Ourwp@dontemailme.com",
        "committerName": "Mr. Thnud",
        "committedDate": 30,
        "committerId": 1
      }
    },
    {
      "type": "committed",
      "timestamp": 40,
      "actorId": null,
      "data": {
        "committerEmail": "Ourwp@dontemailme.com",
        "committerName": "Mr. Fkwzc",
        "committedDate": 40,
        "committerId": 1
      }
    },
    {
      "type": "convert_to_draft",
      "timestamp": 60,
      "actorId": 1
    },
    {
      "type": "committed",
      "timestamp": 70,
      "actorId": null,
      "data": {
        "committerEmail": "Efawl@dontemailme.com",
        "committerName": "Mr. Iohai",
        "committedDate": 70,
        "committerId": 2 // HANDOVER 1
      }
    },
    {
      "type": "committed",
      "timestamp": 80,
      "actorId": null,
      "data": {
        "committerEmail": "Ourwp@dontemailme.com",
        "committerName": "Mr. Xkehk",
        "committedDate": 80,
        "committerId": 1  // HANDOVER 2
      }
    },
    {
      "type": "committed",
      "timestamp": 90,
      "actorId": null,
      "data": {
        "committerEmail": "Ourwp@dontemailme.com",
        "committerName": "Mr. Ejfpb",
        "committedDate": 90,
        "committerId": 1
      }
    },
    {
      "type": "committed",
      "timestamp": 100,
      "actorId": null,
      "data": {
        "committerEmail": "Ourwp@dontemailme.com",
        "committerName": "Mr. Knzjq",
        "committedDate": 100,
        "committerId": 1
      }
    },
    {
      "type": "committed",
      "timestamp": 110,
      "actorId": null,
      "data": {
        "committerEmail": "Ourwp@dontemailme.com",
        "committerName": "Mr. Ctdzc",
        "committedDate": 110,
        "committerId": 1
      }
    },
    {
      "type": "committed",
      "timestamp": 120,
      "actorId": null,
      "data": {
        "committerEmail": "Ourwp@dontemailme.com",
        "committerName": "Mr. Fddhr",
        "committedDate": 120,
        "committerId": 1
      }
    },
    {
      "type": "committed",
      "timestamp": 130,
      "actorId": null,
      "data": {
        "committerEmail": "Ourwp@dontemailme.com",
        "committerName": "Mr. Zgkdw",
        "committedDate": 130,
        "committerId": 1
      }
    },
    {
      "type": "committed",
      "timestamp": 140,
      "actorId": null,
      "data": {
        "committerEmail": "Ourwp@dontemailme.com",
        "committerName": "Mr. Kdjwl",
        "committedDate": 140,
        "committerId": 1
      }
    },
    {
      "type": "committed",
      "timestamp": 150,
      "actorId": null,
      "data": {
        "committerEmail": "Ourwp@dontemailme.com",
        "committerName": "Mr. Wdsqs",
        "committedDate": 150,
        "committerId": 1
      }
    },
    {
      "type": "committed",
      "timestamp": 160,
      "actorId": null,
      "data": {
        "committerEmail": "Efawl@dontemailme.com",
        "committerName": "Mr. Nyjkq",
        "committedDate": 160,
        "committerId": 2  // HANDOVER 3
      }
    },
    {
      "type": "ready_for_review",
      "timestamp": 170,
      "actorId": 1  
    },
    {
      "type": "merged",
      "timestamp": 180,
      "actorId": 1 // HANDOVER 4
    },
    {
      "type": "closed",
      "timestamp": 190,
      "actorId": 1
    }
  ]
};

const pr39Expected = {
  startedCodingAt: new Date(20),
  startedPickupAt: new Date(170),
  startedReviewAt: null,
  mergedAt: new Date(180),
  reviewed: false,
  reviewDepth: 0,
  handover: 4
};

const pr143 = {
  "openedAt": 20,
  "authorExternalId": 1,
  "timeline": [
    {
      "type": "committed",
      "timestamp": 10,
      "actorId": null,
      "data": {
        "committerEmail": "Waysu@dontemailme.com",
        "committerName": "Mr. Fnnsb",
        "committedDate": 10,
        "committerId": 1
      }
    },
    {
      "type": "convert_to_draft",
      "timestamp": 30,
      "actorId": 1
    },
    {
      "type": "committed",
      "timestamp": 40,
      "actorId": null,
      "data": {
        "committerEmail": "Waysu@dontemailme.com",
        "committerName": "Mr. Vfqhw",
        "committedDate": 40,
        "committerId": 1
      }
    },
    {
      "type": "committed",
      "timestamp": 50,
      "actorId": null,
      "data": {
        "committerEmail": "Waysu@dontemailme.com",
        "committerName": "Mr. Eyptw",
        "committedDate": 50,
        "committerId": 1
      }
    },
    {
      "type": "committed",
      "timestamp": 60,
      "actorId": null,
      "data": {
        "committerEmail": "Waysu@dontemailme.com",
        "committerName": "Mr. Esecf",
        "committedDate": 60,
        "committerId": 1
      }
    },
    {
      "type": "committed",
      "timestamp": 70,
      "actorId": null,
      "data": {
        "committerEmail": "Waysu@dontemailme.com",
        "committerName": "Mr. Fjbuw",
        "committedDate": 70,
        "committerId": 1
      }
    },
    {
      "type": "committed",
      "timestamp": 80,
      "actorId": null,
      "data": {
        "committerEmail": "Waysu@dontemailme.com",
        "committerName": "Mr. Cpfub",
        "committedDate": 80,
        "committerId": 1
      }
    },
    {
      "type": "committed",
      "timestamp": 90,
      "actorId": null,
      "data": {
        "committerEmail": "Waysu@dontemailme.com",
        "committerName": "Mr. Nobrh",
        "committedDate": 90,
        "committerId": 1
      }
    },
    {
      "type": "committed",
      "timestamp": 100,
      "actorId": null,
      "data": {
        "committerEmail": "Waysu@dontemailme.com",
        "committerName": "Mr. Niizk",
        "committedDate": 100,
        "committerId": 1
      }
    },
    {
      "type": "committed",
      "timestamp": 110,
      "actorId": null,
      "data": {
        "committerEmail": "Waysu@dontemailme.com",
        "committerName": "Mr. Njdhy",
        "committedDate": 110,
        "committerId": 1
      }
    },
    {
      "type": "committed",
      "timestamp": 120,
      "actorId": null,
      "data": {
        "committerEmail": "Waysu@dontemailme.com",
        "committerName": "Mr. Clofn",
        "committedDate": 120,
        "committerId": 1
      }
    },
    {
      "type": "committed",
      "timestamp": 130,
      "actorId": null,
      "data": {
        "committerEmail": "Waysu@dontemailme.com",
        "committerName": "Mr. Vzhbd",
        "committedDate": 130,
        "committerId": 1
      }
    },
    {
      "type": "committed",
      "timestamp": 140,
      "actorId": null,
      "data": {
        "committerEmail": "Waysu@dontemailme.com",
        "committerName": "Mr. Owtyr",
        "committedDate": 140,
        "committerId": 1
      }
    },
    {
      "type": "commented",
      "timestamp": 150,
      "actorId": 1
    },
    {
      "type": "commented",
      "timestamp": 160,
      "actorId": 6
    },
    {
      "type": "ready_for_review",
      "timestamp": 170,
      "actorId": 1
    },
    {
      "type": "reviewed",
      "timestamp": 180,
      "actorId": 1,
      "data": {
        "state": "commented"
      }
    },
    {
      "createdAt": 190,
      "authorExternalId": 1,
      "type": "note",
      "timestamp": 190
    },
    {
      "type": "committed",
      "timestamp": 200,
      "actorId": null,
      "data": {
        "committerEmail": "Waysu@dontemailme.com",
        "committerName": "Mr. Yfohu",
        "committedDate": 200,
        "committerId": 1
      }
    },
    {
      "type": "reviewed",
      "timestamp": 210,
      "actorId": 4,
      "data": {
        "state": "commented"
      }
    },
    {
      "createdAt": 220,
      "authorExternalId": 4,
      "type": "note",
      "timestamp": 220
    },
    {
      "type": "committed",
      "timestamp": 230,
      "actorId": null,
      "data": {
        "committerEmail": "Waysu@dontemailme.com",
        "committerName": "Mr. Gcbgy",
        "committedDate": 230,
        "committerId": 1
      }
    },
    {
      "type": "commented",
      "timestamp": 240,
      "actorId": 1
    },
    {
      "type": "commented",
      "timestamp": 250,
      "actorId": 6
    },
    {
      "type": "reviewed",
      "timestamp": 260,
      "actorId": 5,
      "data": {
        "state": "approved"
      }
    },
    {
      "type": "reviewed",
      "timestamp": 270,
      "actorId": 4,
      "data": {
        "state": "approved"
      }
    },
    {
      "type": "merged",
      "timestamp": 280,
      "actorId": 4
    },
    {
      "type": "closed",
      "timestamp": 290,
      "actorId": 4
    },
  ]
};

const pr143Expected = {
  startedCodingAt: new Date(10),
  startedPickupAt: new Date(170),
  startedReviewAt: new Date(210),
  mergedAt: new Date(280),
  reviewed: true,
  reviewDepth: 4,
  handover: 7
};


const pr20 = {
  "openedAt": 10,
  "authorExternalId": 2,
  "timeline": [
    {
      "type": "commented",
      "timestamp": 20,
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
  reviewDepth: 0,
  handover: 0
};

const pr73 = {
  "openedAt": 20,
  "authorExternalId": 1,
  "timeline": [
    {
      "type": "committed",
      "timestamp": 10,
      "actorId": null,
      "data": {
        "committerEmail": "Waysu@dontemailme.com",
        "committerName": "Mr. Hvbnl",
        "committedDate": 10,
        "committerId": 1
      }
    },
    {
      "type": "convert_to_draft",
      "timestamp": 30,
      "actorId": 1
    },
    // {
    //   "type": "committed",
    //   "timestamp": 40,
    //   "actorId": null,
    //   "data": {
    //     "committerEmail": "Cgxfb@dontemailme.com",
    //     "committerName": "Mr. Igyqp",
    //     "committedDate": 40
    //     // BOT
    //   }
    // },
    {
      "type": "committed",
      "timestamp": 50,
      "actorId": null,
      "data": {
        "committerEmail": "Waysu@dontemailme.com",
        "committerName": "Mr. Mdzdx",
        "committedDate": 50,
        "committerId": 1
      }
    },
    {
      "type": "ready_for_review",
      "timestamp": 60,
      "actorId": 1
    },
    {
      "type": "reviewed",
      "timestamp": 70,
      "actorId": 3,
      "data": {
        "state": "approved"
      }
    },
    {
      "type": "committed",
      "timestamp": 80,
      "actorId": null,
      "data": {
        "committerEmail": "Waysu@dontemailme.com",
        "committerName": "Mr. Kxooc",
        "committedDate": 80,
        "committerId": 1
      }
    },
    {
      "type": "committed",
      "timestamp": 90,
      "actorId": null,
      "data": {
        "committerEmail": "Waysu@dontemailme.com",
        "committerName": "Mr. Wvrsq",
        "committedDate": 90,
        "committerId": 1
      }
    },
    {
      "type": "reviewed",
      "timestamp": 100,
      "actorId": 5,
      "data": {
        "state": "approved"
      }
    },
    {
      "type": "merged",
      "timestamp": 110,
      "actorId": 1
    },
    {
      "type": "closed",
      "timestamp": 120,
      "actorId": 1
    }
  ]
};

const pr73Expected = {
  startedCodingAt: new Date(10),
  startedPickupAt: new Date(60),
  startedReviewAt: new Date(70),
  mergedAt: new Date(110),
  reviewed: true,
  reviewDepth: 2,
  handover: 4
};

const pr99 = {
  "openedAt": 20,
  "authorExternalId": 3,
  "timeline": [
    {
      "type": "committed",
      "timestamp": 10,
      "actorId": null,
      "data": {
        "committerEmail": "Vilcw@dontemailme.com",
        "committerName": "Mr. Pzgil",
        "committedDate": 10,
        "committerId": 3
      }
    },
    {
      "type": "review_requested",
      "timestamp": 30,
      "actorId": 3,
      "data": {
        "requestedReviewerId": 4,
        "requestedReviewerName": "Mr. Xxucl"
      }
    },
    {
      "type": "review_requested",
      "timestamp": 40,
      "actorId": 3,
      "data": {
        "requestedReviewerId": 5,
        "requestedReviewerName": "Mr. Iciqz"
      }
    },
    {
      "type": "committed",
      "timestamp": 50,
      "actorId": null,
      "data": {
        "committerEmail": "Cgxfb@dontemailme.com",
        "committerName": "Mr. Mtadz",
        "committedDate": 50,
        // BOT
      }
    },
    {
      "type": "reviewed",
      "timestamp": 60,
      "actorId": 4,
      "data": {
        "state": "approved"
      }
    },
    {
      "type": "merged",
      "timestamp": 70,
      "actorId": 1
    },
    {
      "type": "closed",
      "timestamp": 80,
      "actorId": 1
    }
  ]
};

const pr99Expected = {
  startedCodingAt: new Date(10),
  startedPickupAt: new Date(50),
  startedReviewAt: new Date(60),
  mergedAt: new Date(70),
  reviewed: true,
  reviewDepth: 1,
  handover: 2
};

const pr100 = {
  "openedAt": 20,
  "authorExternalId": 1,
  "timeline": [
    {
      "type": "committed",
      "timestamp": 10,
      "actorId": null,
      "data": {
        "committerEmail": "Waysu@dontemailme.com",
        "committerName": "Mr. Kritz",
        "committedDate": 10,
        "committerId": 1
      }
    },
    {
      "type": "committed",
      "timestamp": 30,
      "actorId": null,
      "data": {
        "committerEmail": "Waysu@dontemailme.com",
        "committerName": "Mr. Wecrz",
        "committedDate": 30,
        "committerId": 1
      }
    },
    {
      "type": "committed",
      "timestamp": 40,
      "actorId": null,
      "data": {
        "committerEmail": "Cgxfb@dontemailme.com",
        "committerName": "Mr. Dyrqe",
        "committedDate": 40
        // BOT
      }
    },
    {
      "type": "committed",
      "timestamp": 50,
      "actorId": null,
      "data": {
        "committerEmail": "Cgxfb@dontemailme.com",
        "committerName": "Mr. Swkjp",
        "committedDate": 50
        // BOT
      }
    },
    {
      "type": "reviewed",
      "timestamp": 60,
      "actorId": 3,
      "data": {
        "state": "approved"
      }
    },
    {
      "type": "commented",
      "timestamp": 70,
      "actorId": 1
    },
    {
      "type": "committed",
      "timestamp": 80,
      "actorId": null,
      "data": {
        "committerEmail": "Cgxfb@dontemailme.com",
        "committerName": "Mr. Nzyxs",
        "committedDate": 80
        // BOT
      }
    },
    {
      "type": "merged",
      "timestamp": 90,
      "actorId": 1
    },
    {
      "type": "closed",
      "timestamp": 100,
      "actorId": 1
    }
  ]
};
  
const pr100Expected = {
  startedCodingAt: new Date(10),
  startedPickupAt: new Date(50),
  startedReviewAt: new Date(60),
  mergedAt: new Date(90),
  reviewed: true,
  reviewDepth: 1,
  handover: 2
};

const pr101 = {
  "openedAt": 20,
  "authorExternalId": 3,
  "timeline": [
    {
      "type": "committed",
      "timestamp": 10,
      "actorId": null,
      "data": {
        "committerEmail": "Vilcw@dontemailme.com",
        "committerName": "Mr. Ivvzc",
        "committedDate": 10,
        "committerId": 3
      }
    },
    {
      "type": "review_requested",
      "timestamp": 30,
      "actorId": 3,
      "data": {
        "requestedReviewerId": 4,
        "requestedReviewerName": "Mr. Dorte"
      }
    },
    {
      "type": "reviewed",
      "timestamp": 40,
      "actorId": 4,
      "data": {
        "state": "approved"
      }
    },
    {
      "type": "merged",
      "timestamp": 50,
      "actorId": 4
    },
    {
      "type": "closed",
      "timestamp": 60,
      "actorId": 4
    }
  ]
};

const pr101Expected = {
  startedCodingAt: new Date(10),
  startedPickupAt: new Date(30),
  startedReviewAt: new Date(40),
  mergedAt: new Date(50),
  reviewed: true,
  reviewDepth: 1,
  handover: 1
};


const pr312 = {
  "openedAt": 20,
  "authorExternalId": 3,
  "timeline": [
    {
      "type": "committed",
      "timestamp": 10,
      "actorId": null,
      "data": {
        "committerEmail": "Vilcw@dontemailme.com",
        "committerName": "Mr. Yabja",
        "committedDate": 10,
        "committerId": 3
      }
    },
    {
      "type": "reviewed",
      "timestamp": 30,
      "actorId": 4,
      "data": {
        "state": "approved"
      }
    },
    {
      "type": "reviewed",
      "timestamp": 40,
      "actorId": 5,
      "data": {
        "state": "approved"
      }
    },
    {
      "type": "committed",
      "timestamp": 50,
      "actorId": null,
      "data": {
        "committerEmail": "Cgxfb@dontemailme.com",
        "committerName": "Mr. Tcbkb",
        "committedDate": 50
        // BOT
      }
    },
    {
      "type": "merged",
      "timestamp": 60,
      "actorId": 3
    },
    {
      "type": "closed",
      "timestamp": 70,
      "actorId": 3
    }
  ]
};

const pr312Expected = {
  startedCodingAt: new Date(10),
  startedPickupAt: new Date(10),
  startedReviewAt: new Date(30),
  mergedAt: new Date(60),
  reviewed: true,
  reviewDepth: 2,
  handover: 3
};


const pr93 = {
  "openedAt": 90,
  "authorExternalId": 3,
  "timeline": [
    {
      "type": "committed",
      "timestamp": 10,
      "actorId": null,
      "data": {
        "committerEmail": "Vilcw@dontemailme.com",
        "committerName": "Mr. Nqlkp",
        "committedDate": 10,
        "committerId": 3
      }
    },
    {
      "type": "committed",
      "timestamp": 20,
      "actorId": null,
      "data": {
        "committerEmail": "Vilcw@dontemailme.com",
        "committerName": "Mr. Piwwe",
        "committedDate": 20,
        "committerId": 3
      }
    },
    {
      "type": "committed",
      "timestamp": 30,
      "actorId": null,
      "data": {
        "committerEmail": "Vilcw@dontemailme.com",
        "committerName": "Mr. Jrdlj",
        "committedDate": 30,
        "committerId": 3
      }
    },
    {
      "type": "committed",
      "timestamp": 40,
      "actorId": null,
      "data": {
        "committerEmail": "Vilcw@dontemailme.com",
        "committerName": "Mr. Xmxer",
        "committedDate": 40,
        "committerId": 3
      }
    },
    {
      "type": "committed",
      "timestamp": 50,
      "actorId": null,
      "data": {
        "committerEmail": "Vilcw@dontemailme.com",
        "committerName": "Mr. Nqqhk",
        "committedDate": 50,
        "committerId": 3
      }
    },
    {
      "type": "committed",
      "timestamp": 60,
      "actorId": null,
      "data": {
        "committerEmail": "Vilcw@dontemailme.com",
        "committerName": "Mr. Megkj",
        "committedDate": 60,
        "committerId": 3
      }
    },
    {
      "type": "committed",
      "timestamp": 70,
      "actorId": null,
      "data": {
        "committerEmail": "Vilcw@dontemailme.com",
        "committerName": "Mr. Satzl",
        "committedDate": 70,
        "committerId": 3
      }
    },
    {
      "type": "committed",
      "timestamp": 80,
      "actorId": null,
      "data": {
        "committerEmail": "Vilcw@dontemailme.com",
        "committerName": "Mr. Mpaak",
        "committedDate": 80,
        "committerId": 3
      }
    },
    {
      "type": "review_requested",
      "timestamp": 100,
      "actorId": 3,
      "data": {
        "requestedReviewerId": 4,
        "requestedReviewerName": "Mr. Hnkfn"
      }
    },
    {
      "type": "review_requested",
      "timestamp": 110,
      "actorId": 3,
      "data": {
        "requestedReviewerId": 1,
        "requestedReviewerName": "Mr. Kaius"
      }
    },
    {
      "type": "committed",
      "timestamp": 120,
      "actorId": null,
      "data": {
        "committerEmail": "Cgxfb@dontemailme.com",
        "committerName": "Mr. Laxfc",
        "committedDate": 120
        // BOT
      }
    },
    {
      "type": "merged",
      "timestamp": 130,
      "actorId": 1
    },
    {
      "type": "closed",
      "timestamp": 140,
      "actorId": 1
    }
  ]
};

const pr93Expected = {
  startedCodingAt: new Date(10),
  startedPickupAt: new Date(120),
  startedReviewAt: null,
  mergedAt: new Date(130),
  reviewed: false,
  reviewDepth: 0,
  handover: 1
};


const pr173 = {
  "openedAt": 10,
  "authorExternalId": 2,
  "timeline": [
    {
      "type": "committed",
      "timestamp": 20,
      "actorId": null,
      "data": {
        "committerEmail": "Cgxfb@dontemailme.com",
        "committerName": "Mr. Mderm",
        "committedDate": 20
        // BOT
      }
    },
    {
      "type": "committed",
      "timestamp": 30,
      "actorId": null,
      "data": {
        "committerEmail": "Cgxfb@dontemailme.com",
        "committerName": "Mr. Rguub",
        "committedDate": 30
        // BOT
      }
    },
    {
      "type": "merged",
      "timestamp": 40,
      "actorId": 1
    },
    {
      "type": "closed",
      "timestamp": 50,
      "actorId": 1
    }
  ]
};

const pr173Expected = {
  startedCodingAt: new Date(10),
  startedPickupAt: new Date(30),
  startedReviewAt: null,
  mergedAt: new Date(40),
  reviewed: false,
  reviewDepth: 0,
  handover: 1
};

const pr41 = {
  "openedAt": 10,
  "authorExternalId": 3,
  "timeline": [
    {
      "type": "review_requested",
      "timestamp": 20,
      "actorId": 3,
      "data": {
        "requestedReviewerId": 1,
        "requestedReviewerName": "Mr. Tyrhc"
      }
    },
    {
      "type": "closed",
      "timestamp": 30,
      "actorId": 3
    },
    {
      "type": "committed",
      "timestamp": 40,
      "actorId": null,
      "data": {
        "committerEmail": "Vilcw@dontemailme.com",
        "committerName": "Mr. Uhppq",
        "committedDate": 40,
        "committerId": 3
      }
    },
    {
      "type": "merged",
      "timestamp": 50,
      "actorId": 1
    },
    {
      "type": "closed",
      "timestamp": 60,
      "actorId": 1
    }
  ]
};

const pr41Expected = {
  startedCodingAt: new Date(10),
  startedPickupAt: new Date(40),
  startedReviewAt: null,
  mergedAt: new Date(50),
  reviewed: false,
  reviewDepth: 0,
  handover: 0
};


const pr193 = {
  "openedAt": 10,
  "authorExternalId": 3,
  "timeline": [
    {
      "type": "review_requested",
      "timestamp": 20,
      "actorId": 3,
      "data": {
        "requestedReviewerId": 1,
        "requestedReviewerName": "Mr. Vtbdl"
      }
    },
    {
      "type": "committed",
      "timestamp": 30,
      "actorId": null,
      "data": {
        "committerEmail": "Vilcw@dontemailme.com",
        "committerName": "Mr. Vbola",
        "committedDate": 30,
        "committerId": 3
      }
    },
    {
      "type": "reviewed",
      "timestamp": 40,
      "actorId": 1,
      "data": {
        "state": "approved"
      }
    },
    {
      "type": "committed",
      "timestamp": 50,
      "actorId": null,
      "data": {
        "committerEmail": "Cgxfb@dontemailme.com",
        "committerName": "Mr. Vdfeg",
        "committedDate": 50
        // BOT
      }
    },
    {
      "type": "merged",
      "timestamp": 60,
      "actorId": 1
    },
    {
      "type": "closed",
      "timestamp": 70,
      "actorId": 1
    }
  ]
};

const pr193Expected = {
  startedCodingAt: new Date(10),
  startedPickupAt: new Date(10),
  startedReviewAt: new Date(30),
  mergedAt: new Date(60),
  reviewed: true,
  reviewDepth: 1,
  handover: 1
};

const pr270 = {
  "openedAt": 20,
  "authorExternalId": 1,
  "timeline": [
    {
      "type": "committed",
      "timestamp": 10,
      "actorId": null,
      "data": {
        "committerEmail": "Nxpdj@dontemailme.com",
        "committerName": "Mr. Jcnjc",
        "committedDate": 10,
        "committerId": 5
      }
    },
    {
      "type": "committed",
      "timestamp": 30,
      "actorId": null,
      "data": {
        "committerEmail": "Nxpdj@dontemailme.com",
        "committerName": "Mr. Bgjxu",
        "committedDate": 30,
        "committerId": 5
      }
    },
    {
      "type": "committed",
      "timestamp": 40,
      "actorId": null,
      "data": {
        "committerEmail": "Nxpdj@dontemailme.com",
        "committerName": "Mr. Ewfls",
        "committedDate": 40,
        "committerId": 5
      }
    },
    {
      "type": "merged",
      "timestamp": 50,
      "actorId": 1
    },
    {
      "type": "closed",
      "timestamp": 60,
      "actorId": 1
    },
    {
      "type": "reviewed",
      "timestamp": 70,
      "actorId": 4,
      "data": {
        "state": "approved"
      }
    },
    {
      "type": "commented",
      "timestamp": 80,
      "actorId": 3
    }
  ]
};

const pr270Expected = {
  startedCodingAt: new Date(10),
  startedPickupAt: new Date(40),
  startedReviewAt: null,
  mergedAt: new Date(50),
  reviewed: false,
  reviewDepth: 0,
  handover: 3
};

const fixtures = [
  ['pr1', { pr: pr1, expected: pr1Expected }],
  ['pr5', { pr: pr5, expected: pr5Expected }],
  ['pr20', { pr: pr20, expected: pr20Expected }],
  ['pr39', { pr: pr39, expected: pr39Expected }],
  ['pr41', { pr: pr41, expected: pr41Expected }],
  ['pr73', { pr: pr73, expected: pr73Expected }],
  ['pr74', { pr: pr74, expected: pr74Expected }],
  // ['pr83', { pr: pr83, expected: pr83Expected }],
  // ['pr93', { pr: pr93, expected: pr93Expected }],
  // ['pr99', { pr: pr99, expected: pr99Expected }],
  // ['pr100', { pr: pr100, expected: pr100Expected }],
  // ['pr101', { pr: pr101, expected: pr101Expected }],
  // ['pr143', { pr: pr143, expected: pr143Expected }],
  // ['pr173', { pr: pr173, expected: pr173Expected }],
  // ['pr193', { pr: pr193, expected: pr193Expected }],
  // ['pr270', { pr: pr270, expected: pr270Expected }],
  // ['pr312', { pr: pr312, expected: pr312Expected }], 
] as [string, { pr: typeof pr1 | typeof pr5 | typeof pr143, expected: typeof pr1Expected | typeof pr5Expected | typeof pr143Expected }][]


describe("timelines", () => {
  describe.each(fixtures)("%s", (_name, { pr, expected }) => {

    const authorExternalId = pr.authorExternalId;
    
    
    const map = new Map();
    
    for (const ev of pr.timeline) {
      map.set({ type: ev.type, timestamp: new Date(ev.timestamp) }, ev);
    }

    const keys = [...map.keys()];

    const result = calculateTimeline(keys as unknown as TimelineMapKey[], map as Map<TimelineMapKey, MergeRequestNoteData | TimelineEventData>, { authorExternalId, createdAt: new Date(pr.openedAt) });

    const { startedCodingAt, mergedAt, reviewed, reviewDepth, handover } = result;

    const getTime = (date: Date | null) => date?.getTime() || null;

    test('startedCodingAt', () => {
      expect(getTime(startedCodingAt)).toEqual(getTime(expected.startedCodingAt ));
    });

    test('mergedAt', () => {
      expect(getTime(mergedAt)).toEqual(getTime(expected.mergedAt));
    });

    test('reviewed', () => {
      expect(reviewed).toEqual(expected.reviewed);
    });


    test('reviewDepth', () => {
      expect(reviewDepth).toEqual(expected.reviewDepth);
    });

    test('handover', () => {
      expect(handover).toEqual(expected.handover);
    })
  });
});
