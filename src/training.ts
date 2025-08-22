import Decimal from "decimal.js";
import { Temporal } from "temporal-polyfill";
import { Activity } from "./intervals-transformers";
import { addDays, getToday, lessThan, moreThanEqual } from "./days";
import { CurrentIntervalProgression, CurrentIntervalProgressions, IntervalSimplified, PowerZone, TargetCategory, TargetCategoryWithProgression, TargetRide } from "./types";
import { CogganPowerZones, targetCategories } from "./training-definitions";

export function computeFitness(
    fitnessYesterday: number,
    trainingLoad: number
) {
    return fitnessYesterday + (trainingLoad - fitnessYesterday) / 42;
}

export function computeFatigue(
    fatigueYesterday: number,
    trainingLoad: number
) {
    return fatigueYesterday + (trainingLoad - fatigueYesterday) / 7;
}



export function computeRequiredTrainingLoad(
    fitnessYesterday: number,
    fatigueYesterday: number,
    targetForm: number
) {
    const a = (-42 * targetForm) / 5;
    const b = (41 * fitnessYesterday) / 5;
    const c = (-36 * fatigueYesterday) / 5;
    return (a + b + c);
}

/**
 * @param fitnessYesterday 
 * @param fatigueYesterday 
 * @param targetFormPercent 
 * @returns 
 */
export function computeRequiredTrainingLoadFromFormPercentage(
    fitnessYesterday: number,
    fatigueYesterday: number,
    targetFormPercent: number
) {
    const a = -252 * fatigueYesterday;
    const b = -287 * fitnessYesterday * (targetFormPercent - 1);
    const c = (7 * targetFormPercent) + 35;
    return (a + b) / c;
}

export function computeRequiredTrainingLoadForNextMorningForm(
    fitnessYesterday: number,
    fatigueYesterday: number,
    nextMorningForm: number
) {
    const a = (-252 * nextMorningForm) / 25;
    const b = (1681 * fitnessYesterday) / 175;
    const c = (-1296 * fatigueYesterday) / 175;
    return (a + b + c);
}

export function computeRequiredTrainingLoadForNextMorningFormPercentage(
    fitnessYesterday: number,
    fatigueYesterday: number,
    nextMorningFormPercentage: number
): number {

    nextMorningFormPercentage = nextMorningFormPercentage / 100;
    const numerator =
        1296 * fatigueYesterday -
        1681 * (1 - nextMorningFormPercentage) * fitnessYesterday;

    const denominator = 41 * (1 - nextMorningFormPercentage) - 216;

    if (denominator === 0) {
        throw new Error("Invalid input: denominator becomes zero.");
    }

    return numerator / denominator;
}

export function computeTrainingLoadForRide(
    ride: Activity,
    ftp: number
) {
    const { hours, normalizedWatts } = ride;
    return computeTrainingLoad(hours, normalizedWatts, ftp);
}

export function computeTrainingLoad(
    hours: number,
    normalizedWatts: number,
    ftp: number
) {
    const pow2 = Math.pow(normalizedWatts, 2);
    const ftp2 = Math.pow(ftp, 2);
    const tss = ((hours * pow2) / ftp2) * 100;
    return Math.round(tss * 10) / 10; // Round to one decimal place
}

export function computeMinutesForTrainingLoad(
    percentFtp: number,
    ftp: number,
    trainingLoadTarget: number
) {
    const np = percentFtp / 100 * ftp;
    const np2 = Math.pow(np, 2);
    const ftp2 = Math.pow(ftp, 2);
    const hours = ((trainingLoadTarget / 100) * ftp2) / np2;
    return hours * 60;
}


export const calculateCogganPowerZones = (ftp: number) => {
    return Object.fromEntries(
        CogganPowerZones.map(zone => [zone.name, [ftp * zone.minPowerPct / 100, ftp * zone.maxPowerPct / 100]] as const)
    );
}

export function formatMinutes(minutes: number): string {
    const pad2 = (num: number) => String(num).padStart(2, '0');
    if (minutes > 60) {
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return `${hours}h${pad2(mins)}m`;
    }
    else if (minutes > 1) {
        return `${Math.round(minutes)}m`;
    }
    else {
        return `${Math.round(minutes * 60)}s`;
    }
}

export function printTargetRide(ride: TargetRide) {
    if ('intervalZone' in ride) {
        const rest = ride.intervalReps > 1 ? ` (rest ${formatMinutes(ride.restMinutes)})` : '';
        const continuousMinutes = ride.totalMinutes - (ride.intervalReps * ride.intervalMinutes) - (ride.restMinutes * (ride.intervalReps - 1));
        return [
            `${formatMinutes(ride.totalMinutes)}`,
            `${ride.intervalReps}x${formatMinutes(ride.intervalMinutes)}@${Math.round(ride.intervalWatts)}w${rest}`,
            `Z${Math.floor(ride.intervalZone)}`,
            `${ride.name}`,
            `+${formatMinutes(continuousMinutes)}Z${Math.floor(ride.continuousZone)}@${Math.round(ride.continuousWatts)}w`,
        ].join('|');
    } else {
        return [
            `${formatMinutes(ride.totalMinutes)}`,
            `${Math.round(ride.continuousWatts)}w`,
            `Z${Math.floor(ride.continuousZone)}`,
            `${ride.name}`
        ].join('|');
    }
}

export function computeTrainingLoadRanges(
    targetCategories: readonly TargetCategory[],
    ftp: number
) {
    const ranges: { [key: string]: [number, number] } = {};
    for (const category of targetCategories) {
        let low = 0;
        if (category.minMinutesInZone !== undefined) {
            low = computeTrainingLoad(category.minMinutesInZone / 60, category.percentFtp / 100 * ftp, ftp);
        }
        let high = Infinity;
        if (category.maxMinutesInZone !== undefined) {
            high = computeTrainingLoad(category.maxMinutesInZone / 60, category.percentFtp / 100 * ftp, ftp);
        }
        ranges[category.name] = [low, high];
    }
    return ranges;
}


function mergeTargetCategoriesWithCurrentProgressions(
    targetCategories: readonly TargetCategory[],
    currentProgressions: CurrentIntervalProgressions
): TargetCategoryWithProgression[] {
    return targetCategories.map(category => {
        const progression = currentProgressions.find(p => p.zone === category.zone);
        if (progression) {
            return { ...category, ...progression };
        }
        return category;
    });
}

export function computeTargetRides(
    ftp: number,
    trainingLoadTarget: number,
    minimumRideMinutes: number,
    maximumRideMinutes: number,
    currentIntervalProgressions: CurrentIntervalProgressions
): TargetRide[] {
    const targets = mergeTargetCategoriesWithCurrentProgressions(targetCategories, currentIntervalProgressions);
    const fn = (category: TargetCategoryWithProgression) => calculateHoursForTargetRide(category, trainingLoadTarget, ftp);
    const rides = targets
        .map(fn)
        .filter(ride => ride !== null)
        .filter(ride => ride.totalMinutes >= minimumRideMinutes && ride.totalMinutes <= maximumRideMinutes);
    return rides;
}

function calculateHoursForTargetRide(
    category: TargetCategory & Partial<CurrentIntervalProgression>,
    trainingLoadTarget: number,
    ftp: number
): TargetRide | null {

    if (category.continuousZone !== undefined && category.progression !== undefined) {
        // we're in an interval zone. So we need to calculate the interval, then the rest, then the continuous part.
        const intervalWatts = category.percentFtp / 100 * ftp;
        const intervalReps = category.progression[0];
        const intervalMinutes = category.progression[1];
        const totalIntervalMinutes = intervalReps * intervalMinutes;
        const totalIntervalRestMinutes = (Math.max(intervalReps - 1, 0)) * (category.minIntervalRestMinutes ?? 0);

        const continuousTargetCategory = targetCategories.find(x => x.zone === category.continuousZone);
        if (!continuousTargetCategory) {
            console.log(`No continuous target category found for zone ${category.continuousZone}`);
            return null;
        }

        // not sure when this would happen. 
        if (category.maxMinutesInZone && totalIntervalMinutes > category.maxMinutesInZone) {
            return null;
        }
        if (category.minMinutesInZone && totalIntervalMinutes < category.minMinutesInZone) {
            return null;
        }

        const continuousWatts = continuousTargetCategory.percentFtp / 100 * ftp;

        const intervalTSS = computeTrainingLoad(totalIntervalMinutes / 60, intervalWatts, ftp);
        const intervalRestTSS = computeTrainingLoad(totalIntervalRestMinutes / 60, continuousWatts, ftp);

        const totalIntervalTSS = intervalTSS + intervalRestTSS;

        if (totalIntervalTSS > trainingLoadTarget) {
            // console.log(`Total interval TSS ${totalIntervalTSS} exceeds target ${trainingLoadTarget}`);
            return null; // Not enough TSS for this ride
        }

        const remainingTSS = trainingLoadTarget - totalIntervalTSS;
        const remainingMinutes = computeMinutesForTrainingLoad(continuousTargetCategory.percentFtp, ftp, remainingTSS);

        const totalMinutes = Math.round(totalIntervalMinutes + totalIntervalRestMinutes + remainingMinutes);

        if (category.maxMinutesTotal && totalMinutes > category.maxMinutesTotal) {
            return null;
        }

        const ride = {
            name: category.name,
            zone: category.zone,
            continuousZone: category.continuousZone,
            continuousWatts,
            totalMinutes,
            intervalReps,
            intervalMinutes,
            intervalWatts,
            intervalZone: category.zone,
            restMinutes: category.minIntervalRestMinutes
        }

        // const normalizedPower = computeNormalizedPowerForIntervals(ride);
        // const tss = computeTrainingLoad(ride.totalMinutes / 60, normalizedPower, ftp);
        // const pctError = Math.abs((tss - trainingLoadTarget) / trainingLoadTarget);
        // console.log(`Requested TSS: ${trainingLoadTarget} vs Computed TSS: ${tss}; Error: ${(pctError * 100).toFixed(0)}% for ride: ${printTargetRide(ride)}`);


        return ride;
    }

    const totalMinutes = Math.round(computeMinutesForTrainingLoad(category.percentFtp, ftp, trainingLoadTarget));
    if (category.minMinutesInZone && totalMinutes < category.minMinutesInZone) {
        return null;
    }
    if (category.maxMinutesInZone && totalMinutes > category.maxMinutesInZone) {
        return null;
    }

    return {
        name: category.name,
        zone: category.zone,
        continuousZone: category.zone,
        continuousWatts: category.percentFtp / 100 * ftp,
        totalMinutes
    };
}

type Zones = ReturnType<typeof calculateCogganPowerZones>;

export const zonesToStrings = (zones: Zones) => {
    return Object.fromEntries(Object.entries(zones).map(([key, [min, max]]) => {
        if (max === Infinity) {
            return [key, `${min.toFixed(0)} + W`] as const;
        }
        return [key, `${min.toFixed(0)} - ${max.toFixed(0)} W`] as const;
    }));
}

export const getZoneForPower = (power: number, zones: Zones) => {
    for (const [zone, [min, max]] of Object.entries(zones)) {
        if (power >= min && power < max) {
            return zone.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
        }
    }
    throw new Error(`Power ${power} W does not fit in any zone.`);
}

export const getZoneNumberForPower = (power: number, zones: Zones) => {
    let i = 1;
    for (const [zone, [min, max]] of Object.entries(zones)) {
        if (power >= min && power < max) {
            return i;
        }
        i++;
    }
    throw new Error(`Power ${power} W does not fit in any zone.`);
}

export const getZoneForRide = (ftp: number, np: number): number => {
    const zones = calculateCogganPowerZones(ftp);
    return getZoneNumberForPower(np, zones);
}

export function powerAtDurationPowerLaw(
    tSec: number,
    ftp: number,
    t0Sec = 3600,  // reference: 1 hour
    k = 0.07       // decay exponent
): number {
    if (tSec <= 0) return Infinity;
    return ftp * Math.pow(tSec / t0Sec, -k);
}


const cogganTable: [number, number][] = [
    [5, 2.50],
    [60, 1.75],
    [300, 1.20],
    [1200, 1.00],
    [3600, 0.95],
    [7200, 0.85],
    [18000, 0.70],
];

/**
 * Estimate sustainable power at a given duration based on FTP using 로그 interpolation.
 * @param tSec Time in seconds
 * @param ftp Functional Threshold Power
 */
export function powerAtDurationCoggan(tSec: number, ftp: number): number {
    if (tSec <= 0) return ftp;
    const table = cogganTable;
    const t = tSec;

    // If out of table range, extrapolate with end slopes
    if (t <= table[0][0]) {
        const [t0, p0] = table[0];
        return ftp * (p0 / (t0 ** 0));
    }
    if (t >= table[table.length - 1][0]) {
        const [tn, pn] = table[table.length - 1];
        return ftp * pn;
    }

    // Find surrounding points
    let i = 0;
    while (t > table[i + 1][0]) i++;
    const [t1, p1] = table[i];
    const [t2, p2] = table[i + 1];
    const ratio = (Math.log(t) - Math.log(t1)) / (Math.log(t2) - Math.log(t1));
    const pct = p1 + (p2 - p1) * ratio;
    return pct * ftp;
}

export function powerAtDurationFromPowerCurve(
    tSec: number,
    powerCurve: { secs: number[], values: number[] }
) {
    if (tSec <= 0) {
        throw new Error('Time must be greater than 0 seconds');
    }

    const t = tSec;

    if (t <= powerCurve.secs[0]) {
        const p0 = powerCurve.values[0];
        return p0;
    }
    if (t >= powerCurve.secs[powerCurve.secs.length - 1]) {
        const pN = powerCurve.values[powerCurve.values.length - 1];
        return pN;
    }

    // Find surrounding points
    let i = 0;
    while (t > powerCurve.secs[i + 1]) i++;
    const t1 = powerCurve.secs[i];
    const p1 = powerCurve.values[i];
    const t2 = powerCurve.secs[i + 1];
    const p2 = powerCurve.values[i + 1];

    const diff1 = Math.abs(t - t1);
    const diff2 = Math.abs(t - t2);
    if (diff1 < diff2) {
        return p1;
    }
    return p2;
}

export function getPeakSevenDayTSS(
    seasonStart: Temporal.PlainDate,
    rides: Activity[]
) {

    let day = seasonStart;

    const scan = (day: Temporal.PlainDate) => {
        const r: Activity[] = [];
        const plusSeven = addDays(day, 7);
        for (let index = 0; index < rides.length; index++) {
            const ride = rides[index];
            const date = Temporal.PlainDate.from(ride.date);
            if (moreThanEqual(date, day) && lessThan(date, plusSeven)) {
                r.push(ride);
            }
        }
        return r;
    }

    const today = getToday();

    let peakTSS = 0;
    let from: Temporal.PlainDate = seasonStart;

    while (lessThan(day, today)) {
        const currentRides = scan(day);
        const tss = currentRides.reduce((sum, ride) => sum + ride.trainingLoad, 0);

        if (tss > peakTSS) {
            peakTSS = tss;
            from = day;
        }

        day = addDays(day, 1);
    }

    return { peakTSS, peakFrom: from, peakTo: addDays(from, 6) };
}

export function computeNormalizedPowerForIntervals(ride: TargetRide) {
    let pows: Decimal = new Decimal(0);
    let count = 0;
    const rolling: number[] = [];

    const add = (a: number, b: number) => a + b;

    // normalized power is 30s moving average, to the 4th power and summed, then averaged, then 4th root. 
    for (const power of powerStream(ride)) {
        rolling.push(power);

        if (rolling.length > 30) { rolling.shift() }
        if (rolling.length == 30) {
            const average = rolling.reduce(add, 0) / rolling.length;
            pows = pows.add(Decimal.pow(average, 4));
            count++;
        }
    }

    const mean = pows.dividedBy(count);
    const root = mean.pow(1 / 4);
    return root.toNumber();
}

function getSimplifiedIntervals(
    targetRide: TargetRide
): IntervalSimplified[] {
    if ('intervalZone' in targetRide) {

        const restMinutes = targetRide.intervalReps - 1 * targetRide.restMinutes;
        const intervalMinutes = targetRide.intervalReps * targetRide.intervalMinutes;
        const remaining = targetRide.totalMinutes - intervalMinutes - restMinutes;
        const half = remaining / 2;

        const intervals = [{ watts: targetRide.continuousWatts, seconds: half * 60 }];
        for (let i = 0; i < targetRide.intervalReps; i++) {
            intervals.push({ watts: targetRide.intervalWatts, seconds: targetRide.intervalMinutes * 60 });
            if (i < targetRide.intervalReps - 1) {
                intervals.push({ watts: targetRide.continuousWatts, seconds: targetRide.restMinutes * 60 });
            }
        }
        intervals.push({ watts: targetRide.continuousWatts, seconds: half * 60 });
        return intervals;
    }
    else {
        return [{
            watts: targetRide.continuousWatts,
            seconds: targetRide.totalMinutes * 60
        }];
    }
}

export function* powerStream(
    ride: TargetRide
) {
    const intervals = getSimplifiedIntervals(ride);
    let interval = 0;
    let time = 0;
    let start = 0;
    while (intervals[interval]) {
        const i = intervals[interval];
        if (time - start > i.seconds) {
            start += i.seconds;
            interval++;
            continue;
        }
        yield i.watts;
        time++;
    }
}


export function computeRequiredTrainingLoadForTargetFitness(
    fitnessYesterday: number,
    targetFitness: number
): number {
    // 42FitT - 41FitY = TSS
    const a = (42 * targetFitness);
    const b = (41 * fitnessYesterday);
    return Math.round(a - b);
}

export function computeRequiredTrainingLoadForTargetFatigue(
    fatigueYesterday: number,
    targetFatigue: number
): number {
    // TSS = 7FatT - 6FatY
    const a = (7 * targetFatigue);
    const b = (6 * fatigueYesterday);
    return Math.round(a - b);
}


export function computeRoughFatBurnedPercentage(
    intensityFactor: number
): number {

    // numbers reverse engineered from FFT Fueling and Pacing ("bonk") calculator.
    // https://www.cyclingapps.net/calculators/
    const a = -0.34648829;
    const b = -0.28680936;
    const c = 1.02073278;

    let val = a * Math.pow(intensityFactor, 2) + b * intensityFactor + c;

    // clamp it to [0, 1]
    val = Math.max(0, Math.min(1, val));
    return val;
}

export function computeRoughCarbBurnedPercentage(
    intensityFactor: number
): number {
    return 1 - computeRoughFatBurnedPercentage(intensityFactor);
}
