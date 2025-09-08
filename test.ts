import 'dotenv-json2/config';
import fs from 'fs';
import { getWellnessOnDate, setWellnessOnDate } from './src/intervals-api';

export type Entry = {
    date: string;
    resting: string;
}

const filename = 'hr.json';

const hr: Entry[] = JSON.parse(fs.readFileSync(filename, 'utf-8'));

const map = new Map<string, Entry>();

hr.forEach(entry => {
    map.set(entry.date, entry);
});


const unique = Array.from(map.values());
unique.sort((a: Entry, b: Entry) => new Date(a.date).getTime() - new Date(b.date).getTime());

console.log(unique);



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

async function go() {
    for(const entry of unique) {
        await updateWellness(entry);
    }
}

void go();

async function updateWellness(entry: Entry) {
    const wellness = await getWellnessOnDate(entry.date);
    //console.log(wellness);

    const val = parseInt(entry.resting);

    if(wellness.restingHR !== val) {
        console.log(`Updating wellness for ${entry.date}: ${wellness.restingHR} => ${val}`);
        wellness.restingHR = val;
        await setWellnessOnDate(entry.date, wellness);
    }
}