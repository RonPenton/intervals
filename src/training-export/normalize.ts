import { Temporal } from 'temporal-polyfill';
import type { components } from '../intervals-api-schema';
import {
    SCHEMA_VERSION, POWER_DURATIONS_SECONDS,
    ActivityIndexEntry, ActivityDetail, ExportInterval, AthleteExport,
    WellnessEntry, FitnessEntry, PowerCurveEntry, PlannedStep,
} from './schema';

type Api = components['schemas'];
export const finite = (value: unknown): number | undefined =>
    typeof value === 'number' && Number.isFinite(value) ? value : undefined;
const text = (value: unknown): string | undefined => typeof value === 'string' ? value : undefined;
const strings = (value: unknown): string[] => Array.isArray(value)
    ? [...new Set(value.filter((v): v is string => typeof v === 'string'))].sort() : [];
const record = (value: unknown): Record<string, unknown> =>
    value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

export function validId(value: unknown): string {
    if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid source identifier');
    return value;
}

export function validDate(value: unknown): string {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Invalid ISO date');
    if (Temporal.PlainDate.from(value).toString() !== value) throw new Error('Invalid ISO date');
    return value;
}

function localTimestamp(value: unknown): string {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        throw new Error('Activity has no valid local timestamp');
    }
    Temporal.PlainDateTime.from(value);
    validDate(value.slice(0, 10));
    return value;
}

function interval(raw: Api['Interval']): ExportInterval {
    const start = finite(raw.start_time);
    const end = finite(raw.end_time);
    return {
        id: finite(raw.id),
        kind: raw.type === 'WORK' ? 'work' : raw.type === 'RECOVERY' ? 'recovery' : 'unknown',
        label: text(raw.label),
        startSeconds: start, endSeconds: end,
        durationSeconds: finite(raw.elapsed_time) ?? (start !== undefined && end !== undefined && end >= start ? end - start : undefined),
        movingTimeSeconds: finite(raw.moving_time),
        averagePowerWatts: finite(raw.average_watts), maxPowerWatts: finite(raw.max_watts),
        weightedPowerWatts: finite(raw.weighted_average_watts),
        averageHeartRateBpm: finite(raw.average_heartrate), maxHeartRateBpm: finite(raw.max_heartrate),
        averageCadenceRpm: finite(raw.average_cadence), distanceMeters: finite(raw.distance),
        elevationGainMeters: finite(raw.total_elevation_gain), zone: finite(raw.zone),
        zoneMinWatts: finite(raw.zone_min_watts), zoneMaxWatts: finite(raw.zone_max_watts),
        intensityPercent: finite(raw.intensity), trainingLoad: finite(raw.training_load),
        workJoules: finite(raw.joules), wPrimeBalanceStartJoules: finite(raw.wbal_start),
        wPrimeBalanceEndJoules: finite(raw.wbal_end),
    };
}

/** Original targets keep their units; never resolve historical steps against today's FTP. */
function plannedSteps(value: unknown, depth = 0): PlannedStep[] {
    if (!Array.isArray(value) || depth > 12) return [];
    return value.map(item => {
        const step = record(item);
        const power = record(step.power);
        const units = power.units;
        return {
            durationSeconds: finite(step.duration), distanceMeters: finite(step.distance),
            repetitions: finite(step.reps),
            powerTarget: units === '%ftp' || units === 'w' || units === 'power_zone'
                ? { units, value: finite(power.value), start: finite(power.start), end: finite(power.end) } : undefined,
            steps: Array.isArray(step.steps) ? plannedSteps(step.steps, depth + 1) : undefined,
        };
    });
}

export function normalizeActivity(raw: Api['ActivityWithIntervals'], planned?: Api['Event']): {
    index: ActivityIndexEntry; detail: ActivityDetail;
} {
    const id = validId(raw.id);
    const startTimeLocal = localTimestamp(raw.start_date_local);
    if (typeof raw.type !== 'string' || !raw.type) throw new Error('Activity has no type');
    const intervals = (raw.icu_intervals ?? []).map(interval).sort((a, b) =>
        (a.startSeconds ?? Infinity) - (b.startSeconds ?? Infinity) || (a.id ?? 0) - (b.id ?? 0));
    const index: ActivityIndexEntry = {
        id, date: startTimeLocal.slice(0, 10), startTimeLocal,
        startTimeUtc: raw.start_date ? Temporal.Instant.from(raw.start_date).toString() : undefined,
        type: raw.type, name: text(raw.name),
        durationSeconds: finite(raw.elapsed_time), movingTimeSeconds: finite(raw.moving_time),
        distanceMeters: finite(raw.distance), elevationGainMeters: finite(raw.total_elevation_gain),
        averageHeartRateBpm: finite(raw.average_heartrate), maxHeartRateBpm: finite(raw.max_heartrate),
        averagePowerWatts: finite(raw.icu_average_watts), weightedPowerWatts: finite(raw.icu_weighted_avg_watts),
        averageCadenceRpm: finite(raw.average_cadence), trainingLoad: finite(raw.icu_training_load),
        intensityPercent: finite(raw.icu_intensity), ftpWatts: finite(raw.icu_ftp),
        rollingEftpWatts: finite(raw.icu_rolling_ftp), caloriesKcal: finite(raw.calories),
        tags: strings(raw.tags), hasIntervals: intervals.length > 0, detailPath: `activities/${id}.json`,
    };
    const pairedEventId = finite(raw.paired_event_id);
    const detail: ActivityDetail = {
        schemaVersion: SCHEMA_VERSION, id, intervals, pairedEventId,
        workJoules: finite(raw.icu_joules), workAboveFtpJoules: finite(raw.icu_joules_above_ftp),
        activityEftpWatts: finite(raw.icu_pm_ftp), weightKg: finite(raw.icu_weight),
        averageSpeedMetersPerSecond: finite(raw.average_speed), temperatureCelsius: finite(raw.average_temp),
        perceivedExertion: finite(raw.icu_rpe) ?? finite(raw.perceived_exertion), lapCount: finite(raw.icu_lap_count),
        powerIgnored: typeof raw.icu_ignore_power === 'boolean' ? raw.icu_ignore_power : undefined,
        heartRateIgnored: typeof raw.icu_ignore_hr === 'boolean' ? raw.icu_ignore_hr : undefined,
        powerZoneTimes: (raw.icu_zone_times ?? []).flatMap(zone =>
            typeof zone.id === 'string' && finite(zone.secs) !== undefined ? [{ zone: zone.id, durationSeconds: zone.secs! }] : [])
            .sort((a, b) => a.zone.localeCompare(b.zone)),
        heartRateZoneTimesSeconds: Array.isArray(raw.icu_hr_zone_times) && raw.icu_hr_zone_times.every(v => finite(v) !== undefined)
            ? [...raw.icu_hr_zone_times] : undefined,
    };
    if (pairedEventId !== undefined && planned?.id === pairedEventId) {
        detail.plannedWorkout = {
            id: pairedEventId, name: text(planned.name), durationSeconds: finite(planned.moving_time),
            trainingLoad: finite(planned.icu_training_load), ftpWatts: finite(planned.icu_ftp),
            steps: plannedSteps(record(planned.workout_doc).steps),
        };
    }
    return { index, detail };
}

export function normalizeAthlete(raw: Api['WithSportSettings']): AthleteExport {
    return {
        schemaVersion: SCHEMA_VERSION, id: validId(raw.id), timezone: text(raw.timezone),
        weightKg: finite(raw.icu_weight) ?? finite(raw.weight), restingHeartRateBpm: finite(raw.icu_resting_hr),
        sportSettings: (raw.sportSettings ?? []).map(s => ({
            types: strings(s.types), ftpWatts: finite(s.ftp), indoorFtpWatts: finite(s.indoor_ftp),
            thresholdHeartRateBpm: finite(s.lthr), maxHeartRateBpm: finite(s.max_hr),
        })).sort((a, b) => a.types.join(',').localeCompare(b.types.join(','))),
    };
}

export function normalizeWellness(raw: Api['Wellness']): { wellness: WellnessEntry; fitness: FitnessEntry } {
    const date = validDate(raw.id);
    const ctl = finite(raw.ctl), atl = finite(raw.atl);
    return {
        wellness: {
            date, weightKg: finite(raw.weight), restingHeartRateBpm: finite(raw.restingHR),
            hrvRmssdMilliseconds: finite(raw.hrv), hrvSdnnMilliseconds: finite(raw.hrvSDNN),
            sleepSeconds: finite(raw.sleepSecs), sleepScore: finite(raw.sleepScore), sleepQuality: finite(raw.sleepQuality),
            averageSleepingHeartRateBpm: finite(raw.avgSleepingHR), fatigue: finite(raw.fatigue),
            soreness: finite(raw.soreness), stress: finite(raw.stress), mood: finite(raw.mood),
            motivation: finite(raw.motivation), readiness: finite(raw.readiness), caloriesConsumedKcal: finite(raw.kcalConsumed),
        },
        fitness: {
            date, ctl, atl, form: ctl !== undefined && atl !== undefined ? Number((ctl - atl).toFixed(6)) : undefined,
            ctlLoad: finite(raw.ctlLoad), atlLoad: finite(raw.atlLoad), rampRate: finite(raw.rampRate),
            sportEftp: (raw.sportInfo ?? []).flatMap(s => typeof s.type === 'string' && finite(s.eftp) !== undefined
                ? [{ type: s.type, eftpWatts: s.eftp! }] : []).sort((a, b) => a.type.localeCompare(b.type)),
        },
    };
}

export function normalizePowerCurves(raw: Api['ActivityPowerCurvePayload']): PowerCurveEntry[] {
    const seconds = raw.secs ?? [];
    return (raw.curves ?? []).map(curve => ({
        id: validId(curve.id), date: validDate(localTimestamp(curve.start_date_local).slice(0, 10)),
        weightKg: finite(curve.weight),
        bestWatts: POWER_DURATIONS_SECONDS.map(duration => {
            const i = seconds.indexOf(duration);
            const watts = i < 0 ? undefined : finite(curve.watts?.[i]);
            // The API can use negative values for unavailable durations. Never interpolate.
            return watts !== undefined && watts >= 0 ? watts : null;
        }),
    })).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}
