import { getAuth } from "@clerk/fastify";
import type { FastifyPluginAsync } from "fastify";

export const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', (request, reply) => {
    const auth = getAuth(request);
    if (!auth.userId) {
      return reply.redirect(303, '/sign-in');
    }
    return Promise.resolve();
  });
  return Promise.resolve();
}