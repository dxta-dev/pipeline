import { getAuth } from "@clerk/fastify";
import type { RouteHandlerMethod } from "fastify";
import { pageContext } from "../context/page.context.js";
import { htmxContext } from "../context/htmx.context.js";
import { AppConfig } from "src/app-config.js";

export const SignIn: RouteHandlerMethod = async (request, reply) => {
  const _auth = getAuth(request);

  const page = pageContext("Sign In");
  const htmx = htmxContext(request.headers);
  return reply.view("page.sign-in.html", {
    ...page,
    ...htmx,
    AppConfig
  });
}
