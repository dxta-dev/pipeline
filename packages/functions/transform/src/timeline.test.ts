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
      "type": "note",
      "createdAt": "2023-08-30T17:21:04.000Z",
      "authorExternalId": 1,
      "timestamp": 180
    },
    {
      "type": "note",
      "createdAt": "2023-08-31T08:11:15.000Z",
      "authorExternalId": 4,
      "timestamp": 210
    }
  ]
};

const pr143Expected = {
  startedCodingAt: new Date(10),
  startedPickupAt: new Date(160),
  startedReviewAt: new Date(200),
  mergedAt: new Date(270),
  reviewed: true,
  reviewDepth: 4,
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

const pr73 = {
  "authorExternalId": 1,
  "timeline": [
    {
      "type": "committed",
      "timestamp": 10,
      "actorId": null,
      "data": {
        "committerEmail": "Msmpt@dontemailme.com",
        "committerName": "Mr. Hhcvn",
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
        "committerEmail": "Lozxg@dontemailme.com",
        "committerName": "Mr. Ckktp",
        "committedDate": 30
      }
    },
    {
      "type": "committed",
      "timestamp": 40,
      "actorId": null,
      "data": {
        "committerEmail": "Msmpt@dontemailme.com",
        "committerName": "Mr. Wlpzl",
        "committedDate": 40
      }
    },
    {
      "type": "ready_for_review",
      "timestamp": 50,
      "actorId": 1
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
      "type": "committed",
      "timestamp": 70,
      "actorId": null,
      "data": {
        "committerEmail": "Msmpt@dontemailme.com",
        "committerName": "Mr. Rhwdv",
        "committedDate": 70
      }
    },
    {
      "type": "committed",
      "timestamp": 80,
      "actorId": null,
      "data": {
        "committerEmail": "Msmpt@dontemailme.com",
        "committerName": "Mr. Hibtu",
        "committedDate": 80
      }
    },
    {
      "type": "reviewed",
      "timestamp": 90,
      "actorId": 4,
      "data": {
        "state": "approved"
      }
    },
    {
      "type": "merged",
      "timestamp": 100,
      "actorId": 1
    },
    {
      "type": "closed",
      "timestamp": 110,
      "actorId": 1
    }
  ]
};

const pr73Expected = {
  startedCodingAt: new Date(10),
  startedPickupAt: new Date(50),
  startedReviewAt: new Date(60),
  mergedAt: new Date(100),
  reviewed: true,
  reviewDepth: 2
};

const pr99 = {
  "authorExternalId": 3,
  "timeline": [
    {
      "type": "committed",
      "timestamp": 10,
      "actorId": null,
      "data": {
        "committerEmail": "Bivxr@dontemailme.com",
        "committerName": "Mr. Rltpc",
        "committedDate": 10
      }
    },
    {
      "type": "review_requested",
      "timestamp": 20,
      "actorId": 3,
      "data": {
        "requestedReviewerId": 5,
        "requestedReviewerName": "Mr. Wldts"
      }
    },
    {
      "type": "review_requested",
      "timestamp": 30,
      "actorId": 3,
      "data": {
        "requestedReviewerId": 4,
        "requestedReviewerName": "Mr. Ghoie"
      }
    },
    {
      "type": "committed",
      "timestamp": 40,
      "actorId": null,
      "data": {
        "committerEmail": "Lozxg@dontemailme.com",
        "committerName": "Mr. Mzpby",
        "committedDate": 40
      }
    },
    {
      "type": "reviewed",
      "timestamp": 50,
      "actorId": 5,
      "data": {
        "state": "approved"
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

const pr99Expected = {
  startedCodingAt: new Date(10),
  startedPickupAt: new Date(40),
  startedReviewAt: new Date(50),
  mergedAt: new Date(60),
  reviewed: true,
  reviewDepth: 1
};

const pr100 = {
  "authorExternalId": 1,
  "timeline": [
    {
      "type": "committed",
      "timestamp": 10,
      "actorId": null,
      "data": {
        "committerEmail": "Msmpt@dontemailme.com",
        "committerName": "Mr. Cqevr",
        "committedDate": 10
      }
    },
    {
      "type": "committed",
      "timestamp": 20,
      "actorId": null,
      "data": {
        "committerEmail": "Msmpt@dontemailme.com",
        "committerName": "Mr. Pxhck",
        "committedDate": 20
      }
    },
    {
      "type": "committed",
      "timestamp": 30,
      "actorId": null,
      "data": {
        "committerEmail": "Lozxg@dontemailme.com",
        "committerName": "Mr. Hvbgh",
        "committedDate": 30
      }
    },
    {
      "type": "committed",
      "timestamp": 40,
      "actorId": null,
      "data": {
        "committerEmail": "Lozxg@dontemailme.com",
        "committerName": "Mr. Ypeeg",
        "committedDate": 40
      }
    },
    {
      "type": "reviewed",
      "timestamp": 50,
      "actorId": 3,
      "data": {
        "state": "approved"
      }
    },
    {
      "type": "commented",
      "timestamp": 60,
      "actorId": 1
    },
    {
      "type": "committed",
      "timestamp": 70,
      "actorId": null,
      "data": {
        "committerEmail": "Lozxg@dontemailme.com",
        "committerName": "Mr. Gowhm",
        "committedDate": 70
      }
    },
    {
      "type": "merged",
      "timestamp": 80,
      "actorId": 1
    },
    {
      "type": "closed",
      "timestamp": 90,
      "actorId": 1
    }
  ]
};
  
const pr100Expected = {
  startedCodingAt: new Date(10),
  startedPickupAt: new Date(40),
  startedReviewAt: new Date(50),
  mergedAt: new Date(80),
  reviewed: true,
  reviewDepth: 1
};

const pr101 = {
  "authorExternalId": 3,
  "timeline": [
    {
      "type": "committed",
      "timestamp": 10,
      "actorId": null,
      "data": {
        "committerEmail": "Bivxr@dontemailme.com",
        "committerName": "Mr. Siynx",
        "committedDate": 10
      }
    },
    {
      "type": "review_requested",
      "timestamp": 20,
      "actorId": 3,
      "data": {
        "requestedReviewerId": 5,
        "requestedReviewerName": "Mr. Okmbb"
      }
    },
    {
      "type": "reviewed",
      "timestamp": 30,
      "actorId": 5,
      "data": {
        "state": "approved"
      }
    },
    {
      "type": "merged",
      "timestamp": 40,
      "actorId": 5
    },
    {
      "type": "closed",
      "timestamp": 50,
      "actorId": 5
    }
  ]
};

const pr101Expected = {
  startedCodingAt: new Date(10),
  startedPickupAt: new Date(20),
  startedReviewAt: new Date(30),
  mergedAt: new Date(40),
  reviewed: true,
  reviewDepth: 1
};


const pr312 = {
  "authorExternalId": 3,
  "timeline": [
    {
      "type": "committed",
      "timestamp": 10,
      "actorId": null,
      "data": {
        "committerEmail": "Bivxr@dontemailme.com",
        "committerName": "Mr. Imvlz",
        "committedDate": 10
      }
    },
    {
      "type": "reviewed",
      "timestamp": 20,
      "actorId": 5,
      "data": {
        "state": "approved"
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
      "type": "committed",
      "timestamp": 40,
      "actorId": null,
      "data": {
        "committerEmail": "Lozxg@dontemailme.com",
        "committerName": "Mr. Cosgs",
        "committedDate": 40
      }
    },
    {
      "type": "merged",
      "timestamp": 50,
      "actorId": 3
    },
    {
      "type": "closed",
      "timestamp": 60,
      "actorId": 3
    }
  ]
};

const pr312Expected = {
  startedCodingAt: new Date(10),
  startedPickupAt: new Date(10),
  startedReviewAt: new Date(20),
  mergedAt: new Date(50),
  reviewed: true,
  reviewDepth: 2
};


const pr93 = {
  "authorExternalId": 3,
  "timeline": [
    {
      "type": "committed",
      "timestamp": 10,
      "actorId": null,
      "data": {
        "committerEmail": "Bivxr@dontemailme.com",
        "committerName": "Mr. Evtdq",
        "committedDate": 10
      }
    },
    {
      "type": "committed",
      "timestamp": 20,
      "actorId": null,
      "data": {
        "committerEmail": "Bivxr@dontemailme.com",
        "committerName": "Mr. Sqmvt",
        "committedDate": 20
      }
    },
    {
      "type": "committed",
      "timestamp": 30,
      "actorId": null,
      "data": {
        "committerEmail": "Bivxr@dontemailme.com",
        "committerName": "Mr. Cvzwu",
        "committedDate": 30
      }
    },
    {
      "type": "committed",
      "timestamp": 40,
      "actorId": null,
      "data": {
        "committerEmail": "Bivxr@dontemailme.com",
        "committerName": "Mr. Yxgml",
        "committedDate": 40
      }
    },
    {
      "type": "committed",
      "timestamp": 50,
      "actorId": null,
      "data": {
        "committerEmail": "Bivxr@dontemailme.com",
        "committerName": "Mr. Qubjs",
        "committedDate": 50
      }
    },
    {
      "type": "committed",
      "timestamp": 60,
      "actorId": null,
      "data": {
        "committerEmail": "Bivxr@dontemailme.com",
        "committerName": "Mr. Pqtik",
        "committedDate": 60
      }
    },
    {
      "type": "committed",
      "timestamp": 70,
      "actorId": null,
      "data": {
        "committerEmail": "Bivxr@dontemailme.com",
        "committerName": "Mr. Dakrr",
        "committedDate": 70
      }
    },
    {
      "type": "committed",
      "timestamp": 80,
      "actorId": null,
      "data": {
        "committerEmail": "Bivxr@dontemailme.com",
        "committerName": "Mr. Llwuh",
        "committedDate": 80
      }
    },
    {
      "type": "review_requested",
      "timestamp": 90,
      "actorId": 3,
      "data": {
        "requestedReviewerId": 5,
        "requestedReviewerName": "Mr. Nbydb"
      }
    },
    {
      "type": "review_requested",
      "timestamp": 100,
      "actorId": 3,
      "data": {
        "requestedReviewerId": 1,
        "requestedReviewerName": "Mr. Pvpuh"
      }
    },
    {
      "type": "committed",
      "timestamp": 110,
      "actorId": null,
      "data": {
        "committerEmail": "Lozxg@dontemailme.com",
        "committerName": "Mr. Nnycv",
        "committedDate": 110
      }
    },
    {
      "type": "merged",
      "timestamp": 120,
      "actorId": 1
    },
    {
      "type": "closed",
      "timestamp": 130,
      "actorId": 1
    }
  ]
};

const pr93Expected = {
  startedCodingAt: new Date(10),
  startedPickupAt: new Date(110),
  startedReviewAt: null,
  mergedAt: new Date(120),
  reviewed: false,
  reviewDepth: 0
};


const pr173 = {
  "authorExternalId": 2,
  "timeline": [
    {
      "type": "committed",
      "timestamp": 10,
      "actorId": null,
      "data": {
        "committerEmail": "Lozxg@dontemailme.com",
        "committerName": "Mr. Pcabj",
        "committedDate": 10
      }
    },
    {
      "type": "committed",
      "timestamp": 20,
      "actorId": null,
      "data": {
        "committerEmail": "Lozxg@dontemailme.com",
        "committerName": "Mr. Rdhmw",
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

const pr173Expected = {
  startedCodingAt: new Date(10),
  startedPickupAt: new Date(20),
  startedReviewAt: null,
  mergedAt: new Date(30),
  reviewed: false,
  reviewDepth: 0
};

const pr41 = {
  "authorExternalId": 3,
  "timeline": [
    {
      "type": "review_requested",
      "timestamp": 10,
      "actorId": 3,
      "data": {
        "requestedReviewerId": 1,
        "requestedReviewerName": "Mr. Fydck"
      }
    },
    {
      "type": "closed",
      "timestamp": 20,
      "actorId": 3
    },
    {
      "type": "committed",
      "timestamp": 30,
      "actorId": null,
      "data": {
        "committerEmail": "Bivxr@dontemailme.com",
        "committerName": "Mr. Dteim",
        "committedDate": 30
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

const pr41Expected = {
  startedCodingAt: new Date(30),
  startedPickupAt: new Date(30),
  startedReviewAt: null,
  mergedAt: new Date(40),
  reviewed: false,
  reviewDepth: 0
};


const pr193 = {
  "authorExternalId": 3,
  "timeline": [
    {
      "type": "review_requested",
      "timestamp": 10,
      "actorId": 3,
      "data": {
        "requestedReviewerId": 1,
        "requestedReviewerName": "Mr. Ysiqq"
      }
    },
    {
      "type": "committed",
      "timestamp": 20,
      "actorId": null,
      "data": {
        "committerEmail": "Bivxr@dontemailme.com",
        "committerName": "Mr. Mffqi",
        "committedDate": 20
      }
    },
    {
      "type": "reviewed",
      "timestamp": 30,
      "actorId": 1,
      "data": {
        "state": "approved"
      }
    },
    {
      "type": "committed",
      "timestamp": 40,
      "actorId": null,
      "data": {
        "committerEmail": "Lozxg@dontemailme.com",
        "committerName": "Mr. Tmnhl",
        "committedDate": 40
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

const pr193Expected = {
  startedCodingAt: new Date(20),
  startedPickupAt: new Date(20),
  startedReviewAt: new Date(30),
  mergedAt: new Date(50),
  reviewed: true,
  reviewDepth: 1
};

const fixtures = [
  ['pr1', { pr: pr1, expected: pr1Expected }],
  ['pr5', { pr: pr5, expected: pr5Expected }],
  ['pr20', { pr: pr20, expected: pr20Expected }],
  ['pr39', { pr: pr39, expected: pr39Expected }],
  ['pr41', { pr: pr41, expected: pr41Expected }],
  ['pr73', { pr: pr73, expected: pr73Expected }],
  ['pr74', { pr: pr74, expected: pr74Expected }],
  ['pr83', { pr: pr83, expected: pr83Expected }],
  ['pr93', { pr: pr93, expected: pr93Expected }],
  ['pr99', { pr: pr99, expected: pr99Expected }],
  ['pr100', { pr: pr100, expected: pr100Expected }],
  ['pr101', { pr: pr101, expected: pr101Expected }],
  ['pr143', { pr: pr143, expected: pr143Expected }],
  ['pr173', { pr: pr173, expected: pr173Expected }],
  ['pr193', { pr: pr193, expected: pr193Expected }],
  ['pr312', { pr: pr312, expected: pr312Expected }], 
] as [string, { pr: typeof pr1 | typeof pr5 | typeof pr143, expected: typeof pr1Expected | typeof pr5Expected | typeof pr143Expected }][]


describe("timelines", () => {
  describe.each(fixtures)("%s", (_name, { pr, expected }) => {

    const authorExternalId = pr.authorExternalId;
    
    
    const map = new Map();
    
    for (const ev of pr.timeline) {
      map.set({ type: ev.type, timestamp: new Date(ev.timestamp) }, ev);
    }

    const keys = [...map.keys()];

    const result = calculateTimeline(keys as unknown as TimelineMapKey[], map as Map<TimelineMapKey, MergeRequestNoteData | TimelineEventData>, { authorExternalId });

    const { startedCodingAt, startedPickupAt, startedReviewAt, mergedAt, reviewed, reviewDepth } = result;

    const getTime = (date: Date | null) => date?.getTime() || null;

    test('startedCodingAt', () => {
      expect(getTime(startedCodingAt)).toEqual(getTime(expected.startedCodingAt ));
    });

    test('startedPickupAt', () => {
      expect(getTime(startedPickupAt)).toEqual(getTime(expected.startedPickupAt));
    });

    test('startedReviewAt', () => {
      expect(getTime(startedReviewAt)).toEqual(getTime(expected.startedReviewAt));
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

  });
});
