import 'dotenv-json2/config';
import fs from 'fs';
import { getRides, getWellness } from './intervals-api';
import { pruneActivityFields, pruneWellnessFields } from './intervals-transformers';
import { loadPrompt, sendGptMessage } from './openai';
import { computeFatigue, computeFitness, computeRequiredTrainingLoad, ScheduleRecord } from './training';
import { addDays, days, getMonday, getPastDays, getToday } from './days';
import { Temporal } from 'temporal-polyfill';

const bullet = (text: string) => `- ${text}`;

const oneWeek = Temporal.Duration.from({ days: 7 });
const oneDay = Temporal.Duration.from({ days: 1 });

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
    const currentWeekIsDone = true;
    const weeks = 1;


    const daysToAdd = (weeks * 7) - 1;

    const today = getToday();
    const yesterday = today.add(new Temporal.Duration(0, 0, 0, -1));
    const monday = getMonday(today);
    const startDT = currentWeekIsDone ? monday.add(oneWeek) : monday;
    const endDT = addDays(startDT, daysToAdd);

    const startDate = startDT.toString();
    const endDate = endDT.toString();

    const { getDay, offset } = days(startDT);


    console.log(`Start date: ${startDate}, End date: ${endDate}, Days to add: ${daysToAdd}, Monday: ${getMonday(today)}`);

    const wellnessToday = wellness.find(x => x.date === today.toString());
    const workoutToday = transformed.find(x => x.date === today.toString());

    let fitness = workoutToday?.fitness ?? wellnessToday?.fitness ?? 0;
    let fatigue = workoutToday?.fatigue ?? wellnessToday?.fatigue ?? 0;

    let day = yesterday;
    let flipped = false;
    const forms = [];
    do {
        if (day.toString() === endDate) { flipped = true; }
        const form = fitness - fatigue;
        forms.push(`${day}: ${form.toFixed(2)} (${fitness.toFixed(2)} - ${fatigue.toFixed(2)})`);
        fitness = computeFitness(fitness, 0);
        fatigue = computeFatigue(fatigue, 0);

        day = day.add(oneDay);
    } while (!flipped);

    // const a = computeFitness(49.14, 0);
    // const b = computeFatigue(81.86, 0);
    // console.log(`Computed fitness: ${a.toFixed(2)}, fatigue: ${b.toFixed(2)}`);

    computeSchedules(daysToAdd, transformed, wellness, getDay, today);

    const a = 48.33;
    const b = 72.96;
    const c = computeRequiredTrainingLoad(a, b, -25);
    console.log(`Required training load: ${c.toFixed(2)}`);

    // console.log('Fitness and Fatigue Form:');
    // console.log(forms.join('\n'));
    if (forms) {
        return;
    }

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

    console.log('Prompt to OpenAI:');
    console.log(prompt);

    const response = await sendGptMessage([
        { role: 'system', content: 'You are a cycling coach.' },
        { role: 'user', content: prompt }
    ]);

    if (!response) {
        console.error('No response from OpenAI');
        return;
    }

    console.log('Response from OpenAI:');
    console.log(response);
}

const calculateCogganPowerZones = (ftp: number) => {
    return {
        zone_1_active_recovery: [0, 0.55 * ftp],
        zone_2_endurance: [0.55 * ftp, 0.75 * ftp],
        zone_3_tempo: [0.75 * ftp, 0.90 * ftp],
        zone_4_lactate_threshold: [0.90 * ftp, 1.05 * ftp],
        zone_5_vo2_max: [1.05 * ftp, 1.20 * ftp],
        zone_6_anaerobic_capacity: [1.20 * ftp, 1.50 * ftp],
        zone_7_neuromuscular_power: [1.50 * ftp, Infinity]
    } as const;
}

type Zones = ReturnType<typeof calculateCogganPowerZones>;

const zonesToStrings = (zones: Zones) => {
    return Object.fromEntries(Object.entries(zones).map(([key, [min, max]]) => {
        if (max === Infinity) {
            return [key, `${min.toFixed(0)}+ W`] as const;
        }
        return [key, `${min.toFixed(0)}-${max.toFixed(0)} W`] as const;
    }));
}

const getZoneForPower = (power: number, zones: Zones) => {
    for (const [zone, [min, max]] of Object.entries(zones)) {
        if (power >= min && power < max) {
            return zone.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
        }
    }
    return null;
}


function computeSchedules(
    daysToAdd: number,
    transformed: ReturnType<typeof pruneActivityFields>[],
    wellness: ReturnType<typeof pruneWellnessFields>[],
    getDay: (offset: number) => { formatted: string; date: Temporal.PlainDate; },
    today: Temporal.PlainDate
) {
    const schedules: ScheduleRecord[] = [];
    for (let i = -7; i <= daysToAdd; i++) {
        const day = getDay(i);
        const date = day.formatted;
        const ride = transformed.find(x => x.date === date);
        const wellnessRecord = wellness.find(x => x.date === date);

        const fitness = wellnessRecord?.fitness ?? ride?.fitness ?? 0;
        const fatigue = wellnessRecord?.fatigue ?? ride?.fatigue ?? 0;
        const form = fitness - fatigue;
        schedules.push({
            offset: i,
            date: getDay(i).formatted,
            fitness,
            fatigue,
            form,
            trainingLoad: ride?.trainingLoad
        });
    }

    for (let i = 0; i < schedules.length; i++) {
        const record = schedules[i];
        if (Temporal.PlainDate.from(record.date).until(today).days > 0) {
            if (!record.trainingLoad) {
                record.trainingLoad = 0;
            }
        }
        else if (Temporal.PlainDate.from(record.date).until(today).days < 0) {
            record.form = undefined;
            record.fatigue = undefined;
            record.fitness = undefined;
        }
    }

    schedules[7].form = schedules[7].form ?? -5;
    schedules[8].form = schedules[8].form ?? -10;
    schedules[9].form = schedules[9].form ?? -15;
    schedules[10].form = schedules[10].form ?? -20;
    schedules[11].form = schedules[11].form ?? -10;
    schedules[12].form = schedules[12].form ?? -30;
    schedules[13].form = schedules[13].form ?? -15;



    let fatigue = schedules[0].fatigue ?? 0;
    let fitness = schedules[0].fitness ?? 0;
    for (let i = 1; i < schedules.length; i++) {
        const record = schedules[i];
        if (record.trainingLoad === undefined) {
            let tss = computeRequiredTrainingLoad(fitness, fatigue, record.form ?? 0);

            if (tss < 0) { tss = 0; }

            record.trainingLoad = tss;
            fatigue = computeFatigue(fatigue, tss);
            fitness = computeFitness(fitness, tss);

            record.fatigue = fatigue;
            record.fitness = fitness;
        }
    }

    console.log('Schedule Records:');
    schedules.forEach(record => {
        console.log(`Offset: ${record.offset}, Date: ${record.date}, Fitness: ${record.fitness?.toFixed(2)}, Fatigue: ${record.fatigue?.toFixed(2)}, Form: ${record.form?.toFixed(2)}, Training Load: ${record.trainingLoad}`);
    });

    return schedules;
}

void go();
