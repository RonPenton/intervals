import { query } from './connection';
import { Activity, Wellness } from '../intervals-transformers';
import { ScheduleRecord } from '../schedule';

// ──────────────────────────── Activities ────────────────────────────

export async function upsertActivity(activity: Activity, rawJson?: object): Promise<void> {
    await query(
        `INSERT INTO activities
            (date, current_ftp, training_load, kj, normalized_watts,
             miles, duration, hours, elevation, mph, calories,
             temperature, intensity_factor, fatigue, fitness, zone, raw_json)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         ON CONFLICT (date) DO UPDATE SET
            current_ftp      = EXCLUDED.current_ftp,
            training_load    = EXCLUDED.training_load,
            kj               = EXCLUDED.kj,
            normalized_watts = EXCLUDED.normalized_watts,
            miles            = EXCLUDED.miles,
            duration         = EXCLUDED.duration,
            hours            = EXCLUDED.hours,
            elevation        = EXCLUDED.elevation,
            mph              = EXCLUDED.mph,
            calories         = EXCLUDED.calories,
            temperature      = EXCLUDED.temperature,
            intensity_factor = EXCLUDED.intensity_factor,
            fatigue          = EXCLUDED.fatigue,
            fitness          = EXCLUDED.fitness,
            zone             = EXCLUDED.zone,
            raw_json         = EXCLUDED.raw_json`,
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
        ? await query('SELECT * FROM activities WHERE date >= $1 ORDER BY date DESC', [oldest])
        : await query('SELECT * FROM activities ORDER BY date DESC');

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
        `INSERT INTO wellness
            (date, fitness, fatigue, fitness_load, fatigue_load, ramp_rate, raw_json)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (date) DO UPDATE SET
            fitness      = EXCLUDED.fitness,
            fatigue      = EXCLUDED.fatigue,
            fitness_load = EXCLUDED.fitness_load,
            fatigue_load = EXCLUDED.fatigue_load,
            ramp_rate    = EXCLUDED.ramp_rate,
            raw_json     = EXCLUDED.raw_json`,
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
        ? await query('SELECT * FROM wellness WHERE date >= $1 ORDER BY date DESC', [oldest])
        : await query('SELECT * FROM wellness ORDER BY date DESC');

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
        `INSERT INTO schedules
            (date, offset_days, fitness, fatigue, form, training_load,
             needs_ride, zone, ride_options, meta)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (date) DO UPDATE SET
            offset_days   = EXCLUDED.offset_days,
            fitness       = EXCLUDED.fitness,
            fatigue       = EXCLUDED.fatigue,
            form          = EXCLUDED.form,
            training_load = EXCLUDED.training_load,
            needs_ride    = EXCLUDED.needs_ride,
            zone          = EXCLUDED.zone,
            ride_options  = EXCLUDED.ride_options,
            meta          = EXCLUDED.meta`,
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
        ? await query('SELECT * FROM schedules WHERE date >= $1 ORDER BY date ASC', [oldest])
        : await query('SELECT * FROM schedules ORDER BY date ASC');

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
