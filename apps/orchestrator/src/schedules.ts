import {
  ScheduleNotFoundError,
  ScheduleOverlapPolicy,
} from "@temporalio/client";

import { getClient } from "./client";
import { getEnv } from "./env";

const EXTRACT_SCHEDULE_ID = "extract-tenants-schedule";
const TRANSFORM_SCHEDULE_ID = "transform-tenants-schedule";

function createTimePeriod(): { from: number; to: number } {
  const now = Date.now();
  const fifteenMinutesAgo = now - 15 * 60 * 1000;
  return { from: fifteenMinutesAgo, to: now };
}

async function scheduleExists(scheduleId: string): Promise<boolean> {
  const client = await getClient();
  try {
    const handle = client.schedule.getHandle(scheduleId);
    await handle.describe();
    return true;
  } catch (err) {
    if (err instanceof ScheduleNotFoundError) {
      return false;
    }
    throw err;
  }
}

export async function ensureExtractSchedule(): Promise<void> {
  const client = await getClient();

  if (await scheduleExists(EXTRACT_SCHEDULE_ID)) {
    console.log(`Extract schedule already exists: ${EXTRACT_SCHEDULE_ID}`);
    return;
  }

  const handle = await client.schedule.create({
    scheduleId: EXTRACT_SCHEDULE_ID,
    spec: {
      intervals: [{ every: "15m" }],
    },
    action: {
      type: "startWorkflow",
      workflowType: "extractTenantsWorkflow",
      args: [{ timePeriod: createTimePeriod() }],
      taskQueue: "extract",
    },
    policies: {
      overlap: ScheduleOverlapPolicy.ALLOW_ALL,
    },
  });
  console.log(`Created extract schedule: ${handle.scheduleId}`);
}

export async function ensureTransformSchedule(): Promise<void> {
  const client = await getClient();

  if (await scheduleExists(TRANSFORM_SCHEDULE_ID)) {
    console.log(`Transform schedule already exists: ${TRANSFORM_SCHEDULE_ID}`);
    return;
  }

  const handle = await client.schedule.create({
    scheduleId: TRANSFORM_SCHEDULE_ID,
    spec: {
      calendars: [{ minute: [8, 23, 38, 53] }],
    },
    action: {
      type: "startWorkflow",
      workflowType: "transformTenantsWorkflow",
      args: [{ timePeriod: createTimePeriod() }],
      taskQueue: "transform",
    },
    policies: {
      overlap: ScheduleOverlapPolicy.ALLOW_ALL,
    },
  });
  console.log(`Created transform schedule: ${handle.scheduleId}`);
}

export async function ensureSchedules(): Promise<void> {
  const env = getEnv();

  if (env.EXTRACT_SCHEDULE_ENABLED) {
    await ensureExtractSchedule();
  } else {
    console.log("Extract schedule disabled via EXTRACT_SCHEDULE_ENABLED=false");
  }

  if (env.TRANSFORM_SCHEDULE_ENABLED) {
    await ensureTransformSchedule();
  } else {
    console.log(
      "Transform schedule disabled via TRANSFORM_SCHEDULE_ENABLED=false",
    );
  }
}
