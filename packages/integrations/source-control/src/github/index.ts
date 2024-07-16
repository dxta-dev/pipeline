import type { SourceControl } from '..';
import { Octokit } from '@octokit/rest';
import parseLinkHeader from "parse-link-header";

import type { NewRepository, NewNamespace, NewMergeRequest, NewMember, NewMergeRequestDiff, Repository, Namespace, MergeRequest, NewMergeRequestCommit, NewMergeRequestNote, NewTimelineEvents, TimelineEventType, NewCicdWorkflow, NewCicdRun, cicdRunResultEnum, cicdRunStatusEnum } from "@dxta/extract-schema";
import type { Pagination, TimePeriod } from '../source-control';
import type { components } from '@octokit/openapi-types';
import { TimelineEventTypes } from '../../../../../packages/schemas/extract/src/timeline-events';
import { RequestError } from '@octokit/request-error';

const FILE_STATUS_FLAGS_MAPPING: Record<
  "added"
  | "removed"
  | "modified"
  | "renamed"
  | "copied"
  | "changed"
  | "unchanged", Pick<NewMergeRequestDiff, "newFile" | "renamedFile" | "deletedFile">> = {
  "modified": {
    newFile: false,
    renamedFile: false,
    deletedFile: false,
  },
  "renamed": {
    newFile: false,
    renamedFile: true,
    deletedFile: false,
  },
  "added": {
    newFile: true,
    renamedFile: false,
    deletedFile: false,
  },
  "changed": {
    newFile: false,
    deletedFile: false,
    renamedFile: false,
  },
  "copied": {
    newFile: false,
    deletedFile: false,
    renamedFile: false,
  },
  "removed": {
    newFile: false,
    deletedFile: true,
    renamedFile: false,
  },
  "unchanged": {
    newFile: false,
    deletedFile: false,
    renamedFile: false,
  }
}

function mapWorkflowRunStatus(v: string | null): typeof cicdRunStatusEnum[number] | null {
  if (typeof v !== 'string') return v;
  switch (v) {
    case 'completed':
      return 'completed';
    case 'action_required':
    case 'in_progress':
      return 'in_progress';
    case 'cancelled':
      return 'cancelled';
    case 'failure':
      console.log(new Error("GithubSourceControl@mapWorkflowRunStatus error: Unexpected status 'failure'"));
      return 'completed';
    case 'neutral':
      console.log(new Error("GithubSourceControl@mapWorkflowRunStatus error: Unexpected status 'neutral'"));
      return 'unknown';
    case 'skipped':
      return 'skipped';
    case 'stale':
      console.log(new Error("GithubSourceControl@mapWorkflowRunStatus warn: Unexpected status 'stale'"));
      return 'unknown';
    case 'success':
      console.log(new Error("GithubSourceControl@mapWorkflowRunStatus error: Unexpected status 'success'"));
      return 'completed';
    case 'timed_out':
      return 'timed_out';
    case 'queued':
    case 'request':
    case 'waiting':
    case 'pending':
      return 'not_started'
    default:
      console.log(new Error(`GithubSourceControl@mapWorkflowRunStatus error: Really unexpected status '${v}'`));
      return 'unknown';
  }
}

function mapWorkflowRunConclusion(v: string | null): typeof cicdRunResultEnum[number] | null {
  if (typeof v !== 'string') return v;

  switch (v) {
    case 'success':
      return 'success';
    case 'failure':
      return 'failure';
    default:
      console.log(new Error(`GithubSourceControl@mapWorkflowRunConclusion error:`))
      return "unknown";
  }
}

const dateQueryStrings = {
  dateTimeRange: (since: Date, until: Date) => `${since.toISOString().slice(0,19)}+00:00..${until.toISOString().slice(0,19)}+00:00`
}

type GitHubSourceControlOptions = {
  fetchTimelineEventsPerPage?: number;
  auth?: string | object;
}
export class GitHubSourceControl implements SourceControl {

  private api: Octokit;

  constructor(private options: GitHubSourceControlOptions) {
    this.api = new Octokit({
      auth: options.auth, // TODO: Need to look into https://github.com/octokit/authentication-strategies.js
    })
  }

  async fetchUserInfo(_externalId: number, username: string): Promise<{ member: NewMember }> {
    const result = await this.api.users.getByUsername({
      username
    });

    return {
      member: {
        externalId: result.data.id,
        forgeType: 'github',
        name: result.data.name,
        username: result.data.login,
        email: result.data.email,
        profileUrl: result.data.html_url,
        avatarUrl: result.data.avatar_url
      }
    }
  }

  async fetchNamespaceMembers(_externalNamespaceId: number, namespaceName: string, perPage: number, page?: number): Promise<{ members: NewMember[], pagination: Pagination }> {
    page = page || 1;

    const result = await this.api.orgs.listMembers({
      org: namespaceName,
      page,
      per_page: perPage,
      affiliation: 'all',
    });

    const linkHeader = parseLinkHeader(result.headers.link) || { next: { per_page: perPage } };

    const pagination = {
      page,
      perPage: ('next' in linkHeader) ? Number(linkHeader.next?.per_page) : Number(linkHeader.prev?.per_page),
      totalPages: (!('last' in linkHeader)) ? page : Number(linkHeader.last?.page)
    } satisfies Pagination;

    return {
      members: result.data.map(member => ({
        externalId: member.id,
        forgeType: 'github',
        name: member.name,
        username: member.login,
        email: member.email,
        extractedSource: 'namespace',
      })),
      pagination
    }

  }

  async fetchRepository(externalRepositoryId: number, namespaceName: string, repositoryName: string): Promise<{ repository: Omit<NewRepository, "namespaceId">, namespace: NewNamespace }> {
    const result = await this.api.repos.get({
      owner: namespaceName,
      repo: repositoryName
    });

    return {
      repository: {
        externalId: result.data.id,
        forgeType: 'github',
        name: result.data.name,
      } satisfies Omit<NewRepository, "namespaceId">,
      namespace: {
        externalId: result.data.owner.id,
        forgeType: 'github',
        name: result.data.owner.login
      } satisfies NewNamespace,
    }
  }

  async fetchMembers(externalRepositoryId: number, namespaceName: string, repositoryName: string, perPage: number, page?: number): Promise<{ members: NewMember[], pagination: Pagination }> {
    page = page || 1;

    let result: Awaited<ReturnType<Octokit['repos']['listCollaborators']>>;
    try {
      result = await this.api.repos.listCollaborators({
        owner: namespaceName,
        repo: repositoryName,
        page,
        per_page: perPage,
        affiliation: 'all',
      });
    } catch (error) {
      if (error instanceof RequestError && error.message === "Must have push access to view repository collaborators.") {
        console.log("SUPPRESSED: Must have push access to view repository collaborators.")
        return {
          members: [],
          pagination: {
            page: 1,
            perPage: perPage,
            totalPages: 1,
          }
        }
      }

      throw error;
    }

    const linkHeader = parseLinkHeader(result.headers.link) || { next: { per_page: perPage } };

    const pagination = {
      page,
      perPage: ('next' in linkHeader) ? Number(linkHeader.next?.per_page) : Number(linkHeader.prev?.per_page),
      totalPages: (!('last' in linkHeader)) ? page : Number(linkHeader.last?.page)
    } satisfies Pagination;

    return {
      members: result.data.map(member => ({
        externalId: member.id,
        forgeType: 'github',
        name: member.name,
        username: member.login,
        email: member.email,
        extractedSource: 'repository',
      })),
      pagination
    }
  }


  async fetchMergeRequests(externalRepositoryId: number, namespaceName: string, repositoryName: string, repositoryId: number, perPage: number, creationPeriod?: TimePeriod, page?: number, totalPages?: number): Promise<{ mergeRequests: NewMergeRequest[]; pagination: Pagination; }> {
    page = page || 1;
    const serchPRs = async (namespaceName: string, repositoryName: string, page: number, perPage: number, from: Date, to: Date | 'today') => {
      let updated;

      if (to === 'today') {
        updated = `>=${from.toISOString().slice(0, 10)}`;
      } else {
        updated = `${from.toISOString().slice(0, 10)}..${to.toISOString().slice(0, 10)}`;
      }

      const searchResult = await this.api.rest.search.issuesAndPullRequests({
        q: `type:pr+repo:${namespaceName}/${repositoryName}+updated:${updated}`,
        page,
        per_page: perPage,
        state: "all",
        sort: 'updated',
      });

      return {
        totalCount: searchResult.data.total_count,
      }
    }


    async function getPagination({ page, perPage, totalPages, timePeriod }: { page: number, perPage: number, totalPages?: number, timePeriod?: TimePeriod }) {

      if (totalPages || !timePeriod) return null;

      const searchPRsResult = await serchPRs(namespaceName, repositoryName, page, perPage, timePeriod.from, timePeriod.to);

      function isToday(date: Date) {
        const today = new Date();
        return date.getDate() === today.getDate() &&
          date.getMonth() === today.getMonth() &&
          date.getFullYear() === today.getFullYear();
      }

      if (isToday(timePeriod.to)) {
        return {
          page,
          totalPages: Math.ceil(searchPRsResult.totalCount / perPage),
          perPage, // perPage should be calculated from the pulls api not search
        };
      }
      const searchOffsetResult = await serchPRs(namespaceName, repositoryName, page, perPage, timePeriod.from, 'today');

      return {
        page: page + Math.floor((searchOffsetResult.totalCount - searchPRsResult.totalCount) / perPage),
        totalPages: Math.ceil(searchOffsetResult.totalCount / perPage), // totalPages is actually the last page that contains MRs inside the search period
        perPage, // perPage should be calculated from pulls api not search
      }

    }

    const firstPagePagination = await getPagination({
      page,
      perPage,
      totalPages,
      timePeriod: creationPeriod,
    });
    const result = await this.api.pulls.list({
      owner: namespaceName,
      repo: repositoryName,
      page: firstPagePagination?.page || page,
      per_page: firstPagePagination?.perPage || perPage,
      state: "all",
      sort: 'updated',
      direction: 'desc',
    });
    const linkHeader = parseLinkHeader(result.headers.link) || { next: { per_page: perPage } };

    const pullsTotalPages = (!('last' in linkHeader)) ? page : Number(linkHeader.last?.page);
    const pullsPerPage = ('next' in linkHeader) ? Number(linkHeader.next?.per_page) : Number(linkHeader.prev?.per_page);

    const pagination = {
      page: firstPagePagination?.page || page,
      perPage: perPage || firstPagePagination?.perPage || pullsPerPage, // Dejan: This can break if firstPagePagination returns different perPage -> check documentation on linkHeader ???
      totalPages: totalPages || firstPagePagination?.totalPages || pullsTotalPages, // Refactor: should recalculate totalPages here if pulls api returns different perPage
    } satisfies Pagination;
    return {
      mergeRequests: result.data
        .map(mergeRequest => ({
          externalId: mergeRequest.id,
          canonId: mergeRequest.number,
          repositoryId,
          title: mergeRequest.title,
          description: mergeRequest.body,
          webUrl: mergeRequest.html_url,
          createdAt: new Date(mergeRequest.created_at),
          updatedAt: new Date(mergeRequest.updated_at),
          mergedAt: mergeRequest.merged_at ? new Date(mergeRequest.merged_at) : undefined,
          closedAt: mergeRequest.closed_at ? new Date(mergeRequest.closed_at) : undefined,
          authorExternalId: mergeRequest.user?.id,
          state: mergeRequest.state,
          targetBranch: mergeRequest.base.ref,
          sourceBranch: mergeRequest.head.ref,
        } satisfies NewMergeRequest)),
      pagination
    }
  }

  async fetchMergeRequestDiffs(repository: Repository, namespace: Namespace, mergeRequest: MergeRequest, perPage: number, page?: number): Promise<{ mergeRequestDiffs: NewMergeRequestDiff[], pagination: Pagination }> {
    page = page || 1;

    const result = await this.api.pulls.listFiles({
      owner: namespace.name,
      repo: repository.name,
      page: page,
      per_page: perPage,
      pull_number: mergeRequest.canonId,
    });

    const linkHeader = parseLinkHeader(result.headers.link) || { next: { per_page: perPage } };

    const pagination = {
      page,
      perPage: ('next' in linkHeader) ? Number(linkHeader.next?.per_page) : Number(linkHeader.prev?.per_page),
      totalPages: (!('last' in linkHeader)) ? page : Number(linkHeader.last?.page)
    } satisfies Pagination;

    return {
      mergeRequestDiffs: result.data.map(mergeRequestFile => ({
        mergeRequestId: mergeRequest.id,
        diff: mergeRequestFile.patch || "",
        newPath: mergeRequestFile.filename,
        oldPath: mergeRequestFile.previous_filename || mergeRequestFile.filename,
        aMode: "",
        bMode: "",
        ...FILE_STATUS_FLAGS_MAPPING[mergeRequestFile.status],
      })),
      pagination
    }
  }


  async fetchMergeRequestCommits(repository: Repository, namespace: Namespace, mergeRequest: MergeRequest): Promise<{ mergeRequestCommits: NewMergeRequestCommit[] }> {
    const response = await this.api.pulls.listCommits({
      owner: namespace.name,
      repo: repository.name,
      pull_number: mergeRequest.canonId,
    });

    return {
      mergeRequestCommits: response.data.map((mrc) => ({
        mergeRequestId: mergeRequest.id,
        externalId: mrc.sha,
        createdAt: new Date(mrc.commit.committer?.date || ''),
        authoredDate: new Date(mrc.commit.author?.date || ''),
        committedDate: new Date(mrc.commit.committer?.date || ''),
        title: mrc.commit.message,
        message: mrc.commit.message,
        authorName: mrc.commit.author?.name || '',
        authorEmail: mrc.commit.author?.email || '',
        authorExternalId: mrc.author?.id,
        authorUsername: mrc.author?.login, // Is resolved GitHub UserName, different from commit name
        committerName: mrc.commit.committer?.name || '',
        committerEmail: mrc.commit.committer?.email || '',
        committerExternalId: mrc.committer?.id,
        committerUsername: mrc.committer?.login, // Is resolved GitHub UserName, different from commit name
        htmlUrl: mrc.html_url,
      } satisfies NewMergeRequestCommit)),
    }
  }

  async fetchMergeRequestNotes(repository: Repository, namespace: Namespace, mergeRequest: MergeRequest): Promise<{ mergeRequestNotes: NewMergeRequestNote[] }> {
    const response = await this.api.pulls.listReviewComments({
      owner: namespace.name,
      repo: repository.name,
      pull_number: mergeRequest.canonId,
    });

    return {
      mergeRequestNotes: response.data.map(mergeRequestNote => ({
        externalId: mergeRequestNote.id,
        mergeRequestId: mergeRequest.id,
        createdAt: new Date(mergeRequestNote.created_at),
        updatedAt: new Date(mergeRequestNote.updated_at),
        authorUsername: mergeRequestNote.user.login,
        authorExternalId: mergeRequestNote.user.id,
        htmlUrl: mergeRequestNote.html_url,
        body: '', // since a github note is a review_comment (equivalent do gitlab DiffNote) whose body we don't need not; sure what to place here
        system: false,
      } satisfies NewMergeRequestNote))
    }
  }

  async fetchTimelineEvents(repository: Repository, namespace: Namespace, mergeRequest: MergeRequest): Promise<{ timelineEvents: NewTimelineEvents[] }> {
    const response = await this.api.issues.listEventsForTimeline({
      owner: namespace.name,
      repo: repository.name,
      issue_number: mergeRequest.canonId,
      per_page: this.options.fetchTimelineEventsPerPage
    });

    const timelineEvents = response.data.filter(
      (singleResponse) =>
        TimelineEventTypes.includes(singleResponse.event as TimelineEventType)
    ).map((singleEvent) => {
      switch (singleEvent.event) {
        case 'assigned':
        case 'unassigned':
          const assignedEvent = singleEvent as components["schemas"]["timeline-assigned-issue-event"] | components["schemas"]["timeline-unassigned-issue-event"];
          return {
            externalId: assignedEvent.id,
            type: assignedEvent.event as TimelineEventType,
            mergeRequestId: mergeRequest.id,
            timestamp: new Date(assignedEvent.created_at),
            actorName: assignedEvent.actor.login,
            actorId: assignedEvent.actor.id,
            htmlUrl: null,
            data: {
              assigneeId: assignedEvent.assignee.id,
              assigneeName: assignedEvent.assignee.login,
            },
          } satisfies NewTimelineEvents;
        case 'committed':
          const committedEvent = singleEvent as components["schemas"]["timeline-committed-event"]
          return {
            externalId: parseInt(committedEvent.sha.slice(0, 7), 16),
            type: committedEvent.event as TimelineEventType,
            mergeRequestId: mergeRequest.id,
            timestamp: new Date(committedEvent.author.date),
            actorName: committedEvent.author.name,
            actorEmail: committedEvent.author.email,
            htmlUrl: committedEvent.html_url,
            data: {
              committerEmail: committedEvent.committer.email,
              committerName: committedEvent.committer.name,
              committedDate: new Date(committedEvent.committer.date),
            },
          } satisfies NewTimelineEvents;
        case 'review_requested':
        case 'review_request_removed':
          const requestedEvent = singleEvent as components["schemas"]["review-requested-issue-event"] | components["schemas"]["review-request-removed-issue-event"];
          return {
            externalId: requestedEvent.id,
            type: requestedEvent.event as TimelineEventType,
            mergeRequestId: mergeRequest.id,
            timestamp: new Date(requestedEvent.created_at),
            actorName: requestedEvent.actor.login,
            actorId: requestedEvent.actor.id,
            htmlUrl: null,
            data: {
              requestedReviewerId: requestedEvent.requested_reviewer?.id,
              requestedReviewerName: requestedEvent.requested_reviewer?.login,
            },
          } satisfies NewTimelineEvents;
        case 'reviewed':
          const reviewedEvent = singleEvent as components["schemas"]["timeline-reviewed-event"]
          return {
            externalId: reviewedEvent.id,
            type: reviewedEvent.event as TimelineEventType,
            mergeRequestId: mergeRequest.id,
            timestamp: new Date(reviewedEvent.submitted_at as string),
            actorName: reviewedEvent.user.login,
            actorId: reviewedEvent.user.id,
            htmlUrl: reviewedEvent.html_url,
            data: {
              state: reviewedEvent.state,
            },
          } satisfies NewTimelineEvents;
        case 'commented':
          const commentedEvent = singleEvent as components["schemas"]["timeline-comment-event"]
          return {
            externalId: commentedEvent.id,
            type: commentedEvent.event as TimelineEventType,
            mergeRequestId: mergeRequest.id,
            timestamp: new Date(commentedEvent.created_at),
            htmlUrl: commentedEvent.html_url,
            actorName: commentedEvent.actor.login,
            actorId: commentedEvent.actor.id,
          } satisfies NewTimelineEvents;
        default:
          const generalEvent = singleEvent as components["schemas"]["state-change-issue-event"];
          return {
            externalId: generalEvent.id,
            type: generalEvent.event as TimelineEventType,
            mergeRequestId: mergeRequest.id,
            timestamp: new Date(generalEvent.created_at),
            actorName: generalEvent.actor.login,
            actorId: generalEvent.actor.id,
            htmlUrl: null,
          } satisfies NewTimelineEvents;
      }
    });

    return {
      timelineEvents: timelineEvents,
    };
  }

  async fetchCicdWorkflows(repository: Repository, namespace: Namespace, perPage: number, page?: number): Promise<{ cicdWorkflows: NewCicdWorkflow[], pagination: Pagination }> {
    page = page || 1;
    const response = await this.api.actions.listRepoWorkflows({
      repo: repository.name,
      owner: namespace.name,
      page: page,
      per_page: perPage
    });

    const cicdWorkflows = response.data.workflows.map(workflow => ({
      externalId: workflow.id,
      name: workflow.name,
      repositoryId: repository.id,
      runner: "github_actions",
      sourcePath: workflow.path,
    } satisfies NewCicdWorkflow));

    const linkHeader = parseLinkHeader(response.headers.link) || { next: { per_page: perPage } };

    const pagination = {
      page,
      perPage: ('next' in linkHeader) ? Number(linkHeader.next?.per_page) : Number(linkHeader.prev?.per_page),
      totalPages: (!('last' in linkHeader)) ? page : Number(linkHeader.last?.page)
    } satisfies Pagination;

    return {
      cicdWorkflows,
      pagination,
    }
  }

  async fetchCicdWorkflowRuns(repository: Repository, namespace: Namespace, workflowId: number, timePeriod: TimePeriod, perPage: number, branch?: string, page?: number): Promise<{ cicdRuns: NewCicdRun[], pagination: Pagination }> {
    page = page || 1;

    const response = await this.api.actions.listWorkflowRuns({
      owner: namespace.name,
      repo: repository.name,
      workflow_id: workflowId,
      branch,
      created: dateQueryStrings.dateTimeRange(timePeriod.from, timePeriod.to),
      page: page,
      per_page: perPage,
    });

    const cicdRuns = response.data.workflow_runs.map(run => ({
      externalId: run.id,
      gitBranch: run.head_branch || "",
      gitSha: run.head_sha,
      repositoryId: repository.id,
      runAttempt: run.run_attempt || -1,
      status: mapWorkflowRunStatus(run.status),
      result: mapWorkflowRunConclusion(run.conclusion),
      workflowExternalId: run.workflow_id,
      workflowRunner: "github_actions",
      createdAt: new Date(run.created_at),
      updatedAt: new Date(run.updated_at),
      detailsUrl: run.html_url,
      runStartedAt: run.run_started_at ? new Date(run.run_started_at) : undefined,
    } satisfies NewCicdRun))

    const linkHeader = parseLinkHeader(response.headers.link) || { next: { per_page: perPage } };

    const pagination = {
      page,
      perPage: ('next' in linkHeader) ? Number(linkHeader.next?.per_page) : Number(linkHeader.prev?.per_page),
      totalPages: (!('last' in linkHeader)) ? page : Number(linkHeader.last?.page)
    } satisfies Pagination;

    return {
      cicdRuns,
      pagination,
    }

  }
}
