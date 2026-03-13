import "dotenv-json2/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { auth } from "./auth";
import { cors } from "hono/cors";

const port = Number(process.env.PORT ?? 3000);


const app = new Hono<{
    Variables: {
        user: typeof auth.$Infer.Session.user | null;
        session: typeof auth.$Infer.Session.session | null
    }
}>();

app.use("*", async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });

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

app.use(
    "/api/auth/*", // or replace with "*" to enable cors for all routes
    cors({
        origin: `http://localhost:${port}`, // replace with your origin
        allowHeaders: ["Content-Type", "Authorization"],
        allowMethods: ["POST", "GET", "OPTIONS"],
        exposeHeaders: ["Content-Length"],
        maxAge: 600,
        credentials: true,
    }),
);

// Better-auth handles all /api/auth/* routes
app.on(["POST", "GET"], "/api/auth/**", (c) => {
    return auth.handler(c.req.raw);
});



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

console.log(`Server running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
