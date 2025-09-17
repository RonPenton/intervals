import { computeMinutesForTrainingLoad, computeTrainingLoad } from "./training";
import { CogganPowerZones } from "./training-definitions";

const targetFitness = 100;
const zoneMix = [
    8,      // zone 1
    30,      // zone 2
    19,      // zone 3
    12,      // zone 4
    5,      // zone 5
    2,      // zone 6
    1       // zone 7
];

// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

const zoneTotals = zoneMix.reduce((a, b) => a + b, 0);
const zoneMixRatios = zoneMix.map(z => z / zoneTotals);

const midpoints = CogganPowerZones
    .map(z => (z.minPowerPct + (z.maxPowerPct === Infinity ? z.minPowerPct + 30 : z.maxPowerPct)) / 2);
const targetTSS = 7 * targetFitness;

console.log(`Target asymptotic fitness (CTL): ${targetFitness}`);
console.log(`Target weekly TSS: ${targetTSS}`);
console.log(`Zone mix ratios: ${zoneMixRatios.map((z, i) => `z${i+1}: ${(z * 100).toFixed(1)}%`).join(', ')}`);

let upperBound = computeMinutesForTrainingLoad(midpoints[0], targetTSS);
let lowerBound = computeMinutesForTrainingLoad(midpoints[6], targetTSS);

// console.log({ upperBound, lowerBound });

while (true) {
    const pick = (upperBound - lowerBound) / 2 + lowerBound;
    // console.log(`Trying ${Math.round(pick)} minutes...`);   
    const mix = zoneMixRatios.map((ratio, i) => {
        const minutes = ratio * pick;
        const tss = computeTrainingLoad(minutes / 60, midpoints[i], 100);
        return { zone: i + 1, ratio, minutes, tss };
    });

    // console.log(mix);

    const totalTSS = mix.reduce((a, b) => a + b.tss, 0);
    // console.log(`Total TSS: ${totalTSS}`);

    if( Math.abs(totalTSS - targetTSS) < 0.1) {
        console.log(`Target weekly minutes: ${Math.round(pick)} minutes`);
        console.log(`Target weekly hours: ${ (pick / 60).toFixed(1) } hours`);
        console.log(mix.map(z => `Zone ${z.zone}: ${Math.round(z.minutes)} minutes`).join('\n'));
        break;
    }
    else if(totalTSS < targetTSS) {
        lowerBound = pick;
    }
    else if(totalTSS > targetTSS) {
        upperBound = pick;
    }
}

