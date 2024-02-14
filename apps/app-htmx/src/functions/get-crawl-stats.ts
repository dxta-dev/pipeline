import type { Tenant } from "@dxta/super-schema";
import { type Client, createClient } from "@libsql/client";
import { fromUnixTime } from "date-fns/fromUnixTime";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { AppConfig } from "src/app-config";
import { z } from "zod";

const formatDuration = (s: number) => {
  const seconds = s % 60;
  if (s < 60) return `${seconds}s`
  const m = (s - seconds) / 60;
  const minutes = m % 60;
  if (m < 60) return `${minutes}m ${seconds.toString().padStart(2,'0')}s`
  const h = (m - minutes) / 60;
  return `${h}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`
}

const rowSchema = z.object({
  crawl_instance: z.number(),
  event_count: z.number(),
  crawl_duration_sec: z.number(),
  crawl_started_at: z.number()
});

const readCrawlStats =async (client:Client) => {
  const x = await client.execute(`
  SELECT
    ce.instance_id as crawl_instance,
    COUNT(ce.instance_id) as event_count,
    MAX(ce.timestamp) - ci.started_at AS crawl_duration_sec,
    ci.started_at as crawl_started_at
FROM crawl_events ce
JOIN crawl_instances ci ON ce.instance_id = ci.id
GROUP BY ce.instance_id;
  `);
  const rawStats = x.rows.map(row => rowSchema.parse(row));

  return rawStats.map((rawStat)=>({
    instanceId: rawStat.crawl_instance,
    eventCount: rawStat.event_count,
    duration: formatDuration(rawStat.crawl_duration_sec),
    startedAt: formatDistanceToNow(fromUnixTime(rawStat.crawl_started_at))
  }))
}

export const getCrawlStats = async (tenant: Tenant) => {
  const client = createClient({
    url: tenant.dbUrl,
    authToken: AppConfig.tenantDatabaseAuthToken
  });

  return await readCrawlStats(client);
}