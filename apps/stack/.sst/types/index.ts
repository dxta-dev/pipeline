import "sst/node/config";
declare module "sst/node/config" {
  export interface ConfigTypes {
    APP: string;
    STAGE: string;
  }
}import "sst/node/config";
declare module "sst/node/config" {
  export interface SecretResources {
    "EXTRACT_DATABASE_URL": {
      value: string;
    }
  }
}import "sst/node/config";
declare module "sst/node/config" {
  export interface SecretResources {
    "EXTRACT_DATABASE_AUTH_TOKEN": {
      value: string;
    }
  }
}import "sst/node/config";
declare module "sst/node/config" {
  export interface SecretResources {
    "CRAWL_DATABASE_URL": {
      value: string;
    }
  }
}import "sst/node/config";
declare module "sst/node/config" {
  export interface SecretResources {
    "CRAWL_DATABASE_AUTH_TOKEN": {
      value: string;
    }
  }
}import "sst/node/config";
declare module "sst/node/config" {
  export interface SecretResources {
    "CLERK_SECRET_KEY": {
      value: string;
    }
  }
}import "sst/node/config";
declare module "sst/node/config" {
  export interface SecretResources {
    "REDIS_URL": {
      value: string;
    }
  }
}import "sst/node/config";
declare module "sst/node/config" {
  export interface SecretResources {
    "REDIS_TOKEN": {
      value: string;
    }
  }
}import "sst/node/config";
declare module "sst/node/config" {
  export interface ParameterResources {
    "REDIS_USER_TOKEN_TTL": {
      value: string;
    }
  }
}import "sst/node/config";
declare module "sst/node/config" {
  export interface ParameterResources {
    "PER_PAGE": {
      value: string;
    }
  }
}import "sst/node/event-bus";
declare module "sst/node/event-bus" {
  export interface EventBusResources {
    "ExtractBus": {
      eventBusName: string;
    }
  }
}import "sst/node/queue";
declare module "sst/node/queue" {
  export interface QueueResources {
    "ExtractQueue": {
      queueUrl: string;
    }
  }
}import "sst/node/api";
declare module "sst/node/api" {
  export interface ApiResources {
    "ExtractApi": {
      url: string;
    }
  }
}import "sst/node/config";
declare module "sst/node/config" {
  export interface SecretResources {
    "TRANSFORM_DATABASE_URL": {
      value: string;
    }
  }
}import "sst/node/config";
declare module "sst/node/config" {
  export interface SecretResources {
    "TRANSFORM_DATABASE_AUTH_TOKEN": {
      value: string;
    }
  }
}