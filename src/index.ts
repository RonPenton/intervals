import 'dotenv-json2/config';
import fs from 'fs';
import { getRides, getWellness } from './intervals-api';
import { pruneActivityFields, pruneWellnessFields } from './intervals-transformers';
import { addDays, getMonday, getToday } from './days';
import { Temporal } from 'temporal-polyfill';
import { computeScheduleFromRides, computeTrainingLoads, getDayOfWeek, setSchedule } from './schedule';

export const bullet = (text: string) => `- ${text}`;

const oneWeek = Temporal.Duration.from({ days: 7 });

async function go() {
    console.log('Fetching rides from Intervals.icu...');
    const rides = await getRides();
    const transformed = rides.map(pruneActivityFields);

    const outputFile = './activities.json';
    const activities = JSON.stringify(transformed);
    fs.writeFileSync(outputFile, activities);

    const wellness = (await getWellness()).map(pruneWellnessFields);;
    const wellnessFile = './wellness.json';
    fs.writeFileSync(wellnessFile, JSON.stringify(wellness));

    const willRideToday = true;
    const daysToAdd = 10;

    const today = getToday();
    const tomorrow = addDays(today, 1);
    const rideToday = transformed.find(x => x.date === today.toString());

    const startDT = (rideToday || !willRideToday) ? tomorrow : today;
    const endDT = addDays(startDT, daysToAdd);

    const startDate = startDT.toString();
    const endDate = endDT.toString();

    console.log(`Start date: ${startDate}, End date: ${endDate}, Days to add: ${daysToAdd}, Monday: ${getMonday(today)}`);

    const schedules = computeScheduleFromRides(
        transformed,
        wellness,
        startDT,
        today,
        willRideToday,
        7,
        daysToAdd
    );

    //setSchedule(schedules, { date: '2025-07-07', form: -5 });       // Monday
    //setSchedule(schedules, { date: '2025-07-08', form: -15 });      // Tuesday
    //setSchedule(schedules, { date: '2025-07-09', form: -18 });      // Wednesday
    setSchedule(schedules, { date: '2025-07-10', form: -21 });      // Thursday
    setSchedule(schedules, { date: '2025-07-11', form: 'decay', maxMinutes: 0 });        // Friday
    setSchedule(schedules, { date: '2025-07-12', form: -20 });      // Saturday
    setSchedule(schedules, { date: '2025-07-13', form: -20 });      // Sunday
    setSchedule(schedules, { date: '2025-07-14', form: -10 });       // Monday   
    setSchedule(schedules, { date: '2025-07-15', form: -13 });      // Tuesday
    setSchedule(schedules, { date: '2025-07-16', form: -13 });      // Wednesday
    setSchedule(schedules, { date: '2025-07-17', form: -13 });      // Thursday
    setSchedule(schedules, { date: '2025-07-18', form: -8 });      // Friday
    setSchedule(schedules, { date: '2025-07-19', form: -20, minMinutes: 150 });      // Saturday    
    setSchedule(schedules, { date: '2025-07-20', form: -5 });       // Sunday

    computeTrainingLoads(schedules, transformed[0].currentFtp);

    schedules.forEach(record => {
        const parts = [
            `${getDayOfWeek(record.date)}, ${record.date}`, ,
            `CTL: ${record.fitness?.toFixed(0)}`,
            `ATL: ${record.fatigue?.toFixed(0)}`,
            `Form: ${typeof record.form === 'number' ? record.form.toFixed(0) : 'N/A'}`,
            !record.needsRide ? `TSS: ${record.trainingLoad}` : `Target TSS: ${record.trainingLoad}`,
            record.zone ? `Zone: ${record.zone}` : null
        ].filter(x => x !== null).join(', ');

        if (record.date == startDT.toString()) {
            console.log('=================================================================');
        }

        console.log(`- ${parts}`);
        if (record.rideOptions && record.rideOptions.length > 0) {
            const opts = record.rideOptions.map(ride => {
                const time = `${Math.floor(ride.minutes / 60)}:${String(ride.minutes % 60).padStart(2, '0')}`;
                return `~${time} ~${ride.power} W, Zone ${Math.floor(ride.zone)} ${ride.name}`;
            }).join(' █ ');
            console.log(`   - ${opts}`);
        }
    });

    // const pastDays = getPastDays(today, startDT);
    // const ftp = transformed[0].currentFtp;
    // const zones = calculateCogganPowerZones(ftp);

    // const pastActivities = pastDays.map(day => {
    //     const activity = transformed.find(x => x.date === day);
    //     if (!activity && day == today.toString()) { return [] }
    //     if (!activity) {
    //         return [`On ${day}, I will rest.`];
    //     }
    //     return [`On ${day}, I will ride ${activity.miles} miles, for ${activity.duration}, in ${getZoneForPower(activity.normalizedWatts, zones)}.`];
    // }).flat();

    // const restrictions = [
    //     "7/7 will be a light recovery day.",
    //     "The night of 7/11 I will have a late night and probably not sleep optimally.",
    //     "7/10 looks like it might be a rainy day, so I may not ride.",
    //     ...pastActivities
    // ].map(bullet).join('\n');

    // const notes = [
    //     "I cannot ride more than 25 miles on weekdays.",
    //     "In general, the day before a long ride should be light recovery or rest.",
    //     // "Long rides, above 35 miles, should be in Zone 2."
    // ].map(bullet).join('\n');

    // const goals = [
    //     //'I want to test my FTP sometime in the next 2 weeks.'
    //     'I want to ride at least 100 miles this week.',
    //     // 'I want to ride around 50 miles on Friday, July 4th, 2025.'
    // ].map(bullet).join('\n');

    // const food = [
    //     'I have bars that have 250 calories each, 43g carbs, 17g sugar, 6g fat, 10g protein.',
    //     'I have gels that have 200 calories each, 48g carbs, 25g sugar, 0g fat, 0g protein.',
    //     'food items cannot be split into smaller portions and should be used whole',
    //     'food should **NEVER** be consumed on rides shorter than 100 minutes',
    //     'aim for around 225 calories per hour on rides greater than 100 minutes. Be sure not to exceed this amount.'
    // ].map(bullet).join('\n');

    // const prompt = loadPrompt('cycling', {
    //     activities,
    //     today,
    //     restrictions,
    //     notes,
    //     goals,
    //     ftp,
    //     food,
    //     startDate,
    //     endDate,
    //     ...zonesToStrings(zones)
    // });



    // console.log('Prompt to OpenAI:');
    // console.log(prompt);

    // const response = await sendGptMessage([
    //     { role: 'system', content: 'You are a cycling coach.' },
    //     { role: 'user', content: prompt }
    // ]);

    // if (!response) {
    //     console.error('No response from OpenAI');
    //     return;
    // }

    // console.log('Response from OpenAI:');
    // console.log(response);
}


void go();


// possible rules:
// - no more than 3 Z3+ rides per week
// - prioritize Z2 ride volume
// - avoid z3+ rides on days before long rides
// - prefer z2 rides after rest days?
// - z3+ rides after z2 days?
// - taper back to z2 rides after z3+ rides
