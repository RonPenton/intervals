"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv-json2/config");
const hono_1 = require("hono");
const node_server_1 = require("@hono/node-server");
const serve_static_1 = require("@hono/node-server/serve-static");
const auth_1 = require("./auth");
const cors_1 = require("hono/cors");
const port = Number(process.env.PORT ?? 3000);
const app = new hono_1.Hono();
app.use("*", async (c, next) => {
    const session = await auth_1.auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
        c.set("user", null);
        c.set("session", null);
        await next();
        return;
    }
    c.set("user", session.user);
    c.set("session", session.session);
    await next();
});
app.use("/api/auth/*", // or replace with "*" to enable cors for all routes
(0, cors_1.cors)({
    origin: `http://localhost:${port}`, // replace with your origin
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
}));
// Better-auth handles all /api/auth/* routes
app.on(["POST", "GET"], "/api/auth/**", (c) => {
    return auth_1.auth.handler(c.req.raw);
});
// API routes
app.get("/api/about", (c) => {
    return c.json({
        name: "intervals",
        version: "1.0.0",
    });
});
// Serve static files from the built client
app.use("/*", (0, serve_static_1.serveStatic)({ root: "./dist/client" }));
// Fallback to index.html for client-side routing
app.get("/*", (0, serve_static_1.serveStatic)({ root: "./dist/client", path: "index.html" }));
console.log(`Server running on http://localhost:${port}`);
(0, node_server_1.serve)({ fetch: app.fetch, port });
