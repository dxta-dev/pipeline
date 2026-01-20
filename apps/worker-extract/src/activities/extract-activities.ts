import { eq, and } from "drizzle-orm";

import { setInstance } from "@dxta/crawl-functions";
import { instances } from "@dxta/crawl-schema";
import {
  getRepository,
  getMergeRequests,
  getMergeRequestsDiffs,
  getMergeRequestCommits,
  getMergeRequestNotes,
  getTimelineEvents,
  getMembers,
  getMemberInfo,
  getNamespaceMembers,
  getDeployments,
  getDeploymentStatus,
  getCommits,
  getWorkflowDeployments,
  getWorkflowDeploymentStatus,
} from "@dxta/extract-functions";
import {
  repositories,
  namespaces,
  mergeRequests,
  mergeRequestDiffs,
  mergeRequestCommits,
  mergeRequestNotes,
  timelineEvents,
  members,
  repositoriesToMembers,
  deployments,
  repositoryShas,
  gitIdentities,
  repositoryCommits,
  repositoryShaTrees,
} from "@dxta/extract-schema";
import { deploymentEnvironments, cicdDeployWorkflows } from "@dxta/tenant-schema";
import { getTenants } from "@dxta/super-schema";
import type {
  ExtractActivities,
  ExtractTenantsInput,
  ExtractRepositoryInput,
  ExtractMergeRequestInput,
  ExtractMembersInput,
  ExtractDeploymentsInput,
  SourceControl,
  TimePeriod,
  Tenant,
  RepositoryInfo,
  ExtractRepositoryResult,
  ExtractMergeRequestsResult,
  ExtractMembersResult,
  ExtractDeploymentsResult,
} from "@dxta/workflows";

import { getEnv } from "../env";
import { initDatabase, initSourceControl, initSuperDatabase } from "../context";

export const extractActivities: ExtractActivities = {
  async getTenants(input: ExtractTenantsInput): Promise<Tenant[]> {
    const superDb = initSuperDatabase();
    const allTenants = await getTenants(superDb);

    let filtered = allTenants;
    if (input.tenantId) {
      filtered = filtered.filter((t) => t.id === input.tenantId);
    }

    return filtered.map((t) => ({
      id: t.id,
      name: t.name,
      dbUrl: t.dbUrl,
      crawlUserId: t.crawlUserId,
    }));
  },

  async getRepositoriesForTenant(input: {
    tenantDbUrl: string;
    sourceControl?: SourceControl;
  }): Promise<RepositoryInfo[]> {
    const db = initDatabase(input.tenantDbUrl);
    const repos = await db
      .select({
        id: repositories.id,
        externalId: repositories.externalId,
        name: repositories.name,
        namespaceId: namespaces.id,
        namespaceName: namespaces.name,
        forgeType: repositories.forgeType,
      })
      .from(repositories)
      .innerJoin(namespaces, eq(repositories.namespaceId, namespaces.id))
      .all();

    let filtered = repos.filter((r) => r.forgeType === "github");
    if (input.sourceControl) {
      filtered = filtered.filter((r) => r.forgeType === input.sourceControl);
    }

    return filtered.map((r) => ({
      id: r.id,
      externalId: r.externalId,
      name: r.name,
      namespaceId: r.namespaceId,
      namespaceName: r.namespaceName,
      forgeType: "github",
    }));
  },

  async extractRepository(
    input: ExtractRepositoryInput,
  ): Promise<ExtractRepositoryResult> {
    const db = initDatabase(input.tenantDbUrl);
    const sourceControl = await initSourceControl({
      tenantId: input.tenantId,
      sourceControl: input.sourceControl,
    });

    const { repository, namespace } = await getRepository(
      {
        externalRepositoryId: input.externalRepositoryId,
        repositoryName: input.repositoryName,
        namespaceName: input.namespaceName,
      },
      {
        db,
        integrations: { sourceControl },
        entities: { repositories, namespaces },
      },
    );

    const { instanceId } = await setInstance(
      {
        repositoryId: repository.id,
        userId: input.userId,
        since: input.timePeriod.from,
        until: input.timePeriod.to,
      },
      { db, entities: { instances } },
    );

    return {
      repositoryId: repository.id,
      namespaceId: namespace.id,
      crawlId: instanceId,
      mergeRequestIds: [],
    };
  },

  async extractMergeRequests(input: {
    tenantId: number;
    tenantDbUrl: string;
    repositoryId: number;
    externalRepositoryId: number;
    repositoryName: string;
    namespaceId: number;
    namespaceName: string;
    sourceControl: SourceControl;
    userId: string;
    crawlId: number;
    timePeriod: TimePeriod;
    page: number;
    perPage: number;
  }): Promise<ExtractMergeRequestsResult> {
    const db = initDatabase(input.tenantDbUrl);
    const sourceControl = await initSourceControl({
      tenantId: input.tenantId,
      sourceControl: input.sourceControl,
    });

    const { processableMergeRequests, paginationInfo } = await getMergeRequests(
      {
        externalRepositoryId: input.externalRepositoryId,
        namespaceName: input.namespaceName,
        repositoryName: input.repositoryName,
        repositoryId: input.repositoryId,
        page: input.page,
        perPage: input.perPage,
        timePeriod: input.timePeriod,
      },
      {
        db,
        integrations: { sourceControl },
        entities: { mergeRequests, repositoryShas },
      },
    );

    return {
      mergeRequestIds: processableMergeRequests.map((mr) => mr.id),
      totalPages: paginationInfo.totalPages,
    };
  },

  async extractMergeRequestDiffs(input: ExtractMergeRequestInput): Promise<void> {
    const db = initDatabase(input.tenantDbUrl);
    const sourceControl = await initSourceControl({
      tenantId: input.tenantId,
      sourceControl: input.sourceControl,
    });

    await getMergeRequestsDiffs(
      {
        mergeRequestId: input.mergeRequestId,
        repositoryId: input.repositoryId,
        namespaceId: input.namespaceId,
        perPage: getEnv().PER_PAGE,
      },
      {
        db,
        integrations: { sourceControl },
        entities: { mergeRequestDiffs, mergeRequests, namespaces, repositories },
      },
    );
  },

  async extractMergeRequestCommits(input: ExtractMergeRequestInput): Promise<void> {
    const db = initDatabase(input.tenantDbUrl);
    const sourceControl = await initSourceControl({
      tenantId: input.tenantId,
      sourceControl: input.sourceControl,
    });

    await getMergeRequestCommits(
      {
        mergeRequestId: input.mergeRequestId,
        namespaceId: input.namespaceId,
        repositoryId: input.repositoryId,
      },
      {
        db,
        integrations: { sourceControl },
        entities: {
          mergeRequestCommits,
          members,
          repositoriesToMembers,
          namespaces,
          repositories,
          mergeRequests,
        },
      },
    );
  },

  async extractMergeRequestNotes(input: ExtractMergeRequestInput): Promise<void> {
    const db = initDatabase(input.tenantDbUrl);
    const sourceControl = await initSourceControl({
      tenantId: input.tenantId,
      sourceControl: input.sourceControl,
    });

    await getMergeRequestNotes(
      {
        mergeRequestId: input.mergeRequestId,
        repositoryId: input.repositoryId,
        namespaceId: input.namespaceId,
      },
      {
        db,
        integrations: { sourceControl },
        entities: {
          members,
          mergeRequestNotes,
          mergeRequests,
          namespaces,
          repositories,
          repositoriesToMembers,
        },
      },
    );
  },

  async extractTimelineEvents(input: ExtractMergeRequestInput): Promise<void> {
    const db = initDatabase(input.tenantDbUrl);
    const sourceControl = await initSourceControl({
      tenantId: input.tenantId,
      sourceControl: input.sourceControl,
      options: {
        fetchTimelineEventsPerPage: getEnv().FETCH_TIMELINE_EVENTS_PER_PAGE,
      },
    });

    await getTimelineEvents(
      {
        mergeRequestId: input.mergeRequestId,
        repositoryId: input.repositoryId,
        namespaceId: input.namespaceId,
      },
      {
        db,
        integrations: { sourceControl },
        entities: {
          timelineEvents,
          mergeRequests,
          namespaces,
          repositories,
          members,
          repositoriesToMembers,
          gitIdentities,
        },
      },
    );
  },

  async extractMembers(input: ExtractMembersInput): Promise<ExtractMembersResult> {
    const db = initDatabase(input.tenantDbUrl);
    const sourceControl = await initSourceControl({
      tenantId: input.tenantId,
      sourceControl: input.sourceControl,
    });

    const repository = await db
      .select()
      .from(repositories)
      .where(eq(repositories.id, input.repositoryId))
      .get();
    const namespace = await db
      .select()
      .from(namespaces)
      .where(eq(namespaces.id, input.namespaceId))
      .get();

    if (!repository || !namespace) {
      return { memberIds: [], totalPages: 0 };
    }

    const { members: extractedMembers, paginationInfo } = await getMembers(
      {
        externalRepositoryId: repository.externalId,
        namespaceName: namespace.name,
        repositoryId: repository.id,
        repositoryName: repository.name,
        perPage: getEnv().PER_PAGE,
        page: 1,
      },
      {
        db,
        integrations: { sourceControl },
        entities: { members, repositoriesToMembers },
      },
    );

    const newMemberIds = extractedMembers
      .filter((m) => !m.name && !m.email)
      .map((m) => m.id);

    return {
      memberIds: newMemberIds,
      totalPages: paginationInfo.totalPages,
    };
  },

  async extractMemberInfo(input: {
    tenantId: number;
    tenantDbUrl: string;
    memberId: number;
    sourceControl: SourceControl;
    userId: string;
  }): Promise<void> {
    const db = initDatabase(input.tenantDbUrl);
    const sourceControl = await initSourceControl({
      tenantId: input.tenantId,
      sourceControl: input.sourceControl,
    });

    await getMemberInfo(
      { memberId: input.memberId },
      {
        db,
        integrations: { sourceControl },
        entities: { members },
      },
    );
  },

  async extractNamespaceMembers(input: {
    tenantId: number;
    tenantDbUrl: string;
    namespaceId: number;
    namespaceName: string;
    repositoryId: number;
    sourceControl: SourceControl;
    userId: string;
    crawlId: number;
  }): Promise<void> {
    const db = initDatabase(input.tenantDbUrl);
    const sourceControl = await initSourceControl({
      tenantId: input.tenantId,
      sourceControl: input.sourceControl,
    });

    const namespace = await db
      .select()
      .from(namespaces)
      .where(eq(namespaces.id, input.namespaceId))
      .get();

    if (!namespace) return;

    await getNamespaceMembers(
      {
        externalNamespaceId: namespace.externalId,
        namespaceName: namespace.name,
        repositoryId: input.repositoryId,
        perPage: getEnv().PER_PAGE,
      },
      {
        db,
        integrations: { sourceControl },
        entities: { members, repositoriesToMembers },
      },
    );
  },

  async extractDeployments(
    input: ExtractDeploymentsInput,
  ): Promise<ExtractDeploymentsResult> {
    const db = initDatabase(input.tenantDbUrl);
    const sourceControl = await initSourceControl({
      tenantId: input.tenantId,
      sourceControl: input.sourceControl,
    });

    const repository = await db
      .select()
      .from(repositories)
      .where(eq(repositories.id, input.repositoryId))
      .get();
    const namespace = await db
      .select()
      .from(namespaces)
      .where(eq(namespaces.id, input.namespaceId))
      .get();

    if (!repository || !namespace) {
      return { deploymentIds: [] };
    }

    const environments = await db
      .select()
      .from(deploymentEnvironments)
      .where(
        and(
          eq(deploymentEnvironments.repositoryExternalId, repository.externalId),
          eq(deploymentEnvironments.forgeType, repository.forgeType),
        ),
      )
      .all();

    if (environments.length === 0) {
      return { deploymentIds: [] };
    }

    const allDeploymentIds: number[] = [];

    for (const env of environments) {
      const { deployments: extracted } = await getDeployments(
        {
          namespace,
          repository,
          environment: env.environment,
          page: 1,
          perPage: getEnv().PER_PAGE,
        },
        {
          db,
          integrations: { sourceControl },
          entities: { repositoryShas, deployments },
        },
      );

      const undeterminedIds = extracted
        .filter((d) => d.status === null)
        .map((d) => d.id);
      allDeploymentIds.push(...undeterminedIds);
    }

    return { deploymentIds: allDeploymentIds };
  },

  async extractDeploymentStatus(input: {
    tenantId: number;
    tenantDbUrl: string;
    repositoryId: number;
    namespaceId: number;
    deploymentId: number;
    sourceControl: SourceControl;
    userId: string;
  }): Promise<void> {
    const db = initDatabase(input.tenantDbUrl);
    const sourceControl = await initSourceControl({
      tenantId: input.tenantId,
      sourceControl: input.sourceControl,
    });

    const repository = await db
      .select()
      .from(repositories)
      .where(eq(repositories.id, input.repositoryId))
      .get();
    const namespace = await db
      .select()
      .from(namespaces)
      .where(eq(namespaces.id, input.namespaceId))
      .get();
    const deployment = await db
      .select()
      .from(deployments)
      .where(eq(deployments.id, input.deploymentId))
      .get();

    if (!repository || !namespace || !deployment) return;

    await getDeploymentStatus(
      { deployment, namespace, repository },
      {
        db,
        integrations: { sourceControl },
        entities: { deployments },
      },
    );
  },

  async extractDefaultBranchCommits(input: {
    tenantId: number;
    tenantDbUrl: string;
    repositoryId: number;
    externalRepositoryId: number;
    repositoryName: string;
    namespaceId: number;
    namespaceName: string;
    sourceControl: SourceControl;
    userId: string;
    crawlId: number;
    timePeriod: TimePeriod;
  }): Promise<void> {
    const db = initDatabase(input.tenantDbUrl);
    const sourceControl = await initSourceControl({
      tenantId: input.tenantId,
      sourceControl: input.sourceControl,
    });

    const repository = await db
      .select()
      .from(repositories)
      .where(eq(repositories.id, input.repositoryId))
      .get();
    const namespace = await db
      .select()
      .from(namespaces)
      .where(eq(namespaces.id, input.namespaceId))
      .get();

    if (!repository || !namespace) return;

    await getCommits(
      {
        repository,
        namespace,
        ref: repository.defaultBranch ?? undefined,
        timePeriod: input.timePeriod,
        perPage: getEnv().PER_PAGE,
      },
      {
        db,
        integrations: { sourceControl },
        entities: {
          commits: repositoryCommits,
          repositoryShaTrees,
          repositoryShas,
        },
      },
    );
  },

  async extractWorkflowDeployments(input: {
    tenantId: number;
    tenantDbUrl: string;
    repositoryId: number;
    externalRepositoryId: number;
    repositoryName: string;
    namespaceId: number;
    namespaceName: string;
    userId: string;
    crawlId: number;
    timePeriod: TimePeriod;
  }): Promise<void> {
    const db = initDatabase(input.tenantDbUrl);
    const sourceControl = await initSourceControl({
      tenantId: input.tenantId,
      sourceControl: "github",
    });

    const repository = await db
      .select()
      .from(repositories)
      .where(eq(repositories.id, input.repositoryId))
      .get();
    const namespace = await db
      .select()
      .from(namespaces)
      .where(eq(namespaces.id, input.namespaceId))
      .get();

    if (!repository || !namespace) return;

    const workflows = await db
      .select()
      .from(cicdDeployWorkflows)
      .where(
        and(
          eq(cicdDeployWorkflows.repositoryExternalId, repository.externalId),
          eq(cicdDeployWorkflows.forgeType, repository.forgeType),
        ),
      )
      .all();

    if (workflows.length === 0) return;

    for (const workflow of workflows) {
      await getWorkflowDeployments(
        {
          repository,
          namespace,
          timePeriod: input.timePeriod,
          workflowId: workflow.workflowExternalid,
          branch: workflow.branch || undefined,
          perPage: getEnv().PER_PAGE,
        },
        {
          db,
          integrations: { sourceControl },
          entities: { deployments, repositoryShas },
        },
      );
    }
  },

  async extractWorkflowDeploymentStatus(input: {
    tenantId: number;
    tenantDbUrl: string;
    repositoryId: number;
    namespaceId: number;
    deploymentId: number;
    userId: string;
  }): Promise<void> {
    const db = initDatabase(input.tenantDbUrl);
    const sourceControl = await initSourceControl({
      tenantId: input.tenantId,
      sourceControl: "github",
    });

    const repository = await db
      .select()
      .from(repositories)
      .where(eq(repositories.id, input.repositoryId))
      .get();
    const namespace = await db
      .select()
      .from(namespaces)
      .where(eq(namespaces.id, input.namespaceId))
      .get();
    const deployment = await db
      .select()
      .from(deployments)
      .where(eq(deployments.id, input.deploymentId))
      .get();

    if (!repository || !namespace || !deployment) return;

    await getWorkflowDeploymentStatus(
      { deployment, namespace, repository },
      {
        db,
        integrations: { sourceControl },
        entities: { deployments },
      },
    );
  },
};
