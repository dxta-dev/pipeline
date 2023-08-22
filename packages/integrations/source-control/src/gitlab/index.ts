import type { SourceControl, Pagination, TimePeriod } from "../source-control";
import type { Gitlab as GitlabType, ShowExpanded, Sudo, MergeRequestDiffSchema, OffsetPagination } from '@gitbeaker/core';
import type { NewRepository, NewNamespace, NewMergeRequest, NewMember, NewMergeRequestDiff, Repository, Namespace, MergeRequest, NewMergeRequestCommit } from "@acme/extract-schema";
import { Gitlab } from '@gitbeaker/rest';

export class GitlabSourceControl implements SourceControl {
  private api: GitlabType<false>;

  constructor(token: string) {
    this.api = new Gitlab({
      oauthToken: token,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async fetchRepository(externalRepositoryId: number, namespaceName: string, repositoryName: string): Promise<{ repository: NewRepository, namespace?: NewNamespace }> {
    const project = await this.api.Projects.show(externalRepositoryId);
    const namespace = project.namespace;

    return {
      repository: {
        externalId: project.id,
        name: project.name
      } satisfies NewRepository,
      namespace: {
        externalId: namespace.id,
        name: namespace.name,
      } satisfies NewNamespace,
    };
  }

  async fetchMembers(externalRepositoryId: number, namespaceName: string, repositoryName: string, page?: number, perPage?: number): Promise<{ members: NewMember[], pagination: Pagination }> {
    const { data, paginationInfo } = await this.api.ProjectMembers.all(externalRepositoryId, {
      includeInherited: true,
      perPage,
      page: page || 1,
      pagination: 'offset',
      showExpanded: true,
    });

    return {
      members: data.map(member => ({
        externalId: member.id,
        name: member.name,
        username: member.username
      } satisfies NewMember)),
      pagination: {
        page: paginationInfo.current,
        perPage: paginationInfo.perPage,
        totalPages: paginationInfo.totalPages
      } satisfies Pagination
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async fetchMergeRequests(externalRepositoryId: number, namespaceName = '', repositoryName = '', repositoryId: number, creationPeriod: TimePeriod = {}, page?: number, perPage?: number): Promise<{ mergeRequests: NewMergeRequest[], pagination: Pagination }> {
    const { data, paginationInfo } = await this.api.MergeRequests.all({
      projectId: externalRepositoryId,
      page: page || 1,
      perPage,
      pagination: 'offset',
      showExpanded: true,
      createdAfter: creationPeriod.from?.toISOString(),
      createdBefore: creationPeriod.to?.toISOString(),
    });
    return {
      mergeRequests: data.map((mr) => ({
        externalId: mr.id,
        mergeRequestId: mr.iid,
        repositoryId,
        title: mr.title,
        webUrl: mr.web_url,
        createdAt: new Date(mr.created_at),
        updatedAt: mr.updated_at ? new Date(mr.updated_at) : undefined,
        mergedAt: mr.merged_at ? new Date(mr.merged_at) : undefined,
        closedAt: mr.closed_at ? new Date(mr.closed_at as unknown as string) : undefined,
        authorExternalId: mr.author?.id,
        state: mr.state,
        targetBranch: mr.target_branch,
        sourceBranch: mr.source_branch,
      } satisfies NewMergeRequest)),
      pagination: {
        page: paginationInfo.current,
        perPage: paginationInfo.perPage,
        totalPages: paginationInfo.totalPages
      }
    }
  }

  async fetchMergeRequestDiffs(repository: Repository, namespace: Namespace, mergeRequest: MergeRequest, page?: number, perPage?: number): Promise<{ mergeRequestDiffs: NewMergeRequestDiff[], pagination: Pagination }> {
    // TODO: wait until gitbeaker fixes this
    const { data, paginationInfo } = ((await this.api.MergeRequests.allDiffs(repository.externalId, mergeRequest.mergeRequestId, {
      showExpanded: true,
      page: page || 1,
      perPage,
      pagination: 'offset'
    } as Sudo & ShowExpanded<true>)) as unknown) as { data: MergeRequestDiffSchema[], paginationInfo: OffsetPagination };

    return {
      mergeRequestDiffs: data.map(mergeRequestDiff => ({
        mergeRequestId: mergeRequest.mergeRequestId,
        diff: mergeRequestDiff.diff,
        newPath: mergeRequestDiff.new_path,
        oldPath: mergeRequestDiff.old_path,
        aMode: mergeRequestDiff.a_mode,
        bMode: mergeRequestDiff.b_mode,
        newFile: mergeRequestDiff.new_file,
        renamedFile: mergeRequestDiff.renamed_file,
        deletedFile: mergeRequestDiff.deleted_file,
      })),
      pagination: {
        page: paginationInfo.current,
        perPage: paginationInfo.perPage,
        totalPages: paginationInfo.totalPages
      }
    }
  }

  async fetchMergeRequestCommits(externalRepositoryId: number, namespaceName: string, repositoryName: string, mergerequestIId: number, creationPeriod: TimePeriod = {}): Promise<{ mergeRequestCommits: NewMergeRequestCommit[]}> {
    const { data } = await this.api.MergeRequests.allCommits(
      externalRepositoryId,
      mergerequestIId,
      {
        showExpanded: true,
      }
    );
    console.log('DATA', data);
    return {
      mergeRequestCommits: data.map((mrc) => ({
        mergeRequestId: mergerequestIId,
        externalId: mrc.id,
        createdAt: new Date(mrc.created_at),
        authoredDate: new Date(mrc.authored_date || ''),
        committedDate: new Date(mrc.committed_date || ''),
        title: mrc.title,
        message: mrc.message,
        authorName: mrc.author_name || '',
        authorEmail: mrc.author_email || '',
      })),
    }
  }

}
