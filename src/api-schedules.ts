import { Hono } from "hono";
import { Temporal } from "temporal-polyfill";
import { getRides, getWellness, ICUActivity } from "./intervals-api";
import { pruneActivityFields, pruneWellnessFields } from "./intervals-transformers";
import { addDays, getToday } from "./days";
import { computeScheduleFromRides } from "./schedule";
import { calculateCogganPowerZones } from "./training";
import { intervalLengths } from "./training-definitions";
import { auth } from "./auth";

const scheduleRoutes = new Hono<{
    Variables: {
        user: typeof auth.$Infer.Session.user | null;
        session: typeof auth.$Infer.Session.session | null;
    };
}>();

scheduleRoutes.get("/schedule", async (c) => {
    const user = c.get("user");
    if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
    }

    const willRideToday = c.req.query("willRideToday") !== "false";
    const daysBack = Number(c.req.query("daysBack") ?? 7);
    const daysForward = Number(c.req.query("daysForward") ?? 10);

    const seasonStart = new Temporal.PlainDate(getToday().year, 1, 1);
    const rawRides = await getRides(seasonStart);

    const currentFtp = rawRides[0].icu_ftp;
    const powerZones = calculateCogganPowerZones(currentFtp);
    const prune = (record: ICUActivity) => pruneActivityFields(record, powerZones, intervalLengths);

    const rides = rawRides.map(prune);
    const rawWellness = await getWellness();
    const wellness = rawWellness.map(pruneWellnessFields);

    const today = getToday();
    const tomorrow = addDays(today, 1);
    const rideToday = rides.find(x => x.date === today.toString());
    const startDT = (rideToday || !willRideToday) ? tomorrow : today;

    const schedules = computeScheduleFromRides(
        rides,
        wellness,
        startDT,
        today,
        willRideToday,
        daysBack,
        daysForward
    );

    return c.json({ schedules, ftp: currentFtp });
});

export { scheduleRoutes };
