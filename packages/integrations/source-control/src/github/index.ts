import type { SourceControl } from '..';
import { Octokit } from '@octokit/rest';
import parseLinkHeader from "parse-link-header";

import type { NewRepository, NewNamespace, NewMergeRequest, NewMember, NewMergeRequestDiff, Repository, Namespace, MergeRequest, NewMergeRequestCommit, NewMergeRequestNote, NewTimelineEvents, TimelineEventType } from "@acme/extract-schema";
import type { Pagination, TimePeriod } from '../source-control';
import type { components } from '@octokit/openapi-types';
import { TimelineEventTypes } from '../../../../../packages/schemas/extract/src/timeline-events';

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

export class GitHubSourceControl implements SourceControl {

  private api: Octokit;

  constructor(auth?: string | object) {
    this.api = new Octokit({
      auth, // TODO: Need to look into https://github.com/octokit/authentication-strategies.js
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

  async fetchRepository(externalRepositoryId: number, namespaceName: string, repositoryName: string): Promise<{ repository: NewRepository; namespace: NewNamespace }> {
    const result = await this.api.repos.get({
      owner: namespaceName,
      repo: repositoryName
    });

    return {
      repository: {
        externalId: result.data.id,
        forgeType: 'github',
        name: result.data.name,
      },
      namespace: {
        externalId: result.data.owner.id,
        forgeType: 'github',
        name: result.data.owner.login
      }
    }
  }

  async fetchMembers(externalRepositoryId: number, namespaceName: string, repositoryName: string, perPage: number, page?: number): Promise<{ members: NewMember[], pagination: Pagination }> {
    page = page || 1;

    const result = await this.api.repos.listCollaborators({
      owner: namespaceName,
      repo: repositoryName,
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
        committerName: mrc.commit.committer?.name || '',
        committerEmail: mrc.commit.committer?.email || '',
      })),
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
      }))
    }
  }

  async fetchTimelineEvents(repository: Repository, namespace: Namespace, mergeRequest: MergeRequest): Promise<{ timelineEvents: NewTimelineEvents[] }> {
    const response = await this.api.issues.listEventsForTimeline({
      owner: namespace.name,
      repo: repository.name,
      issue_number: mergeRequest.canonId,
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
            mergeRequestId: mergeRequest.canonId,
            timestamp: new Date(assignedEvent.created_at),
            actorName: assignedEvent.actor.login,
            actorId: assignedEvent.actor.id,
            data: JSON.stringify({
              assigneeId: assignedEvent.assignee.id,
              assigneeName: assignedEvent.assignee.login,
            }),
          } satisfies NewTimelineEvents;
        case 'committed':
          const committedEvent = singleEvent as components["schemas"]["timeline-committed-event"]
          return {
            externalId: parseInt(committedEvent.sha.slice(0,7), 16),
            type: committedEvent.event as TimelineEventType,
            mergeRequestId: mergeRequest.canonId,
            timestamp: new Date(committedEvent.author.date),
            actorName: committedEvent.author.name,
            actorEmail: committedEvent.author.email,
            data: JSON.stringify({
              committerEmail: committedEvent.committer.email,
              committerName: committedEvent.committer.name,
              committedDate: new Date(committedEvent.committer.date),
            }),
          } satisfies NewTimelineEvents;
        case 'review_requested':
        case 'review_request_removed':
          const requestedEvent = singleEvent as components["schemas"]["review-requested-issue-event"] | components["schemas"]["review-request-removed-issue-event"];
          return {
            externalId: requestedEvent.id,
            type: requestedEvent.event as TimelineEventType,
            mergeRequestId: mergeRequest.canonId,
            timestamp: new Date(requestedEvent.created_at),
            actorName: requestedEvent.actor.login,
            actorId: requestedEvent.actor.id,
            data: JSON.stringify({
              requestedReviewerId: requestedEvent.requested_reviewer?.id,
              requestedReviewerName: requestedEvent.requested_reviewer?.login,
            }),
          } satisfies NewTimelineEvents;
        case 'reviewed':
          const reviewedEvent = singleEvent as components["schemas"]["timeline-reviewed-event"]
          return {
            externalId: reviewedEvent.id,
            type: reviewedEvent.event as TimelineEventType,
            mergeRequestId: mergeRequest.canonId,
            timestamp: new Date(reviewedEvent.submitted_at as string),
            actorName: reviewedEvent.user.login,
            actorId: reviewedEvent.user.id,
            data: JSON.stringify({
              state: reviewedEvent.state,
            }),
          } satisfies NewTimelineEvents;
        default:
          const generalEvent = singleEvent as components["schemas"]["state-change-issue-event"];
          return {
            externalId: generalEvent.id,
            type: generalEvent.event as TimelineEventType,
            mergeRequestId: mergeRequest.canonId,
            timestamp: new Date(generalEvent.created_at),
            actorName: generalEvent.actor.login,
            actorId: generalEvent.actor.id,
          } satisfies NewTimelineEvents;
      }
    });
    return {
      timelineEvents: timelineEvents,
    };
  }
}
