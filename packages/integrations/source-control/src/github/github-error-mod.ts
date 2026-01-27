import { RequestError } from "@octokit/request-error";
import type { SourceControl } from "..";
import { RateLimitExceededError } from "./errors";
import { headersRateLimitState } from "./rate-limits";

const modError = (error: unknown) => {
  if (!(error instanceof RequestError)) {
    return error;
  }

  if (error.response === undefined) {
    return error;
  }

  const rateLimitState = headersRateLimitState(error.response.headers);
  if (!rateLimitState) return error;

  if (error.status === 403 && rateLimitState.remaining === 0) {
    return new RateLimitExceededError(error.message, rateLimitState);
  }

  return error;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AsyncFunction<T extends any[] = any[], R = any> = (
  ...args: T
) => Promise<R>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleError = <T extends any[], R = any, I = any>(
  thisArg: I,
  f?: AsyncFunction<T, R>,
) => {
  if (!f) return undefined;

  return async (...args: T) => {
    try {
      const result = await f.call(thisArg, ...args);
      return result;
    } catch (error) {
      throw modError(error);
    }
  };
};

export const githubErrorMod = <SC extends Partial<SourceControl>>(
  client: SC,
) => {
  const upgradedClient = {
    fetchCommits: handleError(client, client.fetchCommits),
    fetchDeployment: handleError(client, client.fetchDeployment),
    fetchDeployments: handleError(client, client.fetchDeployments),
    fetchMembers: handleError(client, client.fetchMembers),
    fetchMergeRequestCommits: handleError(
      client,
      client.fetchMergeRequestCommits,
    ),
    fetchMergeRequestDiffs: handleError(client, client.fetchMergeRequestDiffs),
    fetchMergeRequestNotes: handleError(client, client.fetchMergeRequestNotes),
    fetchMergeRequests: handleError(client, client.fetchMergeRequests),
    fetchMergeRequestsV2: handleError(client, client.fetchMergeRequestsV2),
    fetchMergeRequestMerger: handleError(
      client,
      client.fetchMergeRequestMerger,
    ),
    fetchMergeRequestCloser: handleError(
      client,
      client.fetchMergeRequestCloser,
    ),
    fetchNamespaceMembers: handleError(client, client.fetchNamespaceMembers),
    fetchRepository: handleError(client, client.fetchRepository),
    fetchTimelineEvents: handleError(client, client.fetchTimelineEvents),
    fetchUserInfo: handleError(client, client.fetchUserInfo),
    fetchWorkflowDeployment: handleError(
      client,
      client.fetchWorkflowDeployment,
    ),
    fetchWorkflowDeployments: handleError(
      client,
      client.fetchWorkflowDeployments,
    ),
  } satisfies {
    [K in keyof Required<SourceControl>]: SourceControl[K] | undefined;
  };

  return upgradedClient as Partial<SourceControl> & SC;
};
