import { Hono } from "hono";
import { Temporal } from "temporal-polyfill";
import { getRides, getWellness, ICUActivity } from "./intervals-api";
import { pruneActivityFields, pruneWellnessFields } from "./intervals-transformers";
import { addDays, getToday } from "./days";
import { computeScheduleFromRides, computeTrainingLoads } from "./schedule";
import { calculateCogganPowerZones } from "./training";
import { intervalLengths } from "./training-definitions";
import { auth } from "./auth";
import { TargetValuesModel } from "./db";
import type { CurrentIntervalProgressions } from "./types";

const currentIntervalProgressions: CurrentIntervalProgressions = [
    { zone: 3.2, progression: [6, 20] },
    { zone: 3.5, progression: [2, 30] },
    { zone: 3.6, progression: [3, 15] },
    { zone: 4,   progression: [3, 12] },
    { zone: 5,   progression: [4, 5]  },
    { zone: 6,   progression: [2, 0.5] },
];

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

    const lastDate = schedules[schedules.length - 1]?.date ?? today.toString();
    const savedTargets = await TargetValuesModel.find({
        userId: user.id,
        date: { $gte: today.toString(), $lte: lastDate },
    });

    for (const target of savedTargets) {
        const record = schedules.find(s => s.date === target.date);
        if (!record || !record.needsRide) continue;
        const { date, userId, _id, __v, createdAt, updatedAt, ...values } = target.toObject();
        Object.assign(record, values);
    }

    computeTrainingLoads(schedules, currentFtp, currentIntervalProgressions);

    return c.json({ schedules, ftp: currentFtp });
});

export { scheduleRoutes };
