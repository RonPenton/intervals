import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import path from "path";

const app = new Hono();

// API routes
app.get("/api/about", (c) => {
  return c.json({
    name: "intervals",
    version: "1.0.0",
  });
});

// Serve static files from the built client
app.use("/*", serveStatic({ root: "./dist/client" }));

// Fallback to index.html for client-side routing
app.get("/*", serveStatic({ root: "./dist/client", path: "index.html" }));

const port = 3000;
console.log(`Server running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
