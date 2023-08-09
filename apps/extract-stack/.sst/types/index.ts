import "sst/node/config";
declare module "sst/node/config" {
  export interface ConfigTypes {
    APP: string;
    STAGE: string;
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
    "MRQueue": {
      queueUrl: string;
    }
  }
}import "sst/node/config";
declare module "sst/node/config" {
  export interface SecretResources {
    "DATABASE_URL": {
      value: string;
    }
  }
}import "sst/node/config";
declare module "sst/node/config" {
  export interface SecretResources {
    "DATABASE_AUTH_TOKEN": {
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
}import "sst/node/api";
declare module "sst/node/api" {
  export interface ApiResources {
    "ExtractApi": {
      url: string;
    }
  }
}