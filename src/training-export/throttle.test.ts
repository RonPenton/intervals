import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RequestThrottle, DEFAULT_REQUEST_DELAY_MS } from './throttle';
import { parseArgs } from './cli';

function fakeClock() {
    let milliseconds = 0;
    return {
        now: () => milliseconds,
        sleep: async (delay: number) => { milliseconds += delay; },
    };
}

test('concurrent requests start immediately then respect the configured default spacing', async () => {
    const clock = fakeClock();
    const throttle = new RequestThrottle(undefined, clock);
    const starts: number[] = [];
    const request = () => throttle.run(async () => { starts.push(clock.now()); });
    await Promise.all([request(), request(), request(), request()]);
    assert.deepEqual(starts, [0, DEFAULT_REQUEST_DELAY_MS, 2 * DEFAULT_REQUEST_DELAY_MS, 3 * DEFAULT_REQUEST_DELAY_MS]);
});

test('configured delay, slow requests and failures all preserve queue ordering', async () => {
    const clock = fakeClock();
    const throttle = new RequestThrottle(2000, clock);
    const starts: number[] = [];
    const results = await Promise.allSettled([
        throttle.run(async () => { starts.push(clock.now()); await clock.sleep(3500); throw new Error('network failure'); }),
        throttle.run(async () => { starts.push(clock.now()); }),
        throttle.run(async () => { starts.push(clock.now()); }),
    ]);
    assert.equal(results[0].status, 'rejected');
    assert.equal(results[1].status, 'fulfilled');
    assert.deepEqual(starts, [0, 3500, 5500]);
});

test('server cooldown applies to requests already queued, without shortening the normal delay', async () => {
    const clock = fakeClock();
    const throttle = new RequestThrottle(1000, clock);
    const starts: number[] = [];
    await Promise.all([
        throttle.run(async () => { starts.push(clock.now()); throttle.defer(5000); }),
        throttle.run(async () => { starts.push(clock.now()); throttle.defer(10); }),
        throttle.run(async () => { starts.push(clock.now()); }),
    ]);
    assert.deepEqual(starts, [0, 5000, 6000]);
});

test('CLI exposes default and custom delay and rejects invalid timer values', () => {
    assert.equal(parseArgs([]).requestDelayMs, DEFAULT_REQUEST_DELAY_MS);
    assert.equal(parseArgs(['--days', '30', '--request-delay-ms', '2000']).requestDelayMs, 2000);
    for (const value of ['0', '-1', 'NaN', '1.5', 'Infinity', '60001', '2147483648']) {
        assert.throws(() => parseArgs(['--request-delay-ms', value]), /request-delay-ms/);
        assert.throws(() => new RequestThrottle(Number(value)), /request-delay-ms/);
    }
});
