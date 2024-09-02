import { EventHandler } from "@stack/config/create-event"
import { extractRepositoryEvent } from "./events"
import { createMessageHandler } from "@stack/config/create-message"
import { deployments, DeploymentSchema, namespaces, NamespaceSchema, repositories, RepositorySchema } from "@dxta/extract-schema"
import { z } from "zod"
import type { Context, GetWorkflowDeploymentStatusEntities, GetWorkflowDeploymentStatusSourceControl } from "@dxta/extract-functions"
import { getWorkflowDeploymentStatus } from "@dxta/extract-functions";
import { MessageKind, metadataSchema } from "./messages"
import { getClerkUserToken } from "./get-clerk-user-token"
import { GitHubSourceControl, GitlabSourceControl } from "@dxta/source-control"
import { getTenantDb, type OmitDb } from "@stack/config/get-tenant-db"
import { and, eq, isNull, or } from "drizzle-orm"

export const workflowDeploymentStatusSenderHandler = createMessageHandler({
  queueId: 'ExtractQueue',
  kind: MessageKind.WorkflowDeploymentStatus,
  metadataShape: metadataSchema.shape,
  contentShape: z.object({
    repository: RepositorySchema,
    namespace: NamespaceSchema,
    deployment: DeploymentSchema,
  }).shape,
  handler: async (message) => {
    const { repository, namespace, deployment } = message.content;
    const { tenantId, userId, sourceControl } = message.metadata;

    if (deployment.status !== null && deployment.status !== 'pending') {
      console.log("Skipping extract-workflow-deployment-status for status:", deployment.status);
      return;
    }

    context.integrations.sourceControl = await initSourceControl(userId, sourceControl);
    await getWorkflowDeploymentStatus({
      namespace,
      repository,
      deployment
    }, { ...context, db: getTenantDb(tenantId) });

  }
});

const { sender } = workflowDeploymentStatusSenderHandler;

export const eventHandler = EventHandler(extractRepositoryEvent, async (ev) => {
  const { crawlId, from, to, userId, sourceControl, tenantId } = ev.metadata;
  const db = getTenantDb(tenantId);

  const repository = await db.select().from(repositories).where(eq(repositories.id, ev.properties.repositoryId)).get();
  const namespace = await db.select().from(namespaces).where(eq(namespaces.id, ev.properties.namespaceId)).get();

  if (!repository) throw new Error("invalid repo id");
  if (!namespace) throw new Error("Invalid namespace id");

  const unresolvedDeployments = await db.select().from(deployments).where(
    and(
      eq(deployments.deploymentType, 'github-workflow-deployment'),
      eq(repositories.id, repository.id),
      or(
        eq(deployments.status, "pending"),
        isNull(deployments.status)
      ),
    )
  ).all();

  if (unresolvedDeployments.length === 0) return;

  const arrayOfExtractDeploymentStatusMessageContent: Parameters<typeof workflowDeploymentStatusSenderHandler.sender.send>[0][] = unresolvedDeployments.map(
    deployment => ({
      namespace,
      repository,
      deployment
    })
  );

  await sender.sendAll(arrayOfExtractDeploymentStatusMessageContent, {
    version: 1,
    caller: 'extract-deployment-status',
    sourceControl,
    userId,
    timestamp: new Date().getTime(),
    from,
    to,
    crawlId,
    tenantId,
  });

}, {
  propertiesToLog: ["properties.repositoryId", "properties.namespaceId"],
});

const initSourceControl = async (userId: string, sourceControl: 'github' | 'gitlab') => {
  const accessToken = await getClerkUserToken(userId, `oauth_${sourceControl}`);
  if (sourceControl === 'github') return new GitHubSourceControl({ auth: accessToken });
  if (sourceControl === 'gitlab') return new GitlabSourceControl(accessToken);
  return null;
}

const context: OmitDb<Context<GetWorkflowDeploymentStatusSourceControl, GetWorkflowDeploymentStatusEntities>> = {
  entities: {
    deployments
  },
  integrations: {
    sourceControl: null,
  },
};
