import "dotenv-json2/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { auth } from "./auth";
import { cors } from "hono/cors";
import { scheduleRoutes } from "./api-schedules";
import { targetRoutes } from "./api-targets";
import { connect } from "./db";

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
    "/api/auth/*",
    cors({
        origin: [`http://localhost:${port}`, "http://localhost:5173"],
        allowHeaders: ["Content-Type", "Authorization"],
        allowMethods: ["POST", "GET", "OPTIONS"],
        exposeHeaders: ["Content-Length"],
        maxAge: 600,
        credentials: true,
    }),
);

app.on(["POST", "GET"], "/api/auth/**", (c) => {
    return auth.handler(c.req.raw);
});

app.get("/api/about", (c) => {
    return c.json({
        name: "intervals",
        version: "1.0.0",
    });
});

app.route("/api", scheduleRoutes);
app.route("/api", targetRoutes);

app.use("/*", serveStatic({ root: "./dist/client" }));
app.get("/*", serveStatic({ root: "./dist/client", path: "index.html" }));

connect().then(() => {
    console.log(`Server running on http://localhost:${port}`);
    serve({ fetch: app.fetch, port });
});
