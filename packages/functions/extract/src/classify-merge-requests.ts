import type { MergeRequest } from "@dxta/extract-schema";

// absolute primordial: created_at < crawl_epoch < closed_at?
// absolute residual:   created_at < closed_at < crawl_epoch
// relative primordial: created_at < (since - relative_epoch_distance) < closed_at?

// relative residual: created_at < closed_at < (since - relative_epoch_distance)
export const isRelativeResidualMergeRequest = (mr: MergeRequest, since: Date, relativeEpochDistanceMilis: number) => {
  const closedAt = mr.closedAt || mr.mergedAt;
  if (closedAt === null) return false;
  const relativeEpoch = since.getTime() - relativeEpochDistanceMilis;

  return closedAt.getTime() < relativeEpoch;
}