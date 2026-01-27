import { proxyActivities } from "@temporalio/workflow";

import type { ExtractActivities } from "../types/activities";
import type { ExtractMergeRequestInput } from "../types/inputs";

const {
  extractMergeRequestDiffs,
  extractMergeRequestCommits,
  extractMergeRequestNotes,
  extractTimelineEvents,
  extractMergeRequestMerger,
  extractMergeRequestCloser,
} = proxyActivities<ExtractActivities>({
  startToCloseTimeout: "10 minutes",
  retry: {
    initialInterval: "5 seconds",
    backoffCoefficient: 2,
    maximumInterval: "1 minute",
    maximumAttempts: 10,
  },
});

export async function extractMergeRequestWorkflow(
  input: ExtractMergeRequestInput,
): Promise<void> {
  await extractMergeRequestDiffs(input);
  await extractMergeRequestCommits(input);
  await extractMergeRequestNotes(input);

  if (input.sourceControl === "github") {
    await extractTimelineEvents(input);
    await extractMergeRequestMerger(input);
    await extractMergeRequestCloser(input);
  }
}
