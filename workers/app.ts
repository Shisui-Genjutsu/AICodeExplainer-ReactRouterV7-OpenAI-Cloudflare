import { createRequestHandler } from "react-router";
import {
  applyMiddleware,
  addSecurityHeaders,
  handleCORS,
  addCORSHeaders,
} from "../app/lib/middleware";

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE
);

export default {
  async fetch(request, env, ctx) {
    // Get allowed origin from environment variable
    const allowedOrigin = env.FRONTEND_URL || "http://localhost:5173";

    // Handle CORS preflight requests
    const corsResult = handleCORS(request, allowedOrigin);
    if (corsResult.isPreflight) {
      return corsResult.preflightResponse || new Response(null, { status: 204 });
    }

    // Apply middleware (body size limit, rate limiting)
    const middlewareResult = await applyMiddleware(request, {
      bodySizeLimit: "10mb",
      rateLimit: {
        maxRequests: 100, // 100 requests
        windowMs: 15 * 60 * 1000, // per 15 minutes
      },
      securityHeaders: true,
    });

    // If middleware returned an error, return it with CORS headers
    if (middlewareResult.error) {
      const errorResponse = addSecurityHeaders(middlewareResult.error);
      return addCORSHeaders(errorResponse, request, allowedOrigin);
    }

    // Process request through React Router
    const response = await requestHandler(
      middlewareResult.modifiedRequest || request,
      {
        cloudflare: { env, ctx },
      }
    );

    // Apply security headers and CORS headers to all responses
    const securedResponse = addSecurityHeaders(response);
    return addCORSHeaders(securedResponse, request, allowedOrigin);
  },
} satisfies ExportedHandler<Env>;
