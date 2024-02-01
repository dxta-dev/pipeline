import type { FastifyReply } from "fastify";

export const redirectToSignIn = (reply: FastifyReply) => reply.redirect(303, '/sign-in');