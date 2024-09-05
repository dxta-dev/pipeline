import { sql } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

type Db = LibSQLDatabase<Record<string, never>>;

export async function selectMergeRequestsDeployments(db: Db, repositoryId: number, from: Date, to: Date) {
  const result = await db.run(sql`WITH RECURSIVE 
deploys_in_period AS (
    SELECT id, repository_sha_id, deployed_at
    FROM extract_deployments
    WHERE \`status\` = 2 
    AND deployed_at BETWEEN ${from.getTime()} AND ${to.getTime()}
    AND repository_id = ${repositoryId}
    ORDER BY deployed_at DESC
),
d_head_prev AS (
    SELECT d.id, d.repository_sha_id, d.deployed_at
    FROM extract_deployments AS d
    JOIN extract_repository_sha_trees sha_tree -- join tree AS root deployment needs to be a parent in the tree
    ON sha_tree.parent_id = d.repository_sha_id
    WHERE d.status = 2 
    AND d.deployed_at < ${from.getTime()}
    AND d.repository_id = ${repositoryId}
    ORDER BY d.deployed_at DESC
    LIMIT 1
),
d_root_curr AS (
    SELECT d.id, d.repository_sha_id, d.deployed_at
    FROM deploys_in_period AS d
    JOIN extract_repository_sha_trees sha_tree -- join tree AS root deployments needs to be a parent in the tree
    ON sha_tree.parent_id = d.repository_sha_id
    ORDER BY d.deployed_at ASC
    LIMIT 1
),
d_head AS (
    SELECT id, repository_sha_id, deployed_at
    FROM deploys_in_period
    LIMIT 1
),
d_root AS (
    SELECT id, repository_sha_id, deployed_at FROM d_root_curr
    UNION ALL
    SELECT id, repository_sha_id, deployed_at FROM d_head_prev
    ORDER BY deployed_at ASC
    LIMIT 1
),
root_sha_tree AS (
    SELECT sha_id, parent_id
    FROM extract_repository_sha_trees
    JOIN d_root d 
    ON parent_id = d.repository_sha_id

    UNION

    SELECT curr.sha_id, curr.parent_id
    FROM extract_repository_sha_trees curr
    JOIN root_sha_tree prev
    ON curr.parent_id = prev.sha_id
),
deploy_sha_tree AS (
    SELECT sha_id, parent_id, d.id AS deployment, d.deployed_at
    FROM root_sha_tree AS sha_tree
    LEFT JOIN deploys_in_period d ON d.repository_sha_id = sha_tree.sha_id
),
propagated_deployments_per_sha AS (
    SELECT sha_id, parent_id, deployment, deployed_at
    FROM deploy_sha_tree
    WHERE deployment IS NOT NULL

    UNION ALL

    SELECT curr.sha_id, curr.parent_id, prev.deployment, prev.deployed_at
    FROM deploy_sha_tree curr
    JOIN propagated_deployments_per_sha prev ON curr.sha_id = prev.parent_id
    WHERE curr.deployment IS NULL
),
deployments_per_sha AS (
    SELECT sha_id, deployment, MIN(deployed_at) AS deployed_at
    FROM propagated_deployments_per_sha
    GROUP BY sha_id

    UNION -- Add root deployment if it's inside the interval (case when transforming first deployment)

    SELECT repository_sha_id, d.id AS deployment, d.deployed_at
    FROM d_root AS d
    WHERE d.deployed_at BETWEEN ${from.getTime()} AND ${to.getTime()}
),
deployed_mrs as (
    SELECT deploy.deployment, mrs.id AS merge_request
    FROM deployments_per_sha AS deploy
    JOIN extract_merge_requests mrs ON mrs.repository_sha_id = deploy.sha_id
)
SELECT deployment, merge_request from deployed_mrs

UNION ALL

SELECT NULL AS deployment, mrs.id AS merge_request
FROM extract_merge_requests AS mrs
LEFT JOIN deployed_mrs AS dmrs ON mrs.id = dmrs.merge_request
WHERE mrs.updated_at BETWEEN ${from.getTime()} AND ${to.getTime()}
AND mrs.repository_id = ${repositoryId}
AND dmrs.deployment IS NULL
;
`)
  const mergeRequestDeployments = result.rows as unknown as { deployment: number, merge_request: number }[];

  return mergeRequestDeployments;
}