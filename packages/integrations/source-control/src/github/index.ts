import type { SourceControl } from '..';
import { Octokit } from '@octokit/rest';
import parseLinkHeader from 'parse-link-header'

import type { NewRepository, NewNamespace } from "@acme/extract-schema";
import type { Pagination, RepositoryWithNamespace } from '../source-control';

export class GitHubSourceControl implements SourceControl {

  private api: Octokit;

  constructor(auth?: string | object) {
    this.api = new Octokit({
      auth, // TODO: Need to look into https://github.com/octokit/authentication-strategies.js
    })
  }

  async fetchRepositoriesWithNamespaces(perPage?: number, page?: number): Promise<{ repositoriesAndNamespaces: RepositoryWithNamespace[]; pagination: Pagination }> {
    const repos = await this.api.repos.listForAuthenticatedUser({
      per_page: perPage || 30,
      page: page || 1
    })

    const linkHeader = parseLinkHeader(repos.headers.link) || { next: { per_page: perPage } };

    // what is responsePerPage, need more than 100 repos to test if per_page response is clamped down to limit
    const responsePerPage = ('next' in linkHeader) ? Number(linkHeader.next?.per_page) : Number(linkHeader.prev?.per_page);
    const totalPages = (!('last' in linkHeader) ? page : Number(linkHeader.last?.page)) || 1;

    return {
      repositoriesAndNamespaces: repos.data.map(repo => ({
        repository: {
          externalId: repo.id,
          name: repo.name,
        },
        namespace: {
          externalId: repo.owner.id,
          name: repo.owner.login
        }
      })),
      pagination: {
        page: page || 1,
        perPage: responsePerPage,
        totalPages: totalPages
      } satisfies Pagination
    }
  }

  fetchRepository(externalRepositoryId: number): Promise<{ repository: NewRepository; namespace?: NewNamespace; }> {
    throw new Error('Method not implemented.' + externalRepositoryId.toString());
  }


}