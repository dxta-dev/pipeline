import type { SourceControl, Pagination, TimePeriod, CommitData } from "../source-control";
import type { Gitlab as GitlabType, ShowExpanded, Sudo, MergeRequestDiffSchema, OffsetPagination } from '@gitbeaker/core';
import type { NewRepository, NewNamespace, NewMergeRequest, NewMember, NewMergeRequestDiff, Repository, Namespace, MergeRequest, NewMergeRequestCommit, NewMergeRequestNote, NewTimelineEvents, NewCicdWorkflow, NewCicdRun, NewDeployment } from "@dxta/extract-schema";
import { Gitlab } from '@gitbeaker/rest';

export class GitlabSourceControl implements SourceControl {
  private api: GitlabType<false>;

  constructor(token: string) {
    this.api = new Gitlab({
      oauthToken: token,
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-unused-vars
  async fetchUserInfo(externalId: number, _username: string): Promise<{ member: NewMember }> {
    const result = await this.api.Users.show(externalId, { showExpanded: true });

    return {
      member: {
        externalId,
        forgeType: 'gitlab',
        name: result.data.name,
        username: result.data.username,
        email: (result.data.public_email as string | null | undefined), // Note: GitBeaker, hello ?
      }
    }
  }

  async fetchNamespaceMembers(externalNamespaceId: number, _namespaceName: string, perPage: number, page?: number): Promise<{ members: NewMember[], pagination: Pagination }> {
    const { data, paginationInfo } = await this.api.GroupMembers.all(externalNamespaceId, {
      perPage,
      page: page || 1,
      pagination: 'offset',
      showExpanded: true,
    });

    return {
      members: data.map(member => ({
        externalId: member.id,
        forgeType: 'gitlab',
        name: member.name,
        username: member.username,
        extractedSource: 'namespace',
      } satisfies NewMember)),
      pagination: {
        page: paginationInfo.current,
        perPage: paginationInfo.perPage,
        totalPages: paginationInfo.totalPages
      } satisfies Pagination
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async fetchRepository(externalRepositoryId: number, namespaceName: string, repositoryName: string): Promise<{ repository: Omit<NewRepository, "namespaceId">, namespace: NewNamespace }> {
    const project = await this.api.Projects.show(externalRepositoryId);
    const namespace = project.namespace;

    return {
      repository: {
        externalId: project.id,
        forgeType: 'gitlab',
        name: project.name,
        defaultBranch: project.default_branch
      } satisfies Omit<NewRepository, "namespaceId">,
      namespace: {
        externalId: namespace.id,
        forgeType: 'gitlab',
        name: namespace.name,
      } satisfies NewNamespace,
    };
  }

  async fetchMembers(externalRepositoryId: number, namespaceName: string, repositoryName: string, perPage: number, page?: number): Promise<{ members: NewMember[], pagination: Pagination }> {
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
        forgeType: 'gitlab',
        name: member.name,
        username: member.username,
        email: member.email,
        extractedSource: 'repository',
      } satisfies NewMember)),
      pagination: {
        page: paginationInfo.current,
        perPage: paginationInfo.perPage,
        totalPages: paginationInfo.totalPages
      } satisfies Pagination
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async fetchMergeRequests(externalRepositoryId: number, namespaceName = '', repositoryName = '', repositoryId: number, perPage: number, creationPeriod?: TimePeriod, page?: number): Promise<{ mergeRequests: NewMergeRequest[], pagination: Pagination }> {
    const { data, paginationInfo } = await this.api.MergeRequests.all({
      projectId: externalRepositoryId,
      page: page || 1,
      perPage,
      pagination: 'offset',
      showExpanded: true,
      createdAfter: creationPeriod?.from.toISOString(),
      createdBefore: creationPeriod?.to.toISOString(),
    });
    return {
      mergeRequests: data.map((mr) => ({
        externalId: mr.id,
        canonId: mr.iid,
        repositoryId,
        title: mr.title,
        webUrl: mr.web_url,
        createdAt: new Date(mr.created_at),
        updatedAt: mr.updated_at ? new Date(mr.updated_at) : undefined,
        mergedAt: mr.merged_at ? new Date(mr.merged_at) : undefined,
        mergerExternalId: mr.merged_by?.id,
        closedAt: mr.closed_at ? new Date(mr.closed_at as unknown as string) : undefined,
        closerExternalId: mr.closed_by?.id,
        authorExternalId: mr.author?.id,
        state: mr.state,
        targetBranch: mr.target_branch,
        sourceBranch: mr.source_branch,
        mergeCommitSha: mr.merge_commit_sha,
      } satisfies NewMergeRequest)),
      pagination: {
        page: paginationInfo.current,
        perPage: paginationInfo.perPage,
        totalPages: paginationInfo.totalPages
      }
    }
  }

  async fetchMergeRequestDiffs(repository: Repository, namespace: Namespace, mergeRequest: MergeRequest, perPage: number, page?: number): Promise<{ mergeRequestDiffs: NewMergeRequestDiff[], pagination: Pagination }> {
    // TODO: wait until gitbeaker fixes this
    const { data, paginationInfo } = ((await this.api.MergeRequests.allDiffs(repository.externalId, mergeRequest.canonId, {
      showExpanded: true,
      page: page || 1,
      perPage,
      pagination: 'offset'
    } as Sudo & ShowExpanded<true>)) as unknown) as { data: MergeRequestDiffSchema[], paginationInfo: OffsetPagination };

    return {
      mergeRequestDiffs: data.map(mergeRequestDiff => ({
        mergeRequestId: mergeRequest.id,
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async fetchMergeRequestCommits(repository: Repository, namespace: Namespace, mergeRequest: MergeRequest): Promise<{ mergeRequestCommits: NewMergeRequestCommit[] }> {
    const { data } = await this.api.MergeRequests.allCommits(
      repository.externalId,
      mergeRequest.canonId,
      {
        showExpanded: true,
      }
    );

    return {
      mergeRequestCommits: data.map((mrc) => ({
        mergeRequestId: mergeRequest.id,
        externalId: mrc.id,
        createdAt: new Date(mrc.created_at),
        authoredDate: new Date(mrc.authored_date || ''),
        committedDate: new Date(mrc.committed_date || ''),
        title: mrc.title,
        message: mrc.message,
        authorName: mrc.author_name || '',
        authorEmail: mrc.author_email || '',
        committerName: mrc.committer_name || '',
        committerEmail: mrc.committer_email || ''
      })),
    }
  }

  async fetchMergeRequestNotes(repository: Repository, namespace: Namespace, mergeRequest: MergeRequest): Promise<{ mergeRequestNotes: NewMergeRequestNote[] }> {
    const { data } = await this.api.MergeRequestNotes.all(repository.externalId, mergeRequest.canonId, {
      showExpanded: true
    });

    return {
      mergeRequestNotes: data.map((mergeRequestNote) => ({
        externalId: mergeRequestNote.id,
        mergeRequestId: mergeRequest.id,
        createdAt: new Date(mergeRequestNote.created_at),
        updatedAt: new Date(mergeRequestNote.updated_at),
        authorUsername: mergeRequestNote.author.username,
        authorExternalId: mergeRequestNote.author.id,
        body: mergeRequestNote.body, // TODO: remove body if user comment/review (leaving for now for to test)
        system: mergeRequestNote.system, // TODO: won't need system if its false for commment/reviews only
      } satisfies NewMergeRequestNote))
    };
  }

  fetchTimelineEvents(_repository: Repository, _namespace: Namespace, _mergeRequest: MergeRequest): Promise<{ timelineEvents: NewTimelineEvents[]; }> {
    throw new Error("Method not implemented.");
  }

  fetchCommits(_repository: Repository, _namespace: Namespace, _perPage: number, _ref?: string, _period?: TimePeriod, _page?: number): Promise<{commits: CommitData[], pagination: Pagination}> {
    throw new Error("Method not implemented.");
  }

  fetchCicdWorkflows(_repository: Repository, _namespace: Namespace, _perPage: number, _page?: number): Promise<{ cicdWorkflows: NewCicdWorkflow[], pagination: Pagination }> {
    throw new Error("Method not implemented.");
  }
  
  fetchCicdWorkflowRuns(_repository: Repository, _namespace: Namespace, _workflowId: number, _timePeriod: TimePeriod, _perPage: number, _branch?:string, _page?: number): Promise<{ cicdRuns: NewCicdRun[], pagination: Pagination }> {
    throw new Error("Method not implemented.");
  }

  fetchDeployments(_repository: Repository, _namespace: Namespace, _perPage: number, _environment?: string, _page?: number): Promise<{ deployments: NewDeployment[]; pagination: Pagination; }> {
    // See: https://docs.gitlab.com/ee/api/deployments.html
    throw new Error("Method not implemented");
  }

}
