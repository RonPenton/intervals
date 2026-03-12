import 'dotenv-json2/config';
import fs from 'fs';
import { getWellnessOnDate, setWellnessOnDate } from './src/intervals-api';
import { Temporal } from 'temporal-polyfill';
import { addDays } from './src/days';

export type Entry = {
    date: string;
    lb: number;
}

const filename = 'weights.json';

const weights: Entry[] = JSON.parse(fs.readFileSync(filename, 'utf-8'));

const map = new Map<string, Entry>();

weights.forEach(entry => {
    map.set(entry.date, entry);
});


const unique = Array.from(map.values());
unique.sort((a: Entry, b: Entry) => new Date(a.date).getTime() - new Date(b.date).getTime());

//console.log(unique);



// function lestore() {
//     if (!thestorage) { thestorage = [] }
//     const links = document.querySelectorAll("a.colored");
//     const items = Array.from(links).map(link => link.parentElement).filter(link => link.tagName == 'TD').map(link => link.parentElement).map(tr => ({ date: tr.children[0].children[0].href.match(/\d{4}-\d{2}-\d{2}/i)[0], resting: tr.children[1].innerText }));
//     thestorage = thestorage.concat(items)
//     console.log('LESTORE');
// }

// function leclickyloop() {
//     if (i === 0) { lestore(); return; }
//     i--;
//     leclicky();
//     setTimeout(leclickyloop, 100);
// }

// function leclickystart() {
//     i = 10;
//     leclickyloop()
// }

// function leclicky() {
//     const button = Array.from(document.querySelectorAll("button"))
//         .find(btn => btn.textContent.trim() === "Show More");

//     if (button) {
//         button.click();
//     } else {
//         console.log("No 'Show More' button found.");
//     }
// }

const poundsToKg = (lb: number) => {
    return Math.round(lb / 2.20462 * 10) / 10;
}

const kgToPounds = (kg: number) => {
    return Math.round(kg * 2.20462 * 10) / 10;
}

async function go() {



    const startDate = Temporal.PlainDate.from('2021-09-02');
    const endDate = Temporal.PlainDate.from('2022-01-29');

    const startEntry = map.get(startDate.toString());
    const endEntry = map.get(endDate.toString());

    console.log({ startEntry, endEntry });

    if (!startEntry || !endEntry) {
        throw new Error('Start or end entry not found');
    }

    let weight = startEntry.lb;
    const difference = endEntry.lb - startEntry.lb;
    const days = startDate.until(endDate).days;
    const dailyChange = difference / days;

    console.log({ weight, difference, days, dailyChange });

    let date = addDays(startDate, 1);
    while (date.toString() != endDate.toString()) {
        //console.log(date.toString());

        weight += dailyChange;
        const kg = poundsToKg(weight);

        const wellness = await getWellnessOnDate(date.toString());
        if (wellness.weight !== null) {
            console.log(` ${date.toString()} --  Weight: ${weight.toFixed(1)} lb (${kg.toFixed(1)} kg)`);
            wellness.weight = kg;
            await setWellnessOnDate(date.toString(), wellness);
        }

        date = addDays(date, 1);
    }

}

void go();

async function updateWellness(entry: Entry) {
    const wellness = await getWellnessOnDate(entry.date);
    //console.log(wellness);

    const val = entry.lb;
    const kg = Math.round(val / 2.20462 * 10) / 10;
    const oldkg = Number((wellness.weight ?? 0).toFixed(1));

    if (oldkg !== val) {
        console.log(`Updating wellness for ${entry.date}: ${oldkg} => ${kg}`);
        wellness.weight = kg;
        await setWellnessOnDate(entry.date, wellness);
    }
}