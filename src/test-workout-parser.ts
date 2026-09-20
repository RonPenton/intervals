import { compileWorkout, type ConcreteStep } from './workout';

// ─── Workout source ───────────────────────────────────────────────────────────

const source = `
Warmup:
  10m @ Z1
  5m @ 60-70% HR

Main Set:
  3x as rep:
    Rep {rep}:
      65..75 step 5 as power:
        2m @ 50%
        {rep+1}m @ {power-5}-{power+7}%
        30s @ SS 90-95rpm

Cooldown:
  10m @ Z1 Z1-Z2 HR
`;

// ─── Run ─────────────────────────────────────────────────────────────────────

const steps = compileWorkout(source);

// ─── Display ─────────────────────────────────────────────────────────────────

function formatDuration(secs: number): string {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const parts = [];
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    if (s) parts.push(`${s}s`);
    return parts.join('') || '0s';
}

function formatIntensity(step: ConcreteStep): string {
    return step.intensity.map(t => {
        switch (t.kind) {
            case 'watts':
                return t.hi !== undefined ? `${t.lo}-${t.hi}w` : `${t.lo}w`;
            case 'ftp-percent':
                return t.hi !== undefined ? `${t.lo}-${t.hi}%` : `${t.lo}%`;
            case 'power-zone': {
                const lo = t.lo.kind === 'ss' ? 'SS' : `Z${t.lo.n}`;
                const hi = t.hi ? (t.hi.kind === 'ss' ? 'SS' : `Z${t.hi.n}`) : undefined;
                return hi ? `${lo}-${hi}` : lo;
            }
            case 'hr-percent':
                return t.hi !== undefined
                    ? `${t.lo}-${t.hi}% ${t.ref}`
                    : `${t.lo}% ${t.ref}`;
            case 'hr-zone':
                return t.hi !== undefined ? `Z${t.lo}-Z${t.hi} HR` : `Z${t.lo} HR`;
            case 'cadence':
                return t.hi !== undefined ? `${t.lo}-${t.hi}rpm` : `${t.lo}rpm`;
        }
    }).join('  ');
}

console.log(`\n${'─'.repeat(50)}`);
console.log(` ${steps.length} steps`);
console.log(`${'─'.repeat(50)}\n`);

steps.forEach((step, i) => {
    const num   = String(i + 1).padStart(2);
    const dur   = formatDuration(step.duration).padEnd(8);
    const intens = formatIntensity(step);
    // if(step.label) {
    //     console.log(step.label);
    // }
    // console.log(`  ${num}.  ${dur}  ${intens}`);
});

console.log();
