import 'dotenv-json2/config';
import fs from 'fs';
import { getRides } from './intervals-api';
import { pruneActivityFields } from './intervals-transformers';
import { loadPrompt, sendGptMessage } from './openai';

const bullet = (text: string) => `- ${text}`;

async function go() {
    console.log('Fetching rides from Intervals.icu...');
    const rides = await getRides();
    const transformed = rides.map(pruneActivityFields);

    const outputFile = './activities.json';
    const activities = JSON.stringify(transformed);
    fs.writeFileSync(outputFile, activities);


    // set this to true if it's like Saturday or Sunday night and want the next
    // week instead of the current week. 
    const currentWeekIsDone = false;

    const now = new Date();
    const today = formatDate(now);
    const startDT = currentWeekIsDone ? addDays(getMonday(now), 7) : getMonday(now);
    const endDT = addDays(startDT, 6);

    const startDate = formatDate(startDT);
    const endDate = formatDate(endDT);

    const pastDays = getPastDays(now, startDT);
    console.log(`Start date: ${startDate}, End date: ${endDate}`);
    console.log(`Past days: ${pastDays.join(', ')}`);

    const ftp = transformed[0].currentFtp;
    const zones = calculateCogganPowerZones(ftp);

    const pastActivities = pastDays.map(day => {
        const activity = transformed.find(x => x.date === day);
        if(!activity && day == today) { return [] }
        if(!activity) {
            return [`On ${day}, I will rest.`];
        }
        return [`On ${day}, I will ride ${activity.miles} miles, for ${activity.duration}, in ${getZoneForPower(activity.normalizedWatts, zones)}.`];
    }).flat();

    const restrictions = [
        "7/5 is a rest day.",
        "7/6 is a rest day.",
        ...pastActivities
    ].map(bullet).join('\n');

    const notes = [
        "I cannot ride more than 25 miles on weekdays.",
        "In general, the day before a long ride should be light recovery or rest.",
        "Long rides, above 35 miles, should be in Zone 2."
    ].map(bullet).join('\n');

    const goals = [
        'I want to ride at least 100 miles this week.',
        'I want to ride around 50 miles on Friday, July 4th, 2025.'
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

const getPastDays = (currentDate: Date, startDate: Date) => {
    const pastDays = [];
    const oneDay = 24 * 60 * 60 * 1000; // milliseconds in a day
    const daysDifference = Math.round((startDate.getTime() - currentDate.getTime()) / (oneDay));
    for(let i = daysDifference; i <= 0; i++) {
        pastDays.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + i));
    }

    return pastDays.map(formatDate);
}

export const getMonday = (date: Date) => {
    const day = date.getDay();
    const diff = (day < 1 ? 8 : 1) - day;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + diff);
};

const formatDate = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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

export const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

void go();
