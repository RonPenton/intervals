"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getZoneForRide = exports.parseInterval = exports.getZoneNumberForPower = exports.getZoneForPower = exports.zonesToStrings = exports.calculateCogganPowerZones = void 0;
exports.computeFitness = computeFitness;
exports.computeFatigue = computeFatigue;
exports.computeRequiredTrainingLoad = computeRequiredTrainingLoad;
exports.computeRequiredTrainingLoadFromFormPercentage = computeRequiredTrainingLoadFromFormPercentage;
exports.computeRequiredTrainingLoadForNextMorningForm = computeRequiredTrainingLoadForNextMorningForm;
exports.computeRequiredTrainingLoadForNextMorningFormPercentage = computeRequiredTrainingLoadForNextMorningFormPercentage;
exports.computeTrainingLoadForRide = computeTrainingLoadForRide;
exports.computeTrainingLoad = computeTrainingLoad;
exports.computeMinutesForTrainingLoad = computeMinutesForTrainingLoad;
exports.formatMinutes = formatMinutes;
exports.printTargetRide = printTargetRide;
exports.computeTrainingLoadRanges = computeTrainingLoadRanges;
exports.computeTargetRides = computeTargetRides;
exports.computeCalories = computeCalories;
exports.powerAtDurationPowerLaw = powerAtDurationPowerLaw;
exports.powerAtDurationCoggan = powerAtDurationCoggan;
exports.powerAtDurationFromPowerCurve = powerAtDurationFromPowerCurve;
exports.getPeakSevenDayTSS = getPeakSevenDayTSS;
exports.computeNormalizedPowerForIntervals = computeNormalizedPowerForIntervals;
exports.powerStream = powerStream;
exports.computeRequiredTrainingLoadForTargetFitness = computeRequiredTrainingLoadForTargetFitness;
exports.computeRequiredTrainingLoadForTargetFatigue = computeRequiredTrainingLoadForTargetFatigue;
exports.computeRoughFatBurnedPercentage = computeRoughFatBurnedPercentage;
exports.computeRoughCarbBurnedPercentage = computeRoughCarbBurnedPercentage;
exports.gramsToPounds = gramsToPounds;
const decimal_js_1 = __importDefault(require("decimal.js"));
const temporal_polyfill_1 = require("temporal-polyfill");
const days_1 = require("./days");
const training_definitions_1 = require("./training-definitions");
function computeFitness(fitnessYesterday, trainingLoad) {
    return fitnessYesterday + (trainingLoad - fitnessYesterday) / 42;
}
function computeFatigue(fatigueYesterday, trainingLoad) {
    return fatigueYesterday + (trainingLoad - fatigueYesterday) / 7;
}
function computeRequiredTrainingLoad(fitnessYesterday, fatigueYesterday, targetForm) {
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
function computeRequiredTrainingLoadFromFormPercentage(fitnessYesterday, fatigueYesterday, targetFormPercent) {
    const a = -252 * fatigueYesterday;
    const b = -287 * fitnessYesterday * (targetFormPercent - 1);
    const c = (7 * targetFormPercent) + 35;
    return (a + b) / c;
}
function computeRequiredTrainingLoadForNextMorningForm(fitnessYesterday, fatigueYesterday, nextMorningForm) {
    const a = (-252 * nextMorningForm) / 25;
    const b = (1681 * fitnessYesterday) / 175;
    const c = (-1296 * fatigueYesterday) / 175;
    return (a + b + c);
}
function computeRequiredTrainingLoadForNextMorningFormPercentage(fitnessYesterday, fatigueYesterday, nextMorningFormPercentage) {
    nextMorningFormPercentage = nextMorningFormPercentage / 100;
    const numerator = 1296 * fatigueYesterday -
        1681 * (1 - nextMorningFormPercentage) * fitnessYesterday;
    const denominator = 41 * (1 - nextMorningFormPercentage) - 216;
    if (denominator === 0) {
        throw new Error("Invalid input: denominator becomes zero.");
    }
    return numerator / denominator;
}
function computeTrainingLoadForRide(ride, ftp) {
    const { hours, normalizedWatts } = ride;
    return computeTrainingLoad(hours, normalizedWatts, ftp);
}
function computeTrainingLoad(hours, normalizedWatts, ftp) {
    const pow2 = Math.pow(normalizedWatts, 2);
    const ftp2 = Math.pow(ftp, 2);
    const tss = ((hours * pow2) / ftp2) * 100;
    return Math.round(tss * 10) / 10; // Round to one decimal place
}
function computeMinutesForTrainingLoad(intensityFactor, tss) {
    // const np = percentFtp / 100 * ftp;
    // const np2 = Math.pow(np, 2);
    // const ftp2 = Math.pow(ftp, 2);
    // const hours = ((trainingLoadTarget / 100) * ftp2) / np2;
    // return hours * 60;
    intensityFactor = intensityFactor / 100;
    const seconds = (36 * tss) / (intensityFactor * intensityFactor);
    const minutes = seconds / 60;
    return minutes;
}
const calculateCogganPowerZones = (ftp) => {
    return Object.fromEntries(training_definitions_1.CogganPowerZones.map(zone => [zone.name, [ftp * zone.minPowerPct / 100, ftp * zone.maxPowerPct / 100]]));
};
exports.calculateCogganPowerZones = calculateCogganPowerZones;
function formatMinutes(minutes) {
    const pad2 = (num) => String(num).padStart(2, '0');
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
function printTargetRide(ride) {
    const timePad = 7;
    const powPad = 19;
    const zPad = 4;
    const dPad = 17;
    const calPad = 19;
    const fatPad = 19;
    const carbPad = 18;
    if ('intervalZone' in ride) {
        const rest = ride.intervalReps > 1 ? ` (r${formatMinutes(ride.restMinutes)})` : '';
        const continuousMinutes = ride.totalMinutes - (ride.intervalReps * ride.intervalMinutes) - (ride.restMinutes * (ride.intervalReps - 1));
        return [
            `${formatMinutes(ride.totalMinutes).padEnd(timePad)}`,
            `${ride.intervalReps}x${formatMinutes(ride.intervalMinutes)}@${Math.round(ride.intervalWatts)}w${rest}`.padEnd(powPad),
            `Z${Math.floor(ride.intervalZone)}`.padEnd(zPad),
            `${ride.name}`.padEnd(dPad),
            `${Math.round(ride.calories)} cal (${Math.round(ride.calories / ride.totalMinutes * 60)}/hr)`.padEnd(calPad),
            `${Math.round(ride.fatCalories)} fat (${gramsToPounds(ride.fatCalories / 9).toFixed(2)}lb)`.padEnd(fatPad),
            `${Math.round(ride.glycogenCalories)} carb (${Math.round(ride.glycogenCalories / 4)}g)`.padEnd(carbPad),
            `+${formatMinutes(continuousMinutes)}Z${Math.floor(ride.continuousZone)}@${Math.round(ride.continuousWatts)}w`,
        ].join('');
    }
    else {
        return [
            `${formatMinutes(ride.totalMinutes).padEnd(timePad)}`,
            `${Math.round(ride.continuousWatts)}w`.padEnd(powPad),
            `Z${Math.floor(ride.continuousZone)}`.padEnd(zPad),
            `${ride.name}`.padEnd(dPad),
            `${Math.round(ride.calories)} cal (${Math.round(ride.calories / ride.totalMinutes * 60)}/hr)`.padEnd(calPad),
            `${Math.round(ride.fatCalories)} fat (${gramsToPounds(ride.fatCalories / 9).toFixed(2)}lb)`.padEnd(fatPad),
            `${Math.round(ride.glycogenCalories)} carb (${Math.round(ride.glycogenCalories / 4)}g)`.padEnd(carbPad),
        ].join('');
    }
}
function computeTrainingLoadRanges(targetCategories, ftp) {
    const ranges = {};
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
function mergeTargetCategoriesWithCurrentProgressions(targetCategories, currentProgressions) {
    return targetCategories.map(category => {
        const progression = currentProgressions.find(p => p.zone === category.zone);
        if (progression) {
            return { ...category, ...progression };
        }
        return category;
    });
}
function computeTargetRides(ftp, trainingLoadTarget, minimumRideMinutes, maximumRideMinutes, currentIntervalProgressions) {
    const targets = mergeTargetCategoriesWithCurrentProgressions(training_definitions_1.targetCategories, currentIntervalProgressions);
    const fn = (category) => calculateHoursForTargetRide(category, trainingLoadTarget, ftp);
    const rides = targets
        .map(fn)
        .filter(ride => ride !== null)
        .filter(ride => ride.totalMinutes >= minimumRideMinutes && ride.totalMinutes <= maximumRideMinutes);
    return rides;
}
function calculateHoursForTargetRide(category, trainingLoadTarget, ftp) {
    if (category.continuousZone !== undefined && category.progression !== undefined) {
        // we're in an interval zone. So we need to calculate the interval, then the rest, then the continuous part.
        const intervalWatts = category.percentFtp / 100 * ftp;
        const intervalReps = category.progression[0];
        const intervalMinutes = category.progression[1];
        const totalIntervalMinutes = intervalReps * intervalMinutes;
        const totalIntervalRestMinutes = (Math.max(intervalReps - 1, 0)) * (category.minIntervalRestMinutes ?? 0);
        const continuousTargetCategory = training_definitions_1.targetCategories.find(x => x.zone === category.continuousZone);
        if (!continuousTargetCategory) {
            console.log(`No continuous target category found for zone ${category.continuousZone}`);
            return null;
        }
        // not sure when this would happen. 
        if (category.maxMinutesInZone && totalIntervalMinutes > category.maxMinutesInZone) {
            //console.log(`Total interval minutes ${totalIntervalMinutes} exceeds max for ${category.name} ${category.maxMinutesInZone}`);
            return null;
        }
        if (category.minMinutesInZone && totalIntervalMinutes < category.minMinutesInZone) {
            //console.log(`Total interval minutes ${totalIntervalMinutes} less than min for ${category.name} ${category.minMinutesInZone}`);
            return null;
        }
        const continuousWatts = continuousTargetCategory.percentFtp / 100 * ftp;
        const intervalTSS = computeTrainingLoad(totalIntervalMinutes / 60, intervalWatts, ftp);
        const intervalRestTSS = computeTrainingLoad(totalIntervalRestMinutes / 60, continuousWatts, ftp);
        const totalIntervalTSS = intervalTSS + intervalRestTSS;
        if (totalIntervalTSS > trainingLoadTarget) {
            //console.log(`Total interval TSS ${totalIntervalTSS} exceeds target ${category.name} ${trainingLoadTarget}`);
            return null; // Not enough TSS for this ride
        }
        const remainingTSS = trainingLoadTarget - totalIntervalTSS;
        const remainingMinutes = computeMinutesForTrainingLoad(continuousTargetCategory.percentFtp, remainingTSS);
        const totalMinutes = Math.round(totalIntervalMinutes + totalIntervalRestMinutes + remainingMinutes);
        if (category.maxMinutesTotal && totalMinutes > category.maxMinutesTotal) {
            //console.log(`Total minutes ${totalMinutes} exceeds max for ${category.name} ${category.maxMinutesTotal}`);
            return null;
        }
        if (category.minIntervalPercentage) {
            const min = totalMinutes - 20; // warmup + cooldown;
            const percent = (totalIntervalMinutes + totalIntervalRestMinutes) / min * 100;
            if (percent < category.minIntervalPercentage) {
                // console.log(`min: ${min}, interval: ${totalIntervalMinutes}`);
                // console.log(`Interval percentage ${percent.toFixed(1)}% is less than minimum for ${category.name} ${category.minIntervalPercentage}%`);
                return null;
            }
        }
        const intervalCalories = computeCalories(intervalWatts, totalIntervalMinutes);
        const restCalories = computeCalories(continuousWatts, totalIntervalRestMinutes);
        const continuousCalories = computeCalories(continuousWatts, remainingMinutes);
        const intervalFatCalories = computeRoughFatBurnedPercentage(intervalWatts / ftp) * intervalCalories;
        const restFatCalories = computeRoughFatBurnedPercentage(continuousWatts / ftp) * restCalories;
        const continuousFatCalories = computeRoughFatBurnedPercentage(continuousWatts / ftp) * continuousCalories;
        const intervalGlycogenCalories = intervalCalories - intervalFatCalories;
        const restGlycogenCalories = restCalories - restFatCalories;
        const continuousGlycogenCalories = continuousCalories - continuousFatCalories;
        const calories = intervalCalories + restCalories + continuousCalories;
        const fatCalories = intervalFatCalories + restFatCalories + continuousFatCalories;
        const glycogenCalories = intervalGlycogenCalories + restGlycogenCalories + continuousGlycogenCalories;
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
            restMinutes: category.minIntervalRestMinutes,
            calories,
            fatCalories,
            glycogenCalories
        };
        // const normalizedPower = computeNormalizedPowerForIntervals(ride);
        // const tss = computeTrainingLoad(ride.totalMinutes / 60, normalizedPower, ftp);
        // const pctError = Math.abs((tss - trainingLoadTarget) / trainingLoadTarget);
        // console.log(`Requested TSS: ${trainingLoadTarget} vs Computed TSS: ${tss}; Error: ${(pctError * 100).toFixed(0)}% for ride: ${printTargetRide(ride)}`);
        return ride;
    }
    const totalMinutes = Math.round(computeMinutesForTrainingLoad(category.percentFtp, trainingLoadTarget));
    if (category.minMinutesInZone && totalMinutes < category.minMinutesInZone) {
        return null;
    }
    if (category.maxMinutesInZone && totalMinutes > category.maxMinutesInZone) {
        return null;
    }
    const continuousWatts = category.percentFtp / 100 * ftp;
    const calories = computeCalories(continuousWatts, totalMinutes);
    const fatCalories = computeRoughFatBurnedPercentage(continuousWatts / ftp) * calories;
    const glycogenCalories = calories - fatCalories;
    return {
        name: category.name,
        zone: category.zone,
        continuousZone: category.zone,
        continuousWatts,
        totalMinutes,
        calories,
        fatCalories,
        glycogenCalories
    };
}
function computeCalories(watts, durationMinutes) {
    const kJPerMin = (watts * 3.6) / 60;
    const kJ = kJPerMin * durationMinutes;
    // 9/7ths is a rough estimate of the conversion from kJ to kcal. This figure varies
    // from person to person, we might want to make it configurable in the future.
    const kCal = kJ * (9.0 / 7.0);
    return kCal;
}
const zonesToStrings = (zones) => {
    return Object.fromEntries(Object.entries(zones).map(([key, [min, max]]) => {
        if (max === Infinity) {
            return [key, `${min.toFixed(0)} + W`];
        }
        return [key, `${min.toFixed(0)} - ${max.toFixed(0)} W`];
    }));
};
exports.zonesToStrings = zonesToStrings;
const getZoneForPower = (power, zones) => {
    for (const [zone, [min, max]] of Object.entries(zones)) {
        if (power >= min && power < max) {
            return zone.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
        }
    }
    throw new Error(`Power ${power} W does not fit in any zone.`);
};
exports.getZoneForPower = getZoneForPower;
const getZoneNumberForPower = (power, zones) => {
    let i = 1;
    for (const [zone, [min, max]] of Object.entries(zones)) {
        if (power >= min && power < max) {
            return i;
        }
        i++;
    }
    throw new Error(`Power ${power} W does not fit in any zone.`);
};
exports.getZoneNumberForPower = getZoneNumberForPower;
const parseInterval = (interval) => {
    const regex = /(?<reps>\d)x (?:(?<h>\d+)h)?(?:(?<m>\d+)m)?(?:(?<s>\d+)s)? (?<watts>\d+)w/gi;
    const match = regex.exec(interval);
    if (!match)
        throw new Error(`Invalid interval format: ${interval}`);
    const reps = parseInt(match.groups?.reps ?? '1');
    const hours = parseInt(match.groups?.h ?? '0');
    const minutes = parseInt(match.groups?.m ?? '0');
    const seconds = parseInt(match.groups?.s ?? '0');
    const watts = parseInt(match.groups?.watts ?? '0');
    return { reps, durationMinutes: hours * 60 + minutes + seconds / 60, watts };
};
exports.parseInterval = parseInterval;
const getZoneForRide = (ride, zones, intervalLengths) => {
    const np = ride.icu_weighted_avg_watts;
    const intervals = (ride.interval_summary ?? [])
        .map(exports.parseInterval)
        .map(({ reps, durationMinutes, watts }) => ({ reps, durationMinutes, zone: (0, exports.getZoneNumberForPower)(watts, zones) }))
        .map(i => ({ ...i, lengthCategory: intervalLengths.find(length => length.zone === i.zone && i.durationMinutes >= length.minMinutes && i.durationMinutes <= length.maxMinutes) }))
        .filter(i => i.lengthCategory)
        .reduce((prev, curr) => {
        let info = prev.find(x => x.zone == curr.zone);
        if (!info) {
            info = { zone: curr.zone, reps: curr.reps, durationMinutes: curr.durationMinutes };
            prev.push(info);
        }
        else {
            info.reps += curr.reps;
            info.durationMinutes = Math.min(info.durationMinutes, curr.durationMinutes);
        }
        return prev;
    }, [])
        .map(i => ({ ...i, score: Math.pow(i.zone, i.reps) }))
        .sort((a, b) => b.score - a.score);
    if (intervals.length == 0) {
        return (0, exports.getZoneNumberForPower)(np, zones);
    }
    // console.log(`Ride on ${ride.start_date_local.split('T')[0]}: NP ${np}w`);
    // for (const interval of intervals) {
    //     console.log(`Interval: ${interval.reps}x${formatMinutes(interval.durationMinutes)}@${interval.zone}`);
    // }
    return intervals[0].zone;
};
exports.getZoneForRide = getZoneForRide;
function powerAtDurationPowerLaw(tSec, ftp, t0Sec = 3600, // reference: 1 hour
k = 0.07 // decay exponent
) {
    if (tSec <= 0)
        return Infinity;
    return ftp * Math.pow(tSec / t0Sec, -k);
}
const cogganTable = [
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
function powerAtDurationCoggan(tSec, ftp) {
    if (tSec <= 0)
        return ftp;
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
    while (t > table[i + 1][0])
        i++;
    const [t1, p1] = table[i];
    const [t2, p2] = table[i + 1];
    const ratio = (Math.log(t) - Math.log(t1)) / (Math.log(t2) - Math.log(t1));
    const pct = p1 + (p2 - p1) * ratio;
    return pct * ftp;
}
function powerAtDurationFromPowerCurve(tSec, powerCurve) {
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
    while (t > powerCurve.secs[i + 1])
        i++;
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
function getPeakSevenDayTSS(seasonStart, rides) {
    let day = seasonStart;
    const scan = (day) => {
        const r = [];
        const plusSeven = (0, days_1.addDays)(day, 7);
        for (let index = 0; index < rides.length; index++) {
            const ride = rides[index];
            const date = temporal_polyfill_1.Temporal.PlainDate.from(ride.date);
            if ((0, days_1.moreThanEqual)(date, day) && (0, days_1.lessThan)(date, plusSeven)) {
                r.push(ride);
            }
        }
        return r;
    };
    const today = (0, days_1.getToday)();
    let peakTSS = 0;
    let from = seasonStart;
    while ((0, days_1.lessThan)(day, today)) {
        const currentRides = scan(day);
        const tss = currentRides.reduce((sum, ride) => sum + ride.trainingLoad, 0);
        if (tss > peakTSS) {
            peakTSS = tss;
            from = day;
        }
        day = (0, days_1.addDays)(day, 1);
    }
    return { peakTSS, peakFrom: from, peakTo: (0, days_1.addDays)(from, 6) };
}
function computeNormalizedPowerForIntervals(ride) {
    let pows = new decimal_js_1.default(0);
    let count = 0;
    const rolling = [];
    const add = (a, b) => a + b;
    // normalized power is 30s moving average, to the 4th power and summed, then averaged, then 4th root. 
    for (const power of powerStream(ride)) {
        rolling.push(power);
        if (rolling.length > 30) {
            rolling.shift();
        }
        if (rolling.length == 30) {
            const average = rolling.reduce(add, 0) / rolling.length;
            pows = pows.add(decimal_js_1.default.pow(average, 4));
            count++;
        }
    }
    const mean = pows.dividedBy(count);
    const root = mean.pow(1 / 4);
    return root.toNumber();
}
function getSimplifiedIntervals(targetRide) {
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
function* powerStream(ride) {
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
function computeRequiredTrainingLoadForTargetFitness(fitnessYesterday, targetFitness) {
    // 42FitT - 41FitY = TSS
    const a = (42 * targetFitness);
    const b = (41 * fitnessYesterday);
    return Math.round(a - b);
}
function computeRequiredTrainingLoadForTargetFatigue(fatigueYesterday, targetFatigue) {
    // TSS = 7FatT - 6FatY
    const a = (7 * targetFatigue);
    const b = (6 * fatigueYesterday);
    return Math.round(a - b);
}
function computeRoughFatBurnedPercentage(intensityFactor) {
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
function computeRoughCarbBurnedPercentage(intensityFactor) {
    return 1 - computeRoughFatBurnedPercentage(intensityFactor);
}
function gramsToPounds(grams) {
    return grams / 453.59237;
}
