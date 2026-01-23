import { createServer } from "node:http";

import { getEnv } from "./env";
import { ensureSchedules } from "./schedules";

async function run() {
  const env = getEnv();

  console.log("Orchestrator starting...");

  // Ensure schedules exist on startup
  await ensureSchedules();

  // Create a minimal HTTP server for Railway health checks
  const server = createServer((req, res) => {
    if (req.url === "/health" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(env.PORT, () => {
    console.log(`Health check server listening on port ${env.PORT}`);
    console.log(`Orchestrator ready`);
  });
}

run().catch((err) => {
  console.error("Orchestrator failed:", err);
  process.exit(1);
});
