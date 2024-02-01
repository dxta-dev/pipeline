import Fastify from "fastify";
import nunjucks from "nunjucks";
import { fastifyView } from "@fastify/view";
import path from "path";
import { fileURLToPath } from "url";
import { clerkPlugin } from "@clerk/fastify";
import { Home } from "./pages/page.home.js";
import fastifyFormbody from "@fastify/formbody";
import { SignIn } from "./pages/page.sign-in.js";
import { ExtractRepository } from "./pages/repository/extract.js";
import { RegisterRepository } from "./pages/repository/register.js";
import { AppConfig } from "./app-config.js";
import { StartTransform } from "./pages/start-transform.js";

AppConfig; // ensure loaded before starting server

const TEMPLATE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../", "src", "views");

const fastify = Fastify({ logger: true });


await fastify.register(fastifyView, {
  engine: {
    nunjucks: nunjucks,
  },
  templates: TEMPLATE_DIR
});
await fastify.register(clerkPlugin);
await fastify.register(fastifyFormbody);

fastify.get('/', Home);
fastify.get('/sign-in',SignIn);
fastify.post('/repository/extract', ExtractRepository); 
fastify.post('/repository/register', RegisterRepository);
fastify.post('/transform', StartTransform);

await fastify.listen({ port: 3001, host: "127.0.0.1" })
console.log("Server started on http://127.0.0.1:3001/");