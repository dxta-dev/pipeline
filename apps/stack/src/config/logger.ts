type Log = {
  message: string;
  error?: Error,
  shouldRetry?: boolean,
  hasFailed: boolean,
}


export function log(log: Log) {
  if (log.hasFailed) {
    console.error(log.message, log.error);
  } else {
    console.log(log.message);
  }
  if (log.shouldRetry) {
    throw log.error;
  }
}
