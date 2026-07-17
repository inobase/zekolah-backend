import type { FastifyPluginCallback } from 'fastify';

/**
 * Content-Type validator plugin.
 * - POST/PUT/PATCH without `multipart` → requires `application/json`.
 * - Rejects 415 Unsupported Media Type when wrong Content-Type is sent.
 */
const contentTypeValidator: FastifyPluginCallback = (app, _opts, done) => {
  // Skip multipart routes and docs
  const skipPaths = new Set([
    '/api/v1/submissions', // file upload
  ]);

  app.addHook('onRequest', async (request, reply) => {
    const method = request.method;

    // Only validate POST, PUT, PATCH
    if (!['POST', 'PUT', 'PATCH'].includes(method)) {
      return;
    }

    const contentType = request.headers['content-type'] || '';

    // Allow multipart/form-data
    if (contentType.includes('multipart')) {
      return;
    }

    // Require application/json
    if (!contentType.includes('application/json')) {
      reply.code(415);
      await reply.send({
        statusCode: 415,
        error: 'Unsupported Media Type',
        message: `Content-Type must be application/json for ${method} requests. Received: ${contentType || '(none)'}`,
      });
      return;
    }
  });

  done();
};

export default contentTypeValidator;
