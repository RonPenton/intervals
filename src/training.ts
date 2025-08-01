import { Temporal } from "temporal-polyfill";
import { Activity } from "./intervals-transformers";
import { addDays, getToday, lessThan, moreThanEqual } from "./days";

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

export type PowerZone = {
    name: string;
    value: number;
    minPowerPct: number;
    maxPowerPct: number;
}

export type TargetCategory = {
    name: string;
    zone: number;
    percentFtp: number;
    minMinutesInZone?: number;
    maxMinutesInZone?: number;
    maxMinutesTotal?: number;
    minIntervalRestMinutes?: number;
    continuousZone?: number;
}

export type CurrentIntervalProgression = {
    zone: number;
    progression: IntervalDefinition;
};

export type CurrentIntervalProgressions = CurrentIntervalProgression[];
export type IntervalDefinition = [reps: number, minutes: number];

export type IntervalProgression = {
    zone: number;
    progressions: IntervalDefinition[];
}

export type TargetRideContinuous = {
    name: string;
    zone: number;
    continuousZone: number;
    continuousWatts: number;
    totalMinutes: number;
}

export type TargetRideInterval = TargetRideContinuous & {
    intervalZone: number;
    intervalWatts: number;
    intervalReps: number;
    intervalMinutes: number;
    restMinutes: number;            // not total rest minutes, just the rest between intervals.
}

export type TargetRide = TargetRideContinuous | TargetRideInterval;

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


// thoughts on how to create a schedule: 
// 1. First figure out the target form/percentage/etc for each day.
// 2. Then figure out the training load required to achieve that form.
// 3. Then we need to figure out which ride options are available for that training load. 

// Step 3 is complex because there are two types of rides:
// - Continuous rides: These are rides that are done in one power zone with no intervals
// - Interval rides: these are rides that contain intervals at a higher power zone, and then rest periods and 
//                   potentially "bookends" to extend the ride in a Z1/2 state.

// A continous ride is simple and simply has a target power, and a duration range. 
// An interval ride will have:
//  - A target power for the intervals
//  - A target power for the rest/remaining periods. 
//  - a min/max amount of total time in the interval power zone
//  - a min/max amount of time for each interval
//  - a min amount of time for each rest period

export const CogganPowerZones: PowerZone[] = [
    { name: "Active Recovery", value: 1, minPowerPct: 0, maxPowerPct: 55 },
    { name: "Endurance", value: 2, minPowerPct: 55, maxPowerPct: 75 },
    { name: "Tempo", value: 3, minPowerPct: 75, maxPowerPct: 90 },
    { name: "Lactate Threshold", value: 4, minPowerPct: 90, maxPowerPct: 105 },
    { name: "VO2 Max", value: 5, minPowerPct: 105, maxPowerPct: 120 },
    { name: "Anaerobic Capacity", value: 6, minPowerPct: 120, maxPowerPct: 150 },
    { name: "Neuromuscular Power", value: 7, minPowerPct: 150, maxPowerPct: Infinity }
];

export const targetCategories: TargetCategory[] = [
    { name: "Recovery", zone: 1, percentFtp: 50, minMinutesInZone: 30, maxMinutesInZone: 90 },
    { name: "Base Miles", zone: 2, percentFtp: 60, minMinutesInZone: 40, maxMinutesInZone: 120 },
    { name: "Long Ride", zone: 2.5, percentFtp: 67, minMinutesInZone: 120 },
    { name: "Endurance", zone: 2.6, percentFtp: 73, minMinutesInZone: 40, maxMinutesInZone: 120 },
    { name: "Tempo", zone: 3, percentFtp: 80, minMinutesInZone: 30, maxMinutesInZone: 120 },
    { name: "Tempo Intervals", zone: 3.5, percentFtp: 85, minMinutesInZone: 20, maxMinutesInZone: 90, continuousZone: 2, maxMinutesTotal: 120, minIntervalRestMinutes: 10 },
    { name: "Sweet Spot", zone: 3.6, percentFtp: 90, minMinutesInZone: 10, maxMinutesInZone: 60, continuousZone: 2, maxMinutesTotal: 120, minIntervalRestMinutes: 10 },
    { name: "Threshold", zone: 4, percentFtp: 97, minMinutesInZone: 8, maxMinutesInZone: 50, continuousZone: 2, maxMinutesTotal: 120, minIntervalRestMinutes: 4 },
    { name: "VO2 Max", zone: 5, percentFtp: 112, minMinutesInZone: 10, maxMinutesInZone: 24, continuousZone: 2, maxMinutesTotal: 120, minIntervalRestMinutes: 3 },
];

export const intervalProgressions: IntervalProgression[] = [
    { zone: 3.5, progressions: [[1, 20], [1, 30], [2, 20], [1, 45], [2, 30], [1, 60], [2, 45], [1, 90]] },
    { zone: 3.6, progressions: [[1, 10], [1, 15], [2, 10], [1, 20], [2, 15], [1, 30], [2, 20], [3, 15], [2, 25], [1, 50], [4, 15], [3, 20], [2, 30], [1, 60]] },
    { zone: 4, progressions: [[1, 8], [1, 12], [2, 8], [1, 16], [1, 20], [2, 10], [1, 20], [3, 10], [2, 15], [2, 20], [1, 30], [4, 10], [3, 15], [2, 25], [1, 45]] },
    { zone: 5, progressions: [[1, 3], [1, 5], [2, 3], [1, 6], [2, 5], [1, 8], [3, 5], [2, 8], [3, 6], [4, 6], [3, 8]] }
];


export type IntervalLength = {
    zone: number;
    minMinutes: number;
    maxMinutes: number;
}

export const intervalLengths = [
    { zone: 3.5, minMinutes: 20, maxMinutes: 90 },
    { zone: 3.6, minMinutes: 10, maxMinutes: 60 },
    { zone: 4, minMinutes: 8, maxMinutes: 45 },
    { zone: 5, minMinutes: 3, maxMinutes: 8 }
] as const satisfies IntervalLength[];

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

export type TargetCategoryWithProgression = TargetCategory & Partial<CurrentIntervalProgression>;

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
        if(category.maxMinutesInZone && totalIntervalMinutes > category.maxMinutesInZone) {
            return null;
        }
        if(category.minMinutesInZone && totalIntervalMinutes < category.minMinutesInZone) {
            return null;
        }

        const continuousWatts = continuousTargetCategory.percentFtp / 100 * ftp;

        const intervalTSS = computeTrainingLoad(totalIntervalMinutes / 60, intervalWatts, ftp);
        const intervalRestTSS = computeTrainingLoad(totalIntervalRestMinutes / 60, continuousWatts, ftp);

        const totalIntervalTSS = intervalTSS + intervalRestTSS;

        if (totalIntervalTSS > trainingLoadTarget) {
            console.log(`Total interval TSS ${totalIntervalTSS} exceeds target ${trainingLoadTarget}`);
            return null; // Not enough TSS for this ride
        }

        const remainingTSS = trainingLoadTarget - totalIntervalTSS;
        const remainingMinutes = computeMinutesForTrainingLoad(continuousTargetCategory.percentFtp, ftp, remainingTSS);

        const totalMinutes = Math.round(totalIntervalMinutes + totalIntervalRestMinutes + remainingMinutes);

        if(category.maxMinutesTotal && totalMinutes > category.maxMinutesTotal) {
            return null;
        }

        return {
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