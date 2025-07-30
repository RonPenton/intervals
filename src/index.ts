import 'dotenv-json2/config';
import fs from 'fs';
import { getRides, getWellness } from './intervals-api';
import { Activity, pruneActivityFields, pruneWellnessFields } from './intervals-transformers';
import { addDays, getToday } from './days';
import { Temporal } from 'temporal-polyfill';
import { computeScheduleFromRides, computeTrainingLoads, getDayOfWeek, ScheduleRecord, setSchedule } from './schedule';
import { calculateCogganPowerZones, computeFatigue, computeFitness, computeRequiredTrainingLoadForNextMorningForm, computeTrainingLoadRanges, getPeakSevenDayTSS, IntervalRange, targetCategories, zonesToStrings } from './training';

const willRideToday = true;
const daysToAdd = 10;
const seasonStart = new Temporal.PlainDate(getToday().year, 1, 1);


const intervalRanges: IntervalRange[] = [
    { zone: 3.5, minReps: 2, maxReps: 4, minMinutes: 10, maxMinutes: 20, restMinutes: 15 },  // sweet spot
    { zone: 4, minReps: 2, maxReps: 4, minMinutes: 10, maxMinutes: 20, restMinutes: 10 },   // threshold
    { zone: 5, minReps: 3, maxReps: 6, minMinutes: 1, maxMinutes: 3, restMinutes: 5 },    // VO2 max
]

function setSchedules(schedules: ScheduleRecord[]) {
    setSchedule(schedules, { date: '2025-07-29', targetFormPercent: -12 });     // Tuesday
    setSchedule(schedules, { date: '2025-07-30', targetTrainingLoad: 10 });     // Wednesday
    setSchedule(schedules, { date: '2025-07-31', targetForm: -10 });          // Thursday
    setSchedule(schedules, { date: '2025-08-01', targetFormPercent: -10 });     // Friday
    setSchedule(schedules, { date: '2025-08-02', targetTrainingLoad: 80 });     // Saturday
    setSchedule(schedules, { date: '2025-08-03', targetTrainingLoad: 200 });    // Sunday
    setSchedule(schedules, { date: '2025-08-04', targetForm: -15 });              // Monday
    setSchedule(schedules, { date: '2025-08-05', targetForm: 'D-1' });          // Tuesday
    setSchedule(schedules, { date: '2025-08-06', targetFormPercent: -30 });          // Wednesday
    setSchedule(schedules, { date: '2025-08-07', targetForm: 'maintain' });          // Thursday
}

async function go() {

    console.log('Fetching rides from Intervals.icu...');
    const rawRides = await getRides(seasonStart);
    const rides = rawRides.map(pruneActivityFields);

    fs.writeFileSync('./raw-activities.json', JSON.stringify(rawRides, null, 2));

    const outputFile = './activities.json';
    const activities = JSON.stringify(rides);
    fs.writeFileSync(outputFile, activities);

    const wellness = (await getWellness()).map(pruneWellnessFields);;
    const wellnessFile = './wellness.json';
    fs.writeFileSync(wellnessFile, JSON.stringify(wellness));

    const today = getToday();
    const tomorrow = addDays(today, 1);
    const rideToday = rides.find(x => x.date === today.toString());

    const startDT = (rideToday || !willRideToday) ? tomorrow : today;
    const endDT = addDays(startDT, daysToAdd);

    const startDate = startDT.toString();
    const endDate = endDT.toString();

    const powerZones = calculateCogganPowerZones(rides[0].currentFtp);
    const zoneStrs = zonesToStrings(powerZones);
    console.log('------------------------------------------------------------------------');
    console.log('Power Zones:');
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

    setSchedules(schedules);

    computeTrainingLoads(schedules, rides[0].currentFtp);

    console.log('Past Week:');

    schedules.forEach(record => {
        const parts = [
            `${getDayOfWeek(record.date)}, ${record.date}`,
            `CTL: ${record.fitness?.toFixed(0)}`,
            `ATL: ${record.fatigue?.toFixed(0)}`,
            `Form: ${typeof record.form === 'number' ? record.form.toFixed(0) : 'N/A'}`,
            `Form%: ${typeof record.form === 'number' ? Math.round((record.form / (record.fitness ?? 1)) * 100) : 'N/A'}`,
            !record.needsRide ? `TSS: ${record.trainingLoad}` : `Target TSS: ${record.trainingLoad} (${((record.trainingLoad ?? 0) * 1.05).toFixed(1)} Garmin)`,
            record.zone ? `Zone: ${record.zone}` : null
        ].filter(x => x !== null).join(', ');

        if (record.date == startDT.toString()) {
            console.log('------------------------------------------------------------------------');
            console.log(`Ride options for ${startDate} to ${endDate} (today: ${today.toString()}):`);
        }

        console.log(`- ${parts}`);
        if (record.rideOptions && record.rideOptions.length > 0) {
            const opts = record.rideOptions.map(ride => {
                const time = `${Math.floor(ride.minutes / 60)}:${String(ride.minutes % 60).padStart(2, '0')}`;
                return `~${time}|~${ride.power}w|Z${Math.floor(ride.zone)}|${ride.name}`;
            }).join(' ▓ ');
            console.log(`   - ${opts}`);
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
