import { computeFatigue, computeFitness, computeRequiredTrainingLoad, computeRequiredTrainingLoadFromFormPercentage } from "./training";

const startingCtl = 50;
const maintainForm = -20;
const formMode: 'percentage' | 'absolute' = 'absolute';
const daysToSimulate = 42;

const startingAtl = formMode == 'percentage'
    ? startingCtl + -(startingCtl * (maintainForm / 100))
    : startingCtl + -(maintainForm);

console.log({ startingCtl, startingAtl, maintainForm, formMode });

let ctl = startingCtl;
let atl = startingAtl;
let tss = 0;

for (let i = 0; i < daysToSimulate; i++) {

    let newTss = formMode === 'absolute'
        ? computeRequiredTrainingLoad(ctl, atl, maintainForm)
        : computeRequiredTrainingLoadFromFormPercentage(ctl, atl, maintainForm / 100);

    const newCtl = computeFitness(ctl, newTss);
    const diff = newCtl - ctl;
    const diffTss = newTss - tss;
    atl = computeFatigue(atl, newTss);
    ctl = newCtl;
    tss = newTss;
            
    console.log(`Day ${i + 1}:\tCTL: ${ctl.toFixed(1)},\tΔCTL: ${diff.toFixed(2)},\tATL: ${atl.toFixed(1)},\tTSS: ${tss.toFixed(1)},\tΔTSS: ${diffTss.toFixed(2)}`);
}


