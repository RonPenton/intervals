import { query } from './connection';
import { sql } from './sql-loader';
import { Activity, Wellness } from '../intervals-transformers';
import { ScheduleRecord } from '../schedule';

// ──────────────────────────── Activities ────────────────────────────

export async function upsertActivity(activity: Activity, rawJson?: object): Promise<void> {
    await query(
        sql('upsert-activity'),
        [
            activity.date, activity.currentFtp, activity.trainingLoad,
            activity.kj, activity.normalizedWatts, activity.miles,
            activity.duration, activity.hours, activity.elevation,
            activity.mph, activity.calories, activity.temperature,
            activity.intensityFactor, activity.fatigue, activity.fitness,
            activity.zone, rawJson ? JSON.stringify(rawJson) : null
        ]
    );
}

export async function upsertActivities(activities: Activity[], rawActivities?: object[]): Promise<void> {
    for (let i = 0; i < activities.length; i++) {
        await upsertActivity(activities[i], rawActivities?.[i]);
    }
}

export async function getActivities(oldest?: string): Promise<Activity[]> {
    const rows = oldest
        ? await query(sql('get-activities-since'), [oldest])
        : await query(sql('get-activities'));

    return rows.map(mapRowToActivity);
}

function mapRowToActivity(row: any): Activity {
    return {
        currentFtp: row.current_ftp,
        trainingLoad: row.training_load,
        kj: row.kj,
        normalizedWatts: row.normalized_watts,
        miles: row.miles,
        duration: row.duration,
        hours: row.hours,
        elevation: row.elevation,
        mph: row.mph,
        calories: row.calories,
        temperature: row.temperature,
        date: typeof row.date === 'string' ? row.date : row.date.toISOString().split('T')[0],
        intensityFactor: row.intensity_factor,
        fatigue: row.fatigue,
        fitness: row.fitness,
        zone: row.zone,
    };
}

// ──────────────────────────── Wellness ──────────────────────────────

export async function upsertWellness(w: Wellness, rawJson?: object): Promise<void> {
    await query(
        sql('upsert-wellness'),
        [
            w.date, w.fitness, w.fatigue,
            w.fitnessLoad, w.fatigueLoad, w.rampRate,
            rawJson ? JSON.stringify(rawJson) : null
        ]
    );
}

export async function upsertWellnessBatch(records: Wellness[], rawRecords?: object[]): Promise<void> {
    for (let i = 0; i < records.length; i++) {
        await upsertWellness(records[i], rawRecords?.[i]);
    }
}

export async function getWellnessRecords(oldest?: string): Promise<Wellness[]> {
    const rows = oldest
        ? await query(sql('get-wellness-since'), [oldest])
        : await query(sql('get-wellness'));

    return rows.map(mapRowToWellness);
}

function mapRowToWellness(row: any): Wellness {
    return {
        date: typeof row.date === 'string' ? row.date : row.date.toISOString().split('T')[0],
        fitness: row.fitness,
        fatigue: row.fatigue,
        fitnessLoad: row.fitness_load,
        fatigueLoad: row.fatigue_load,
        rampRate: row.ramp_rate,
    };
}

// ──────────────────────────── Schedules ─────────────────────────────

export async function upsertSchedule(s: ScheduleRecord): Promise<void> {
    await query(
        sql('upsert-schedule'),
        [
            s.date, s.offset, s.fitness ?? null, s.fatigue ?? null,
            s.form ?? null, s.trainingLoad ?? null,
            s.needsRide ?? null, s.zone ?? null,
            s.rideOptions ? JSON.stringify(s.rideOptions) : null,
            null
        ]
    );
}

export async function upsertSchedules(schedules: ScheduleRecord[]): Promise<void> {
    for (const s of schedules) {
        await upsertSchedule(s);
    }
}

export async function getSchedules(oldest?: string): Promise<ScheduleRecord[]> {
    const rows = oldest
        ? await query(sql('get-schedules-since'), [oldest])
        : await query(sql('get-schedules'));

    return rows.map(mapRowToSchedule);
}

function mapRowToSchedule(row: any): ScheduleRecord {
    return {
        offset: row.offset_days,
        date: typeof row.date === 'string' ? row.date : row.date.toISOString().split('T')[0],
        fitness: row.fitness,
        fatigue: row.fatigue,
        form: row.form,
        trainingLoad: row.training_load,
        needsRide: row.needs_ride,
        zone: row.zone,
        rideOptions: row.ride_options,
    };
}
