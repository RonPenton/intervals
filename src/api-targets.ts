import { Hono } from "hono";
import { auth } from "./auth";
import { addDays, getToday } from "./days";
import { TargetValuesModel } from "./db";

const targetRoutes = new Hono<{
    Variables: {
        user: typeof auth.$Infer.Session.user | null;
        session: typeof auth.$Infer.Session.session | null;
    };
}>();

targetRoutes.get("/targets", async (c) => {
    const user = c.get("user");
    if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
    }

    const today = getToday();
    const endDate = addDays(today, 13);

    const targets = await TargetValuesModel.find({
        userId: user.id,
        date: { $gte: today.toString(), $lte: endDate.toString() },
    }).sort({ date: 1 });

    return c.json({ targets });
});

targetRoutes.put("/targets", async (c) => {
    const user = c.get("user");
    if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const { date, ...values } = body;

    if (!date || typeof date !== "string") {
        return c.json({ error: "date is required" }, 400);
    }

    const target = await TargetValuesModel.findOneAndUpdate(
        { userId: user.id, date },
        { $set: { ...values, userId: user.id, date } },
        { upsert: true, new: true },
    );

    return c.json({ target });
});

export { targetRoutes };
