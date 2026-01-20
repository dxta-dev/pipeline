export function getUTCOffset(timeZone: string, date: Date) {
  const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));

  const timeZoneDate = new Date(date.toLocaleString("en-US", { timeZone }));

  const offset = (timeZoneDate.getTime() - utcDate.getTime()) / (1000 * 60);

  return offset;
}
