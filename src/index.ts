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

    const outputFile = './src/activities.json';
    const activities = JSON.stringify(transformed);
    fs.writeFileSync(outputFile, activities);

    const today = new Date().toLocaleDateString();
    const restrictions = [
        "6/30 is a rain/rest day.",
        "7/5 is a rest day.",
        "7/6 is a rest day."
    ].map(bullet).join('\n');

    const notes = [
        "I cannot ride more than 25 miles on weekdays.",
        "In general, the day before a long ride should be light recovery or rest."
    ].map(bullet).join('\n');

    const goals = [
        'I want to ride 50 miles on Friday, July 4th, 2025.',
        'I want to ride 100 miles this week'
    ].map(bullet).join('\n');

    const ftp = transformed[0].currentFtp;

    const prompt = loadPrompt('cycling', {
        activities,
        today,
        restrictions,
        notes,
        goals,
        ftp
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

void go();
