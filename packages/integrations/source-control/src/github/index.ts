import type { SourceControl } from '..';
import { Octokit } from '@octokit/rest';
import parseLinkHeader from "parse-link-header";

import type { NewRepository, NewNamespace, NewMergeRequest, NewMember } from "@acme/extract-schema";
import type { Pagination, TimePeriod } from '../source-control';

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
      members: result.data.map(member=>({
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
          repositoryId
        })),
      pagination
    }
  }

}
