export const timePeriodOf = (timestamp: number, periodDuration: number, periodStartMargin: number, periodLatency: number) => {
  const to = timestamp - (timestamp % periodDuration);
  const from = to - (periodDuration + periodStartMargin);

  return {
    from: new Date(from - periodLatency),
    to: new Date(to - periodLatency)
  }
}
