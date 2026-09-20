import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { components } from '../intervals-api-schema';
import { normalizeActivity, normalizeAthlete, normalizeWellness, normalizePowerCurves, validDate, validId } from './normalize';
import { POWER_DURATIONS_SECONDS } from './schema';
import { stableJson } from './target';

type Api = components['schemas'];
const ride: Api['ActivityWithIntervals'] = {
    id: 'i123', type: 'Ride', name: 'VO2', start_date_local: '2026-09-20T08:00:00',
    start_date: '2026-09-20T12:00:00Z', icu_ftp: 250, icu_average_watts: 200,
    icu_intensity: 80, moving_time: 3600, tags: ['VO2', 'structured', 'VO2'],
};

test('activity normalization preserves source units, identity, local time and deterministic tags', () => {
    const { index, detail } = normalizeActivity(ride);
    assert.equal(index.averagePowerWatts, 200);
    assert.equal(index.intensityPercent, 80);
    assert.equal(index.startTimeLocal, '2026-09-20T08:00:00');
    assert.equal(index.startTimeUtc, '2026-09-20T12:00:00Z');
    assert.equal(index.detailPath, 'activities/i123.json');
    assert.deepEqual(index.tags, ['VO2', 'structured']);
    assert.equal(detail.schemaVersion, 1);
    assert.equal(index.hasIntervals, false);
    assert.equal(stableJson(normalizeActivity(ride)), stableJson(normalizeActivity({ ...ride, tags: ['structured', 'VO2'] })));
});

test('null/missing/non-finite metrics stay absent and measured zero survives', () => {
    const raw = { id: 'i124', type: 'Ride', start_date_local: ride.start_date_local,
        icu_average_watts: null, average_heartrate: 125, calories: 0, distance: Infinity,
        icu_intervals: null } as unknown as Api['ActivityWithIntervals'];
    const data = JSON.parse(stableJson(normalizeActivity(raw)));
    assert.equal('averagePowerWatts' in data.index, false);
    assert.equal('distanceMeters' in data.index, false);
    assert.equal(data.index.averageHeartRateBpm, 125);
    assert.equal(data.index.caloriesKcal, 0);
    assert.deepEqual(data.detail.intervals, []);
});

test('intervals retain actual offsets, work/recovery and metrics without treating stream indexes as seconds', () => {
    const data = normalizeActivity({ ...ride, icu_intervals: [
        { id: 2, type: 'RECOVERY', start_time: 840, end_time: 960, average_watts: 100 },
        { id: 1, type: 'WORK', start_time: 600, end_time: 840, start_index: 42,
            average_watts: 320, max_watts: 380, average_heartrate: 170, average_cadence: 95, zone: 5 },
        { id: 3, start_index: 999, end_index: 1200 },
    ] });
    assert.equal(data.index.hasIntervals, true);
    assert.equal(data.detail.intervals[0].startSeconds, 600);
    assert.equal(data.detail.intervals[0].durationSeconds, 240);
    assert.equal(data.detail.intervals[0].averagePowerWatts, 320);
    assert.equal(data.detail.intervals[1].kind, 'recovery');
    assert.equal(data.detail.intervals[2].startSeconds, undefined);
    assert.equal(data.detail.intervals[2].kind, 'unknown');
});

test('only exactly paired plans are associated; step targets retain original units and repetition', () => {
    const event = { id: 7, name: '4 x 4', workout_doc: { steps: [
        { reps: 4, steps: [{ duration: 240, power: { units: '%ftp', value: 120, secret: 'never' } }] },
    ], token: 'never' } } as unknown as Api['Event'];
    const detail = normalizeActivity({ ...ride, paired_event_id: 7 }, event).detail;
    assert.equal(detail.plannedWorkout?.steps[0].repetitions, 4);
    assert.equal(detail.plannedWorkout?.steps[0].steps?.[0].powerTarget?.value, 120);
    assert.equal(stableJson(detail).includes('never'), false);
    assert.equal(normalizeActivity({ ...ride, paired_event_id: 8 }, event).detail.plannedWorkout, undefined);
});

test('profile and all nested data are whitelisted, including API credential-bearing responses', () => {
    const athlete = normalizeAthlete({ id: 'a1', timezone: 'America/New_York', icu_api_key: 'do-not-export',
        icu_friend_invite_token: 'invite-secret', email: 'private@example.test',
        sportSettings: [{ types: ['Ride'], ftp: 250 }] });
    const result = stableJson(athlete);
    for (const excluded of ['do-not-export', 'invite-secret', 'private@example.test', 'api_key', 'token']) {
        assert.equal(result.includes(excluded), false);
    }
    assert.equal(athlete.sportSettings[0].ftpWatts, 250);
});

test('wellness and fitness are separate, form is derived only with both source values', () => {
    const { wellness, fitness } = normalizeWellness({ id: '2026-09-20', weight: 70, hrv: 55, sleepSecs: 28000,
        ctl: 60, atl: 70, fatigue: 3, sportInfo: [{ type: 'Ride', eftp: 260 }] });
    assert.equal(wellness.hrvRmssdMilliseconds, 55);
    assert.equal(wellness.sleepSeconds, 28000);
    assert.equal(fitness.form, -10);
    assert.equal(fitness.sportEftp[0].eftpWatts, 260);
    assert.equal(normalizeWellness({ id: '2026-09-20', ctl: 0 }).fitness.form, undefined);
});

test('power samples align with returned durations, preserve zero and omit unavailable/negative values', () => {
    const curves = normalizePowerCurves({ secs: [240, 1, 5, 60], curves: [
        { id: 'i123', start_date_local: ride.start_date_local, watts: [320, 950, -1, 0], weight: 70 },
    ] });
    assert.equal(curves[0].bestWatts[POWER_DURATIONS_SECONDS.indexOf(240)], 320);
    assert.equal(curves[0].bestWatts[0], 950);
    assert.equal(curves[0].bestWatts[1], null);
    assert.equal(curves[0].bestWatts[POWER_DURATIONS_SECONDS.indexOf(60)], 0);
    assert.equal(curves[0].bestWatts[curves[0].bestWatts.length - 1], null);
});

test('identity, calendar dates and invalid timestamps are validated', () => {
    assert.throws(() => validId('../escape'));
    assert.throws(() => validDate('2026-02-30'));
    assert.throws(() => normalizeActivity({ ...ride, start_date_local: 'tomorrow' }));
    assert.throws(() => normalizeActivity({ ...ride, id: undefined }));
});
