import type { TransformTenantsInput } from "@dxta/workflows";

import { getClient } from "../client";

function parseArgs(): {
  tenantId?: number;
  from?: Date;
  to?: Date;
} {
  const args = process.argv.slice(2);
  const result: { tenantId?: number; from?: Date; to?: Date } = {};

  for (const arg of args) {
    if (arg.startsWith("--tenantId=")) {
      result.tenantId = Number.parseInt(arg.split("=")[1] ?? "", 10);
    } else if (arg.startsWith("--from=")) {
      result.from = new Date(arg.split("=")[1] ?? "");
    } else if (arg.startsWith("--to=")) {
      result.to = new Date(arg.split("=")[1] ?? "");
    }
  }

  return result;
}

async function main() {
  const { tenantId, from, to } = parseArgs();

  const now = new Date();
  const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

  const input: TransformTenantsInput = {
    timePeriod: {
      from: from ?? fifteenMinutesAgo,
      to: to ?? now,
    },
    ...(tenantId !== undefined && { tenantId }),
  };

  const client = await getClient();

  const workflowId = `transform-tenants-manual-${Date.now()}`;

  const handle = await client.workflow.start("transformTenantsWorkflow", {
    taskQueue: "transform",
    workflowId,
    args: [input],
  });

  console.log(`Started transformTenantsWorkflow`);
  console.log(`  Workflow ID: ${handle.workflowId}`);
  console.log(`  Run ID: ${handle.firstExecutionRunId}`);
  console.log(`  Input: ${JSON.stringify(input, null, 2)}`);
}

main().catch((err) => {
  console.error("Failed to start transform workflow:", err);
  process.exit(1);
});
