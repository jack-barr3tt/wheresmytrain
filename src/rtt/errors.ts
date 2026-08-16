export class RttError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = "RttError"
  }
}

export class InvalidQueryError extends RttError {
  constructor() {
    super("Invalid query", 400)
    this.name = "InvalidQueryError"
  }
}

export class RateLimitedError extends RttError {
  constructor(readonly retryAfterSeconds: number) {
    super(`Rate limited; retry after ${retryAfterSeconds}s`, 429)
    this.name = "RateLimitedError"
  }
}

export class RttUnavailableError extends RttError {
  constructor(
    status?: number,
    readonly cause?: unknown,
  ) {
    super("Realtime Trains unavailable", status)
    this.name = "RttUnavailableError"
  }
}
