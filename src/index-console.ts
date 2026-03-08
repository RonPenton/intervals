import 'dotenv-json2/config';
import { getRides, getWellness, ICUActivity } from './intervals-api';
import { Activity, pruneActivityFields, pruneWellnessFields } from './intervals-transformers';
import { addDays, getToday } from './days';
import { Temporal } from 'temporal-polyfill';
import { computeScheduleFromRides, computeTrainingLoads, getDayOfWeek, SchedulePreference, ScheduleRecord, setSchedule } from './schedule';
import { calculateCogganPowerZones, getPeakSevenDayTSS, printTargetRide, zonesToStrings } from './training';
import { CurrentIntervalProgressions } from './types';
import fs from 'fs';
import { intervalLengths } from './training-definitions';
import { migrate, upsertActivities, upsertWellnessBatch, upsertSchedules, closePool } from './db';

const willRideToday = true;
const daysToAdd = 10;
const seasonStart = new Temporal.PlainDate(getToday().year, 1, 1);

// Garmin and Intervals disagree on TSS calculations. Garmin is typically 5% more, so alter numbers by this
// constant in order to get more accurate in-ride targets. 
const tssMultiplier = 1.05;

const currentIntervalProgressions: CurrentIntervalProgressions = [
    { zone: 3.2, progression: [6, 20] },    // long ride + tempo
    { zone: 3.5, progression: [2, 30] },     // tempo intervals
    { zone: 3.6, progression: [3, 15] },     // sweet spot
    { zone: 4, progression: [3, 12] },       // threshold
    { zone: 5, progression: [4, 5] },       // VO2 max
    { zone: 6, progression: [2, 0.5] }        // anaerobic
];

function setSchedules(set: SetSchedule) {
    set({ date: '2025-10-17', targetFormPercent: 25 });             // Friday
    set({ date: '2025-10-18', targetTrainingLoad: 0 });             // Saturday
    set({ date: '2025-10-19', targetFormPercent: 20 });             // Sunday
    set({ date: '2025-10-20', targetFormPercent: 19 });              // Monday
    set({ date: '2025-10-21', targetFormPercent: 17 });               // Tuesday
    set({ date: '2025-10-22', targetFormPercent: 15 });               // Wednesday
    set({ date: '2025-10-23', targetFormPercent: 14 });              // Thursday
    set({ date: '2025-10-24', targetFormPercent: 12 });             // Friday
    set({ date: '2025-10-25', targetFormPercent: 10 });             // Saturday
    set({ date: '2025-10-26', targetFormPercent: 8 });              // Sunday
    set({ date: '2025-10-27', targetFormPercent: 6 });              // Monday

}

type SetSchedule = (pref: SchedulePreference) => void;

async function go() {

    console.log('Fetching rides from Intervals.icu...');
    const rawRides = await getRides(seasonStart);

    const currentFtp = rawRides[0].icu_ftp;
    const powerZones = calculateCogganPowerZones(currentFtp);
    const prune = (record: ICUActivity) => pruneActivityFields(record, powerZones, intervalLengths);

    const rides = rawRides.map(prune);
    const rawWellness = await getWellness();
    const wellness = rawWellness.map(pruneWellnessFields);

    fs.writeFileSync('./raw-activities.json', JSON.stringify(rawRides, null, 2));

    // Persist to Postgres
    await migrate();
    await upsertActivities(rides, rawRides);
    await upsertWellnessBatch(wellness, rawWellness);
    console.log(`Persisted ${rides.length} activities and ${wellness.length} wellness records to Postgres.`);
    // const outputFile = './activities.json';
    // const activities = JSON.stringify(rides);
    // fs.writeFileSync(outputFile, activities);
    // const wellnessFile = './wellness.json';
    // fs.writeFileSync(wellnessFile, JSON.stringify(wellness));

    const today = getToday();
    const tomorrow = addDays(today, 1);
    const rideToday = rides.find(x => x.date === today.toString());

    const startDT = (rideToday || !willRideToday) ? tomorrow : today;
    const endDT = addDays(startDT, daysToAdd);

    const startDate = startDT.toString();
    const endDate = endDT.toString();

    const zoneStrs = zonesToStrings(powerZones);
    console.log('------------------------------------------------------------------------');
    console.log(`Power Zones for FTP ${currentFtp}W:`);
    Object.entries(zoneStrs).forEach(([name, range]) => console.log(`- ${name}: ${range}`));
    console.log('------------------------------------------------------------------------');

    // console.log(`Start date: ${startDate}, End date: ${endDate}, Days to add: ${daysToAdd}, Monday: ${getMonday(today)}`);

    // const trainingRanges = computeTrainingLoadRanges(targetCategories, 500);
    // console.log('Training load ranges:');
    // Object.entries(trainingRanges).forEach(([name, range]) => {
    //     console.log(`- ${name}: ${range[0].toFixed(1)} - ${range[1].toFixed(1)} TSS`);
    // });

    const schedules = computeScheduleFromRides(
        rides,
        wellness,
        startDT,
        today,
        willRideToday,
        7,
        daysToAdd
    );

    const set = (pref: SchedulePreference) => setSchedule(schedules, pref);
    setSchedules(set);

    computeTrainingLoads(schedules, rides[0].currentFtp, currentIntervalProgressions);

    console.log('Past Week:');

    schedules.forEach(record => {
        const parts = [
            `${getDayOfWeek(record.date)}, ${record.date}`,
            `CTL: ${record.fitness?.toFixed(0)}`,
            `ATL: ${record.fatigue?.toFixed(0)}`,
            `Form: ${typeof record.form === 'number' ? record.form.toFixed(0) : 'N/A'}`,
            `Form%: ${typeof record.form === 'number' ? Math.round((record.form / (record.fitness ?? 1)) * 100) : 'N/A'}`,
            !record.needsRide ? `TSS: ${record.trainingLoad}` : `Target TSS: ${((record.trainingLoad ?? 0) * tssMultiplier).toFixed(1)}`,
            record.zone ? `Zone: ${record.zone}` : null
        ].filter(x => x !== null).join(', ');

        if (record.date == startDT.toString()) {
            console.log('------------------------------------------------------------------------');
            console.log(`Ride options for ${startDate} to ${endDate} (today: ${today.toString()}):`);
        }

        console.log(`- ${parts}`);
        if (record.rideOptions && record.rideOptions.length > 0) {
            for (const option of record.rideOptions) {
                console.log(`    - ${printTargetRide(option)}`);
            }
            // const opts = record.rideOptions.map(printTargetRide).join(' ▓ ');
            // console.log(`   - ${opts}`);
        }
    });


    console.log('------------------------------------------------------------------------');

    const { peakTSS, peakFrom, peakTo } = getPeakSevenDayTSS(seasonStart, rides);
    console.log(`Peak 7-day TSS: ${peakTSS} from ${peakFrom.toString()} to ${peakTo.toString()}`);

    const weekAgo = addDays(startDT, -7);
    const weekAhead = addDays(startDT, 7);
    const filterLastWeek = (ride: Activity) => ride.date >= weekAgo.toString() && ride.date < startDT.toString();
    const filterNextWeek = (schedule: ScheduleRecord) => schedule.date >= startDT.toString() && schedule.date < weekAhead.toString();

    const lastWeekRides = rides.filter(filterLastWeek);
    const lastWeekTSS = lastWeekRides.reduce((sum, ride) => sum + ride.trainingLoad, 0);
    const percentOfPeak = (lastWeekTSS / peakTSS) * 100;
    console.log(`Last week TSS: ${lastWeekTSS} (${percentOfPeak.toFixed(1)}% of peak 7-day TSS)`);

    const nextWeekSchedules = schedules.filter(filterNextWeek);
    const nextWeekTSS = nextWeekSchedules.reduce((sum, schedule) => sum + (schedule.trainingLoad ?? 0), 0);
    const nextWeekPercent = (nextWeekTSS / peakTSS) * 100;
    console.log(`Next week TSS: ${nextWeekTSS} (${nextWeekPercent.toFixed(1)}% of peak 7-day TSS)`);
    console.log('------------------------------------------------------------------------');

    // Persist computed schedules
    await upsertSchedules(schedules);
    console.log(`Persisted ${schedules.length} schedule records to Postgres.`);

    await closePool();
}


void go();


// possible rules:
// - no more than 3 Z3+ rides per week
// - prioritize Z2 ride volume
// - avoid z3+ rides on days before long rides
// - prefer z2 rides after rest days?
// - z3+ rides after z2 days?
// - taper back to z2 rides after z3+ rides

export const bullet = (text: string) => `- ${text}`;
