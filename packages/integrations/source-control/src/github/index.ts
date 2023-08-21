import type { SourceControl } from '..';
import { Octokit } from '@octokit/rest';
import parseLinkHeader from "parse-link-header";

import type { NewRepository, NewNamespace, NewMergeRequest, NewMember, NewMergeRequestDiff, Repository, Namespace, MergeRequest } from "@acme/extract-schema";
import type { Pagination, TimePeriod } from '../source-control';

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

  async fetchRepository(externalRepositoryId: number, namespaceName: string, repositoryName: string): Promise<{ repository: NewRepository; namespace?: NewNamespace }> {
    const result = await this.api.repos.get({
      owner: namespaceName,
      repo: repositoryName
    });

    return {
      repository: {
        externalId: result.data.id,
        name: result.data.name,
      },
      namespace: {
        externalId: result.data.owner.id,
        name: result.data.owner.login
      }
    }
  }

  async fetchMembers(externalRepositoryId: number, namespaceName: string, repositoryName: string, page?: number, perPage?: number): Promise<{ members: NewMember[], pagination: Pagination }> {
    page = page || 1;
    perPage = perPage || 30;

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
        name: member.name || member.login,
        username: member.login
      })),
      pagination
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async fetchMergeRequests(externalRepositoryId: number, namespaceName: string, repositoryName: string, repositoryId: number, creationPeriod: TimePeriod = {}, page?: number, perPage?: number): Promise<{ mergeRequests: NewMergeRequest[]; pagination: Pagination; }> {
    page = page || 1;
    perPage = perPage || 30;

    const result = await this.api.pulls.list({
      owner: namespaceName,
      repo: repositoryName,
      page: page,
      per_page: perPage,
      state: "all",
      sort: "created",
    });

    const linkHeader = parseLinkHeader(result.headers.link) || { next: { per_page: perPage } };

    const pagination = {
      page,
      perPage: ('next' in linkHeader) ? Number(linkHeader.next?.per_page) : Number(linkHeader.prev?.per_page),
      totalPages: (!('last' in linkHeader)) ? page : Number(linkHeader.last?.page)
    } satisfies Pagination;

    return {
      mergeRequests: result.data
        .map(mergeRequest => ({
          externalId: mergeRequest.id,
          mergeRequestId: mergeRequest.number,
          repositoryId,
          title: mergeRequest.title,
          webUrl: mergeRequest.url,
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

  async fetchMergeRequestDiffs(repository: Repository, namespace: Namespace, mergeRequest: MergeRequest, page?: number, perPage?: number): Promise<{ mergeRequestDiffs: NewMergeRequestDiff[], pagination: Pagination }> {
    page = page || 1;
    perPage = perPage || 30;

    const result = await this.api.pulls.listFiles({
      owner: namespace.name,
      repo: repository.name,
      page: page,
      per_page: perPage,
      pull_number: mergeRequest.mergeRequestId,
    });

    const linkHeader = parseLinkHeader(result.headers.link) || { next: { per_page: perPage } };

    const pagination = {
      page,
      perPage: ('next' in linkHeader) ? Number(linkHeader.next?.per_page) : Number(linkHeader.prev?.per_page),
      totalPages: (!('last' in linkHeader)) ? page : Number(linkHeader.last?.page)
    } satisfies Pagination;

    return {
      mergeRequestDiffs: result.data.map(mergeRequestFile => ({
        mergeRequestId: mergeRequest.mergeRequestId,
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

}
