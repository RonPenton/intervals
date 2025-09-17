// thoughts on how to create a schedule: 
// 1. First figure out the target form/percentage/etc for each day.
// 2. Then figure out the training load required to achieve that form.
// 3. Then we need to figure out which ride options are available for that training load. 

import { IntervalLength, IntervalLengths, IntervalProgression, PowerZone, TargetCategory } from "./types";

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
    { name: "Stroll", zone: 1.1, percentFtp: 40, minMinutesInZone: 1, maxMinutesInZone: 180 },
    { name: "Recovery", zone: 1, percentFtp: 50, minMinutesInZone: 30, maxMinutesInZone: 90 },
    { name: "Base Miles", zone: 2, percentFtp: 65, minMinutesInZone: 40, maxMinutesInZone: 120 },
    { name: "Long Ride", zone: 2.5, percentFtp: 69, minMinutesInZone: 120 },
    { name: "Endurance", zone: 2.6, percentFtp: 72, minMinutesInZone: 40, maxMinutesInZone: 120 },
    { name: "Tempo", zone: 3, percentFtp: 80, minMinutesInZone: 30, maxMinutesInZone: 120 },
    { name: "Long Ride+Tempo", zone: 3.2, percentFtp: 80, minMinutesInZone: 20, maxMinutesInZone: 180, continuousZone: 2.5, minIntervalRestMinutes: 10 },
    { name: "Tempo Intervals", zone: 3.5, percentFtp: 85, minMinutesInZone: 20, maxMinutesInZone: 90, continuousZone: 2, maxMinutesTotal: 150, minIntervalRestMinutes: 10 },
    { name: "Sweet Spot", zone: 3.6, percentFtp: 91, minMinutesInZone: 10, maxMinutesInZone: 90, continuousZone: 2, maxMinutesTotal: 150, minIntervalRestMinutes: 10 },
    { name: "Threshold", zone: 4, percentFtp: 97, minMinutesInZone: 8, maxMinutesInZone: 50, continuousZone: 2, maxMinutesTotal: 150, minIntervalRestMinutes: 4, minIntervalPercentage: 40 },
    { name: "VO2 Max", zone: 5, percentFtp: 120, minMinutesInZone: 3, maxMinutesInZone: 24, continuousZone: 2, maxMinutesTotal: 135, minIntervalRestMinutes: 3, minIntervalPercentage: 40 },
    { name: "Anaerobic", zone: 6, percentFtp: 135, minMinutesInZone: 0.5, maxMinutesInZone: 3, continuousZone: 2, maxMinutesTotal: 135, minIntervalRestMinutes: 1, minIntervalPercentage: 5 },
];

export const intervalProgressions: IntervalProgression[] = [
    { zone: 3.5, progressions: [[1, 20], [1, 30], [2, 20], [3, 20], [1, 45], [2, 30], [1, 60], [2, 45], [1, 90]] },
    { zone: 3.6, progressions: [[1, 10], [1, 15], [2, 10], [1, 20], [2, 15], [1, 30], [2, 20], [3, 15], [2, 25], [1, 50], [4, 15], [3, 20], [2, 30], [1, 60]] },
    { zone: 4, progressions: [[1, 8], [1, 12], [2, 8], [1, 16], [1, 20], [2, 10], [1, 20], [3, 8], [2, 12], [1, 24], [3, 10], [2, 15], [2, 20], [1, 30], [4, 10], [5, 10], [4, 12], [3, 15], [2, 25], [1, 45]] },
    { zone: 5, progressions: [[1, 3], [1, 5], [2, 3], [1, 6], [2, 4], [3, 3], [2, 5], [1, 8], [4, 3], [3, 4], [4, 4], [3, 5], [2, 8], [4, 5], [3, 6], [4, 6], [3, 8], [4, 8]] },
    { zone: 6, progressions: [[1, 0.5], [2, 0.5], [1, 1], [2, 1], [3, 0.5], [3, 1], [2, 2], [1, 3], [2, 3], [3, 3], [4, 3]] }
];

export const intervalLengths: IntervalLengths = [
    { zone: 3, minMinutes: 10, maxMinutes: 90 },
    { zone: 3.2, minMinutes: 20, maxMinutes: 180 },
    { zone: 3.5, minMinutes: 20, maxMinutes: 90 },
    { zone: 3.6, minMinutes: 10, maxMinutes: 60 },
    { zone: 4, minMinutes: 8, maxMinutes: 45 },
    { zone: 5, minMinutes: 3, maxMinutes: 8 }
];


// const prog = intervalProgressions[3].progressions.map(([count, duration]) => {
//     const total = count * duration;
//     return { count, duration, total };
// });

// for (const p of prog) {
//     console.log(`- ${p.count} x ${p.duration} = ${p.total} minutes`);
// }