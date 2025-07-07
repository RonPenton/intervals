import 'dotenv-json2/config';
import fs from 'fs';
import { getRides, getWellness } from './intervals-api';
import { pruneActivityFields, pruneWellnessFields } from './intervals-transformers';
import { loadPrompt, sendGptMessage } from './openai';
import { calculateCogganPowerZones, computeFatigue, computeFitness, computeRequiredTrainingLoad, computeTargetRides, computeTrainingLoadForRide, getZoneForPower, ScheduleRecord, zonesToStrings } from './training';
import { addDays, days, getMonday, getPastDays, getToday } from './days';
import { Temporal } from 'temporal-polyfill';
import { computeScheduleFromRides, computeTrainingLoads, setSchedule } from './schedule';

const bullet = (text: string) => `- ${text}`;

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

    // set this to true if it's like Saturday or Sunday night and want the next
    // week instead of the current week. 
    const currentWeekIsDone = false;
    const weeks = 3;


    const daysToAdd = (weeks * 7) - 1;

    const today = getToday();
    const monday = getMonday(today);
    const startDT = currentWeekIsDone ? monday.add(oneWeek) : monday;
    const endDT = addDays(startDT, daysToAdd);

    const startDate = startDT.toString();
    const endDate = endDT.toString();

    console.log(`Start date: ${startDate}, End date: ${endDate}, Days to add: ${daysToAdd}, Monday: ${getMonday(today)}`);

    const schedules = computeScheduleFromRides(
        transformed,
        wellness,
        startDT,
        today,
        !currentWeekIsDone,
        1, 
        daysToAdd
    );

    setSchedule(schedules, { date: '2025-07-07', form: -5 });
    setSchedule(schedules, { date: '2025-07-08', form: -13 });
    setSchedule(schedules, { date: '2025-07-09', form: -13 });
    setSchedule(schedules, { date: '2025-07-10', form: -15 });
    setSchedule(schedules, { date: '2025-07-11', form: 0 });
    setSchedule(schedules, { date: '2025-07-12', form: -20 });
    setSchedule(schedules, { date: '2025-07-13', form: -20 });

    computeTrainingLoads(schedules, transformed[0].currentFtp);

    schedules.forEach(record => {
        console.log(`- Date: ${record.date}, CTL: ${record.fitness?.toFixed(0)}, ATL: ${record.fatigue?.toFixed(0)}, Form: ${record.form}, Target Training Load: ${record.trainingLoad}`);
        if (record.rideOptions) {
            record.rideOptions.forEach(ride => {
                console.log(`  - Option: Minutes: ~${ride.minutes}, Power: ~${ride.power} W, Zone: ${ride.name}/Z${Math.floor(ride.zone)}`);
            });
        }
    });

    const pastDays = getPastDays(today, startDT);
    console.log(`Start date: ${startDate}, End date: ${endDate}`);
    console.log(`Past days: ${pastDays.join(', ')}`);

    const ftp = transformed[0].currentFtp;
    const zones = calculateCogganPowerZones(ftp);

    const pastActivities = pastDays.map(day => {
        const activity = transformed.find(x => x.date === day);
        if (!activity && day == today.toString()) { return [] }
        if (!activity) {
            return [`On ${day}, I will rest.`];
        }
        return [`On ${day}, I will ride ${activity.miles} miles, for ${activity.duration}, in ${getZoneForPower(activity.normalizedWatts, zones)}.`];
    }).flat();

    const restrictions = [
        "7/7 will be a light recovery day.",
        "The night of 7/11 I will have a late night and probably not sleep optimally.",
        "7/10 looks like it might be a rainy day, so I may not ride.",
        ...pastActivities
    ].map(bullet).join('\n');

    const notes = [
        "I cannot ride more than 25 miles on weekdays.",
        "In general, the day before a long ride should be light recovery or rest.",
        // "Long rides, above 35 miles, should be in Zone 2."
    ].map(bullet).join('\n');

    const goals = [
        //'I want to test my FTP sometime in the next 2 weeks.'
        'I want to ride at least 100 miles this week.',
        // 'I want to ride around 50 miles on Friday, July 4th, 2025.'
    ].map(bullet).join('\n');

    const food = [
        'I have bars that have 250 calories each, 43g carbs, 17g sugar, 6g fat, 10g protein.',
        'I have gels that have 200 calories each, 48g carbs, 25g sugar, 0g fat, 0g protein.',
        'food items cannot be split into smaller portions and should be used whole',
        'food should **NEVER** be consumed on rides shorter than 100 minutes',
        'aim for around 225 calories per hour on rides greater than 100 minutes. Be sure not to exceed this amount.'
    ].map(bullet).join('\n');

    const prompt = loadPrompt('cycling', {
        activities,
        today,
        restrictions,
        notes,
        goals,
        ftp,
        food,
        startDate,
        endDate,
        ...zonesToStrings(zones)
    });



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
