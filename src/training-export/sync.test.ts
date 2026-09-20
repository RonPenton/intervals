import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { components } from '../intervals-api-schema';
import type { ExportSource } from './source';
import type { ExportTarget } from './target';
import { stableJson } from './target';
import { syncTrainingData } from './sync';
import { POWER_DURATIONS_SECONDS } from './schema';
import { parseArgs } from './cli';

type Api = components['schemas'];
class MemoryTarget implements ExportTarget {
    files = new Map<string, string>();
    writes: string[] = [];
    failAt?: string;
    async readJson(path: string) { const value = this.files.get(path); return value === undefined ? undefined : JSON.parse(value); }
    async writeJson(path: string, value: unknown) {
        if (path === this.failAt) throw new Error('simulated disk failure');
        const content = stableJson(value);
        if (this.files.get(path) === content) return false;
        this.files.set(path, content); this.writes.push(path); return true;
    }
    async remove(path: string) { this.files.delete(path); }
    async listJson(directory: string) { return [...this.files.keys()].filter(path => path.startsWith(`${directory}/`) && path.endsWith('.json')); }
    async withLock<T>(work: () => Promise<T>) { return work(); }
}

class FakeSource implements ExportSource {
    athleteId = 'a1';
    rides: Api['ActivityWithIntervals'][] = [
        { id: 'old', type: 'Ride', start_date_local: '2026-01-01T08:00:00', name: 'Old ride' },
        { id: 'recent', type: 'VirtualRide', start_date_local: '2026-09-19T08:00:00', name: 'VO2',
            icu_intervals: [{ id: 1, type: 'WORK', start_time: 600, end_time: 840, average_watts: 300 }] },
    ];
    detailsFetched: string[] = [];
    ranges: [string, string][] = [];
    fail = false;
    wellness: Api['Wellness'][] = [{ id: '2026-09-19', ctl: 50, atl: 60 }];
    async getAthlete() { return { id: this.athleteId, timezone: 'UTC', icu_api_key: 'secret-not-exported' }; }
    async getActivities(from: string, through: string) {
        this.ranges.push([from, through]);
        return this.rides.filter(r => r.start_date_local!.slice(0, 10) >= from && r.start_date_local!.slice(0, 10) <= through);
    }
    async getActivity(id: string) {
        this.detailsFetched.push(id);
        if (this.fail) throw new Error('simulated network failure');
        const ride = this.rides.find(r => r.id === id);
        if (!ride) throw new Error('404');
        return ride;
    }
    async getWellness() { return this.wellness; }
    async getPlannedWorkouts() { return []; }
    async getPowerCurves() { return { secs: POWER_DURATIONS_SECONDS, curves: this.rides.map(r => ({
        id: r.id, start_date_local: r.start_date_local, watts: POWER_DURATIONS_SECONDS.map(() => 300),
    })) }; }
}

test('unchanged sync is byte-stable, schema-versioned and only refreshes overlap details', async () => {
    const target = new MemoryTarget(), source = new FakeSource();
    await syncTrainingData(source, target, { today: '2026-09-20' });
    const first = new Map(target.files);
    target.writes = []; source.detailsFetched = [];
    await syncTrainingData(source, target, { today: '2026-09-20' });
    assert.deepEqual(target.files, first);
    assert.deepEqual(target.writes, []);
    assert.deepEqual(source.detailsFetched, ['recent']);
    assert.deepEqual(source.ranges[source.ranges.length - 1], ['2026-09-14', '2026-09-20']);
    for (const value of target.files.values()) {
        assert.equal(JSON.parse(value).schemaVersion, 1);
        assert.equal(value.includes('secret-not-exported'), false);
    }
});

test('upstream summary and interval edits replace records without duplicating them', async () => {
    const target = new MemoryTarget(), source = new FakeSource();
    await syncTrainingData(source, target, { today: '2026-09-20' });
    source.rides[1].name = 'Threshold';
    source.rides[1].icu_intervals![0].average_watts = 275;
    await syncTrainingData(source, target, { today: '2026-09-20' });
    const index = await target.readJson('activity-index.json');
    assert.equal(index.activities.length, 2);
    assert.equal(index.activities[1].name, 'Threshold');
    assert.equal((await target.readJson('activities/recent.json')).intervals[0].averagePowerWatts, 275);
});

test('range reconciliation removes deleted details and curves while preserving history', async () => {
    const target = new MemoryTarget(), source = new FakeSource();
    await syncTrainingData(source, target, { today: '2026-09-20' });
    source.rides.pop();
    await syncTrainingData(source, target, { today: '2026-09-20' });
    assert.equal(target.files.has('activities/recent.json'), false);
    assert.equal(target.files.has('activities/old.json'), true);
    assert.deepEqual((await target.readJson('power-curves.json')).curves.map((r: { id: string }) => r.id), ['old']);
});

test('single activity refresh preserves unrelated records and never advances coverage', async () => {
    const target = new MemoryTarget(), source = new FakeSource();
    await syncTrainingData(source, target, { today: '2026-09-20' });
    const state = target.files.get('.sync-state.json');
    source.detailsFetched = [];
    source.rides[0].name = 'Edited old ride';
    await syncTrainingData(source, target, { today: '2026-10-20', activity: 'old' });
    assert.deepEqual(source.detailsFetched, ['old']);
    assert.equal(target.files.get('.sync-state.json'), state);
    assert.equal((await target.readJson('activity-index.json')).activities[0].name, 'Edited old ride');
    assert.equal((await target.readJson('activity-index.json')).activities.length, 2);
});

test('days mode fetches requested inclusive range and does not hide a gap since last normal sync', async () => {
    const target = new MemoryTarget(), source = new FakeSource();
    await syncTrainingData(source, target, { today: '2026-09-20' });
    await syncTrainingData(source, target, { today: '2026-11-20', days: 3 });
    assert.deepEqual(source.ranges[source.ranges.length - 1], ['2026-11-18', '2026-11-20']);
    assert.equal((await target.readJson('.sync-state.json')).throughDate, '2026-09-20');
    await syncTrainingData(source, target, { today: '2026-11-20' });
    assert.deepEqual(source.ranges[source.ranges.length - 1], ['2026-09-14', '2026-11-20']);
});

test('first targeted sync does not masquerade as a history sync; first days sync is explicitly limited', async () => {
    const target = new MemoryTarget(), source = new FakeSource();
    await syncTrainingData(source, target, { today: '2026-09-20', activity: 'recent' });
    assert.equal((await target.readJson('.sync-state.json')).throughDate, undefined);
    await syncTrainingData(source, target, { today: '2026-09-20' });
    assert.equal(source.ranges[source.ranges.length - 1][0], '2023-01-01');
    const limited = new MemoryTarget();
    await syncTrainingData(source, limited, { today: '2026-09-20', days: 30 });
    assert.equal((await limited.readJson('manifest.json')).coverage.from, '2026-08-22');
    assert.equal((await limited.readJson('activity-index.json')).activities.length, 1);
});

test('full rebuild refreshes old edits and removes deleted old records and orphan files', async () => {
    const target = new MemoryTarget(), source = new FakeSource();
    await syncTrainingData(source, target, { today: '2026-09-20' });
    source.rides.shift();
    target.files.set('activities/orphan.json', '{}');
    await syncTrainingData(source, target, { today: '2026-09-20', full: true });
    assert.equal(target.files.has('activities/old.json'), false);
    assert.equal(target.files.has('activities/orphan.json'), false);
    assert.equal((await target.readJson('manifest.json')).activityCount, 1);
});

test('network failures leave published data untouched; write failures keep checkpoint and are repairable', async () => {
    const target = new MemoryTarget(), source = new FakeSource();
    await syncTrainingData(source, target, { today: '2026-09-20' });
    const before = new Map(target.files);
    source.fail = true;
    await assert.rejects(syncTrainingData(source, target, { today: '2026-09-21' }));
    assert.deepEqual(target.files, before);
    source.fail = false; target.failAt = 'fitness.json';
    source.rides[1].name = 'Changed';
    await assert.rejects(syncTrainingData(source, target, { today: '2026-09-21' }));
    assert.equal(target.files.get('.sync-state.json'), before.get('.sync-state.json'));
    target.failAt = undefined;
    await syncTrainingData(source, target, { today: '2026-09-21' });
    assert.equal((await target.readJson('.sync-state.json')).throughDate, '2026-09-21');
    assert.equal((await target.readJson('activity-index.json')).activities[1].name, 'Changed');
});

test('different athletes, unsupported schemas and conflicting modes are rejected', async () => {
    const target = new MemoryTarget(), source = new FakeSource();
    await syncTrainingData(source, target, { today: '2026-09-20' });
    source.athleteId = 'a2';
    await assert.rejects(syncTrainingData(source, target, { today: '2026-09-20' }), /different athlete/);
    source.athleteId = 'a1';
    target.files.set('.sync-state.json', '{"schemaVersion":2,"athleteId":"a1"}');
    await assert.rejects(syncTrainingData(source, target), /unsupported/);
    await assert.rejects(syncTrainingData(source, target, { full: true, days: 30 }), /only one/);
});

test('CLI validates flags and paths without exposing unknown argument values', () => {
    assert.deepEqual(parseArgs(['--days', '30', '--output', 'my-export']).options, { days: 30 });
    assert.equal(parseArgs(['--activity', 'i123']).options.activity, 'i123');
    assert.equal(parseArgs(['--help']).help, true);
    for (const args of [['--days', '0'], ['--days', 'NaN'], ['--full', '--activity', 'i1'], ['--activity', '../escape'], ['--output'], ['--unknown']]) {
        assert.throws(() => parseArgs(args));
    }
});
