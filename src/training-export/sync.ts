import { Temporal } from 'temporal-polyfill';
import type { ExportSource } from './source';
import type { ExportTarget } from './target';
import { stableJson } from './target';
import { normalizeActivity, normalizeAthlete, normalizePowerCurves, normalizeWellness, validDate, validId } from './normalize';
import {
    SCHEMA_VERSION, POWER_DURATIONS_SECONDS, ActivityIndex, ActivityIndexEntry, ActivityDetail,
    WellnessExport, FitnessExport, PowerCurvesExport, SyncState, Manifest,
} from './schema';

export interface SyncOptions {
    days?: number;
    activity?: string;
    full?: boolean;
    /** Injectable clock for deterministic tests. Calendar dates follow the athlete's timezone. */
    today?: string;
    progress?: (message: string) => void;
}

const FIRST_DATE = '2023-01-01';
const STATE_PATH = '.sync-state.json';
const files = {
    athlete: 'athlete.json', activityIndex: 'activity-index.json', wellness: 'wellness.json',
    fitness: 'fitness.json', powerCurves: 'power-curves.json',
};
const addDays = (date: string, days: number) => Temporal.PlainDate.from(date).add({ days }).toString();
const inRange = (date: string, from: string, through: string) => date >= from && date <= through;
const supported = (type: string | undefined) => type === 'Ride' || type === 'VirtualRide';
const sortActivities = <T extends { date: string; id: string }>(rows: T[]) =>
    rows.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

function envelope(value: unknown, label: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        (value as { schemaVersion?: unknown }).schemaVersion !== SCHEMA_VERSION) {
        throw new Error(`Invalid or unsupported ${label}; use a new destination or rebuild supported data`);
    }
    stableJson(value); // Also reject credentials/non-JSON values in local input before merging.
    return value as Record<string, unknown>;
}

function rows<T>(value: unknown, key: string, validate: (row: Record<string, unknown>) => void): T[] {
    const data = envelope(value, key)[key];
    if (!Array.isArray(data)) throw new Error(`Invalid exported ${key}`);
    for (const row of data) {
        if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error(`Invalid exported ${key} row`);
        validate(row);
    }
    return data as T[];
}

function unique<T>(values: T[], key: (value: T) => string): void {
    if (new Set(values.map(key)).size !== values.length) throw new Error('Source/export contains duplicate identities');
}

export async function syncTrainingData(source: ExportSource, target: ExportTarget, options: SyncOptions = {}): Promise<Manifest> {
    if ([options.days !== undefined, options.activity !== undefined, options.full === true].filter(Boolean).length > 1) {
        throw new Error('Use only one of --days, --activity or --full');
    }
    if (options.days !== undefined && (!Number.isSafeInteger(options.days) || options.days < 1)) throw new Error('--days must be a positive integer');
    if (options.activity !== undefined) validId(options.activity);

    return target.withLock(async () => {
        const athlete = normalizeAthlete(await source.getAthlete());
        const today = validDate(options.today ?? Temporal.Now.plainDateISO(athlete.timezone ?? 'UTC').toString());
        const rawState = await target.readJson(STATE_PATH);
        let state: SyncState | undefined;
        if (rawState !== undefined) {
            const parsed = envelope(rawState, 'sync state');
            validId(parsed.athleteId);
            if (parsed.athleteId !== athlete.id) throw new Error('Destination belongs to a different athlete; choose another directory');
            if (parsed.historyStartDate !== undefined) validDate(parsed.historyStartDate);
            if (parsed.throughDate !== undefined) validDate(parsed.throughDate);
            if ((parsed.historyStartDate === undefined) !== (parsed.throughDate === undefined) ||
                (typeof parsed.historyStartDate === 'string' && typeof parsed.throughDate === 'string' && parsed.historyStartDate > parsed.throughDate)) {
                throw new Error('Invalid sync coverage');
            }
            state = parsed as unknown as SyncState;
        }
        const oldIndex = await target.readJson(files.activityIndex);
        const oldWellness = await target.readJson(files.wellness);
        const oldFitness = await target.readJson(files.fitness);
        const oldCurves = await target.readJson(files.powerCurves);
        // Interrupted first runs have no checkpoint. Re-fetch all history unless an explicit limited mode was requested.
        if (state && !options.full && [oldIndex, oldWellness, oldFitness, oldCurves].some(v => v === undefined)) {
            throw new Error('An export file is missing; run --full to rebuild');
        }
        const previousActivities: ActivityIndexEntry[] = oldIndex === undefined ? [] : rows(oldIndex, 'activities', row => {
            validId(row.id); validDate(row.date);
            if (row.detailPath !== `activities/${row.id}.json`) throw new Error('Invalid activity detail path');
        });
        const previousWellness: WellnessExport['days'] = options.full || oldWellness === undefined ? [] : rows(oldWellness, 'days', row => { validDate(row.date); });
        const previousFitness: FitnessExport['days'] = options.full || oldFitness === undefined ? [] : rows(oldFitness, 'days', row => { validDate(row.date); });
        const previousCurves: PowerCurvesExport['curves'] = options.full || oldCurves === undefined ? [] : rows(oldCurves, 'curves', row => {
            validId(row.id); validDate(row.date);
            if (!Array.isArray(row.bestWatts) || row.bestWatts.length !== POWER_DURATIONS_SECONDS.length) throw new Error('Invalid exported power curve');
        });
        if (!options.full && oldCurves !== undefined && stableJson(envelope(oldCurves, 'power curves').durationsSeconds) !== stableJson(POWER_DURATIONS_SECONDS)) {
            throw new Error('Power durations changed; run --full');
        }
        unique(previousActivities, row => row.id);

        let oldest = options.full ? FIRST_DATE : options.days !== undefined ? addDays(today, 1 - options.days)
            : state?.throughDate ? addDays(state.throughDate < today ? state.throughDate : today, -6) : FIRST_DATE;
        let newest = today;
        let rawActivities;
        if (options.activity) {
            const detail = await source.getActivity(options.activity);
            if (!supported(detail.type)) throw new Error('Only Ride and VirtualRide activities are supported');
            const normalized = normalizeActivity(detail);
            oldest = newest = normalized.index.date;
            rawActivities = [detail];
        } else {
            options.progress?.(`Fetching activities from ${oldest} through ${newest}`);
            const summaries = await source.getActivities(oldest, newest);
            unique(summaries, row => validId(row.id));
            rawActivities = [];
            for (const [i, summary] of summaries.entries()) {
                if (!supported(summary.type)) continue;
                validId(summary.id);
                const detail = await source.getActivity(summary.id!);
                if (detail.id !== summary.id) throw new Error('Activity identity changed during sync');
                if (!supported(detail.type)) continue;
                rawActivities.push(detail);
                if (i % 25 === 0) options.progress?.(`Fetched ${i + 1} of ${summaries.length} activity details`);
            }
        }

        // Complete all network operations before mutating the published export.
        const events = await source.getPlannedWorkouts(oldest, newest);
        const plans = new Map(events.map(event => [event.id, event]));
        const rawWellness = await source.getWellness(oldest, newest);
        const normalizedWellness = rawWellness.map(normalizeWellness).filter(row => inRange(row.wellness.date, oldest, newest));
        unique(normalizedWellness, row => row.wellness.date);
        const updates = rawActivities.map(raw => normalizeActivity(raw, plans.get(raw.paired_event_id)));
        unique(updates, row => row.index.id);
        const updatedIds = new Set(updates.map(row => row.index.id));
        const newCurves = normalizePowerCurves(await source.getPowerCurves(oldest, newest))
            .filter(curve => updatedIds.has(curve.id));
        unique(newCurves, curve => curve.id);
        const peaks = new Map(newCurves.map(curve => [curve.id, curve.bestWatts[0]]));
        for (const row of updates) {
            const peak = peaks.get(row.index.id);
            if (peak !== null && peak !== undefined) row.index.peak1SecondPowerWatts = peak;
        }

        const retained = options.full ? [] : previousActivities.filter(row => !updatedIds.has(row.id) &&
            (options.activity ? row.id !== options.activity : !inRange(row.date, oldest, newest)));
        const activities = sortActivities([...retained, ...updates.map(row => row.index)]);
        const ids = new Set(activities.map(row => row.id));
        const curves = sortActivities([
            ...previousCurves.filter(row => ids.has(row.id) && !updatedIds.has(row.id)), ...newCurves,
        ]);
        const mergeDays = <T extends { date: string }>(previous: T[], incoming: T[]): T[] =>
            [...previous.filter(row => !inRange(row.date, oldest, newest)), ...incoming].sort((a, b) => a.date.localeCompare(b.date));
        const wellness = mergeDays(previousWellness, normalizedWellness.map(row => row.wellness));
        const fitness = mergeDays(previousFitness, normalizedWellness.map(row => row.fitness));

        const nextState: SyncState = { schemaVersion: SCHEMA_VERSION, athleteId: athlete.id,
            historyStartDate: state?.historyStartDate, throughDate: state?.throughDate };
        if (!options.activity) {
            if (options.full || !state?.throughDate) {
                nextState.historyStartDate = oldest;
                nextState.throughDate = newest;
            } else if (oldest <= addDays(state.throughDate, 1) && newest >= state.historyStartDate!) {
                nextState.historyStartDate = oldest < state.historyStartDate! ? oldest : state.historyStartDate;
                nextState.throughDate = newest > state.throughDate ? newest : state.throughDate;
            }
            // A disconnected --days range must not skip an unrefreshed gap on the next normal run.
        }
        const manifest: Manifest = {
            schemaVersion: SCHEMA_VERSION, source: 'Intervals.icu', athleteId: athlete.id,
            activityTypes: ['Ride', 'VirtualRide'], activityCount: activities.length,
            coverage: { from: nextState.historyStartDate, through: nextState.throughDate }, files,
        };
        const documents: [string, unknown][] = [
            ...updates.map(row => [row.index.detailPath, row.detail] as [string, ActivityDetail]),
            [files.athlete, athlete],
            [files.activityIndex, { schemaVersion: SCHEMA_VERSION, activities } satisfies ActivityIndex],
            [files.wellness, { schemaVersion: SCHEMA_VERSION, days: wellness } satisfies WellnessExport],
            [files.fitness, { schemaVersion: SCHEMA_VERSION, days: fitness } satisfies FitnessExport],
            [files.powerCurves, { schemaVersion: SCHEMA_VERSION, durationsSeconds: POWER_DURATIONS_SECONDS, curves } satisfies PowerCurvesExport],
            ['manifest.json', manifest],
        ];
        // Fail before any writes if an accidental credential field is present in one of the documents.
        for (const [, document] of documents) stableJson(document);
        for (const [path, document] of documents) await target.writeJson(path, document);
        // This dedicated directory contains managed details only. Also clean up orphans from interrupted runs.
        const detailPaths = new Set(activities.map(row => row.detailPath));
        for (const path of await target.listJson('activities')) if (!detailPaths.has(path)) await target.remove(path);
        await target.writeJson(STATE_PATH, nextState);
        options.progress?.(`Exported ${activities.length} activities; refreshed ${updates.length}`);
        return manifest;
    });
}
