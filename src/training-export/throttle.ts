export const DEFAULT_REQUEST_DELAY_MS = 200;
export const MAX_REQUEST_DELAY_MS = 60_000;

export function validateRequestDelay(value: number): number {
    if (!Number.isSafeInteger(value) || value < 1 || value > MAX_REQUEST_DELAY_MS) {
        throw new Error('--request-delay-ms must be an integer from 1 to 60000');
    }
    return value;
}

interface Clock {
    now(): number;
    sleep(milliseconds: number): Promise<void>;
}

/** One queue per export source, shared by new endpoints, legacy calls and retries. */
export class RequestThrottle {
    private queue: Promise<void> = Promise.resolve();
    private nextRequestAt = -Infinity;

    constructor(private readonly delayMs = DEFAULT_REQUEST_DELAY_MS, private readonly clock: Clock = {
        now: () => performance.now(),
        sleep: milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)),
    }) { validateRequestDelay(delayMs); }

    defer(milliseconds: number): void {
        this.nextRequestAt = Math.max(this.nextRequestAt, this.clock.now() + milliseconds);
    }

    run<T>(request: () => Promise<T>): Promise<T> {
        const result = this.queue.then(async () => {
            // Recheck after sleeping: another request may have extended a server-directed cooldown.
            while (this.clock.now() < this.nextRequestAt) {
                await this.clock.sleep(this.nextRequestAt - this.clock.now());
            }
            this.nextRequestAt = this.clock.now() + this.delayMs;
            return request();
        });
        // A failed request must not poison the queue for subsequent attempts.
        this.queue = result.then(() => {}, () => {});
        return result;
    }
}
