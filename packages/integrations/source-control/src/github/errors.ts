import type { RateLimitState } from "./rate-limits";

export class RateLimitExceededError extends Error {
  name: "RateLimitExceededError";
  state: RateLimitState;

  constructor(message: string, state: RateLimitState) {
    super(message);

    this.name = "RateLimitExceededError";
    this.state = state;
  }
}
