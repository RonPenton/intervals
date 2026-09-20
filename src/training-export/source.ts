import { Temporal } from 'temporal-polyfill';
import { getRides, getPlannedWorkouts } from '../intervals-api';
import type { components, paths } from '../intervals-api-schema';
import { POWER_DURATIONS_SECONDS } from './schema';
import { validDate, validId } from './normalize';
import { DEFAULT_REQUEST_DELAY_MS, RequestThrottle } from './throttle';

type Api = components['schemas'];

/** The request logger has already printed the diagnostic; the CLI only needs to set its exit status. */
export class LoggedRequestError extends Error {}

class HttpFailure extends LoggedRequestError {
    constructor(readonly status: number, readonly retryDelayMs?: number) {
        super(`Intervals request failed (HTTP ${status}); retry the export later`);
    }
}

function failureReason(error: unknown): string {
    if (error instanceof HttpFailure) return `HTTP ${error.status}`;
    if (error instanceof SyntaxError) return 'Invalid JSON response';
    if (error instanceof Error) {
        if (error.name === 'TimeoutError' || error.name === 'AbortError') return 'Request timed out or was aborted';
        // Only our fixed validation messages are safe to print; native JSON/fetch errors may include payloads.
        const safeMessages = [
            'Invalid Intervals response', 'Invalid source identifier', 'Invalid ISO date',
            'Athlete profile did not resolve the owner ID',
            'Activity is hidden or missing required fields', 'Invalid interval data',
            'Activity identity does not match request', 'Invalid wellness response',
            'Invalid planned-workout response', 'Invalid power-curve response', 'Invalid power-curve alignment',
            'Invalid power-curve samples',
            'INTERVALS_API_KEY is required',
        ];
        if (safeMessages.includes(error.message)) return error.message;
        const cause = 'cause' in error ? error.cause : undefined;
        const code = cause && typeof cause === 'object' && 'code' in cause ? cause.code : undefined;
        if (typeof code === 'string' && ['ENOTFOUND', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT',
            'EAI_AGAIN', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET'].includes(code)) return `Network failure (${code})`;
    }
    return 'Request or response processing failed (HTTP status unavailable)';
}
export interface ExportSource {
    getAthlete(): Promise<Api['WithSportSettings']>;
    getActivities(oldest: string, newest: string): Promise<Api['Activity'][]>;
    getActivity(id: string): Promise<Api['ActivityWithIntervals']>;
    getWellness(oldest: string, newest: string): Promise<Api['Wellness'][]>;
    getPlannedWorkouts(oldest: string, newest: string): Promise<Api['Event'][]>;
    getPowerCurves(oldest: string, newest: string): Promise<Api['ActivityPowerCurvePayload']>;
}

function object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid Intervals response');
    return value as Record<string, unknown>;
}

function activity(value: unknown): Api['ActivityWithIntervals'] {
    const raw = object(value);
    validId(raw.id);
    if (typeof raw.type !== 'string' || typeof raw.start_date_local !== 'string') {
        throw new Error('Activity is hidden or missing required fields');
    }
    if (raw.icu_intervals != null && !Array.isArray(raw.icu_intervals)) throw new Error('Invalid interval data');
    return raw as Api['ActivityWithIntervals'];
}

/** Adds only missing read endpoints. Existing client, credentials and generated types remain authoritative. */
export class IntervalsExportSource implements ExportSource {
    private readonly throttle: RequestThrottle;
    private resolvedAthleteId?: string;
    constructor(private readonly athleteId = '0', requestDelayMs = DEFAULT_REQUEST_DELAY_MS,
        private readonly logFailure: (message: string) => void = message => console.error(message)) {
        validId(athleteId);
        this.throttle = new RequestThrottle(requestDelayMs);
    }

    private request<T>(work: () => Promise<T>): Promise<T> {
        if (!process.env.INTERVALS_API_KEY) throw new Error('INTERVALS_API_KEY is required');
        return this.throttle.run(work);
    }

    private async diagnose<T>(path: string, query: Record<string, string>, work: () => Promise<T>,
        attempt = 1, maxAttempts = 1): Promise<T> {
        const started = performance.now();
        try { return await work(); }
        catch (error) {
            const safeQuery = Object.fromEntries(Object.entries(query).filter(([key]) =>
                ['oldest', 'newest', 'intervals', 'secs', 'type', 'category'].includes(key)));
            const search = new URLSearchParams(safeQuery).toString();
            const retry = error instanceof HttpFailure && error.retryDelayMs !== undefined
                ? `; retry queued after ${Math.ceil(error.retryDelayMs)} ms (throttle also applies)` : '; no retry';
            let message = `[Intervals export] GET ${path}${search ? `?${search}` : ''} | attempt ${attempt}/${maxAttempts}` +
                ` | ${failureReason(error)} | ${Math.round(performance.now() - started)} ms${retry}`;
            const key = process.env.INTERVALS_API_KEY;
            if (key) for (const secret of [key, Buffer.from(`API_KEY:${key}`).toString('base64')]) {
                message = message.split(secret).join('[redacted]');
            }
            this.logFailure(message);
            // Preserve retry metadata; replace other errors so CLI output cannot leak JSON/error snippets.
            if (error instanceof HttpFailure) throw error;
            throw new LoggedRequestError(message);
        }
    }

    private async get<T>(path: string, query: Record<string, string>, validate: (raw: unknown) => T): Promise<T> {
        const url = new URL(`https://intervals.icu${path}`);
        url.search = new URLSearchParams(query).toString();
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                return await this.request(() => this.diagnose(path, query, async () => {
                    const response = await fetch(url, {
                        headers: {
                            Authorization: `Basic ${Buffer.from(`API_KEY:${process.env.INTERVALS_API_KEY}`).toString('base64')}`,
                            Accept: 'application/json',
                        },
                        signal: AbortSignal.timeout(30_000),
                    });
                    if (response.ok) return validate(await response.json() as unknown);
                    // Never expose error bodies: profile/API responses can contain credentials.
                    await response.body?.cancel();
                    if ((response.status === 429 || response.status >= 500) && attempt < 2) {
                        const retryAfter = response.headers.get('Retry-After');
                        const seconds = retryAfter === null ? NaN : Number(retryAfter);
                        const delay = retryAfter === null ? 500 * 2 ** attempt
                            : Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter) - Date.now();
                        if (Number.isFinite(delay) && delay <= 10_000) {
                            this.throttle.defer(Math.max(0, delay));
                            throw new HttpFailure(response.status, Math.max(0, delay));
                        }
                    }
                    throw new HttpFailure(response.status);
                }, attempt + 1, 3));
            } catch (error) {
                if (!(error instanceof HttpFailure) || error.retryDelayMs === undefined) throw error;
            }
        }
        throw new Error('Intervals request failed');
    }

    async getAthlete(): Promise<Api['WithSportSettings']> {
        return this.get(`/api/v1/athlete/${this.athleteId}`, {}, value => {
            const raw = object(value);
            const id = validId(raw.id);
            if (id === '0') throw new Error('Athlete profile did not resolve the owner ID');
            this.resolvedAthleteId = id;
            return raw as Api['WithSportSettings'];
        });
    }

    async getActivities(oldest: string, newest: string): Promise<Api['Activity'][]> {
        validDate(oldest); validDate(newest);
        // This existing wrapper logs upstream failures; no response or error object is written to the export.
        return this.request(() => this.diagnose(`/api/v1/athlete/${this.athleteId}/activities`, { oldest }, async () => {
            const rides = await getRides(Temporal.PlainDate.from(oldest), this.athleteId);
            return rides.map(activity).filter(a => a.start_date_local!.slice(0, 10) >= oldest && a.start_date_local!.slice(0, 10) <= newest);
        }));
    }

    async getActivity(id: string): Promise<Api['ActivityWithIntervals']> {
        validId(id);
        return this.get(`/api/v1/activity/${id}`, { intervals: 'true' }, value => {
            const raw = activity(value);
            if (raw.id !== id) throw new Error('Activity identity does not match request');
            return raw;
        });
    }

    async getWellness(oldest: string, newest: string): Promise<Api['Wellness'][]> {
        validDate(oldest); validDate(newest);
        type Query = NonNullable<paths['/api/v1/athlete/{id}/wellness{ext}']['get']['parameters']['query']>;
        const query = { oldest, newest } satisfies Query;
        return this.get(`/api/v1/athlete/${this.athleteId}/wellness`, query, raw => {
            if (!Array.isArray(raw)) throw new Error('Invalid wellness response');
            return raw.map(row => { validDate(object(row).id); return row as Api['Wellness']; });
        });
    }

    async getPlannedWorkouts(oldest: string, newest: string): Promise<Api['Event'][]> {
        validDate(oldest); validDate(newest);
        return this.request(() => this.diagnose(`/api/v1/athlete/${this.athleteId}/events`, { oldest, newest, category: 'WORKOUT' }, async () => {
            const events = await getPlannedWorkouts(Temporal.PlainDate.from(oldest), Temporal.PlainDate.from(newest), this.athleteId);
            if (!Array.isArray(events)) throw new Error('Invalid planned-workout response');
            return events;
        }));
    }

    async getPowerCurves(oldest: string, newest: string): Promise<Api['ActivityPowerCurvePayload']> {
        validDate(oldest); validDate(newest);
        // This endpoint returns 403 for the owner alias 0 even when /athlete/0 succeeds.
        // Normal sync already fetched the profile; standalone callers resolve it once here.
        let athleteId = this.athleteId;
        if (athleteId === '0') {
            if (!this.resolvedAthleteId) await this.getAthlete();
            athleteId = this.resolvedAthleteId!;
        }
        type Query = paths['/api/v1/athlete/{id}/activity-power-curves{ext}']['get']['parameters']['query'];
        const query = { oldest, newest: `${newest}T23:59:59`, secs: POWER_DURATIONS_SECONDS, type: 'Ride' } satisfies Query;
        return this.get(`/api/v1/athlete/${athleteId}/activity-power-curves`, {
            ...query, secs: query.secs.join(','),
        }, value => {
            const raw = object(value);
            if (!Array.isArray(raw.secs) || !raw.secs.every(s => typeof s === 'number' && Number.isSafeInteger(s) && s > 0) ||
                new Set(raw.secs).size !== raw.secs.length ||
                !Array.isArray(raw.curves)) throw new Error('Invalid power-curve response');
            for (const curve of raw.curves) {
                const row = object(curve);
                validId(row.id);
                // Short rides omit trailing durations beyond their available data. Samples still
                // align to the prefix of secs; normalization fills unavailable durations with null.
                if (!Array.isArray(row.watts) || row.watts.length > raw.secs.length) throw new Error('Invalid power-curve alignment');
                if (!row.watts.every(watts => watts === null || (typeof watts === 'number' && Number.isFinite(watts)))) {
                    throw new Error('Invalid power-curve samples');
                }
            }
            return raw as Api['ActivityPowerCurvePayload'];
        });
    }
}
