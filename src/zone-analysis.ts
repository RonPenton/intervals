import * as fs from "fs";

const data = JSON.parse(fs.readFileSync("src/temp.json", "utf8"));

const ftp: number = data.powerGuidanceSummary.userFTP;

// Standard 7-zone model based on % of FTP
const zones = [
  { name: "Z1 Active Recovery", min: 0,    max: 0.55 },
  { name: "Z2 Endurance",        min: 0.55, max: 0.75 },
  { name: "Z3 Tempo",            min: 0.75, max: 0.90 },
  { name: "Z4 Threshold",        min: 0.90, max: 1.05 },
  { name: "Z5 VO2 Max",          min: 1.05, max: 1.20 },
  { name: "Z6 Anaerobic",        min: 1.20, max: 1.50 },
  { name: "Z7 Neuromuscular",    min: 1.50, max: Infinity },
];

const zoneTimes = new Array(zones.length).fill(0);

function getZone(power: number): number {
  const pct = power / ftp;
  return zones.findIndex((z) => pct >= z.min && pct < z.max);
}

function fmt(totalSeconds: number): string {
  const rounded = Math.round(totalSeconds);
  const h = Math.floor(rounded / 3600);
  const m = Math.floor((rounded % 3600) / 60);
  const s = rounded % 60;
  return h > 0
    ? `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`
    : `${m}m ${s.toString().padStart(2, "0")}s`;
}

console.log(`FTP: ${ftp}W\n`);
console.log("Zone boundaries:");
zones.forEach((z) => {
  const lo = Math.round(z.min * ftp);
  const hi = z.max === Infinity ? "∞" : Math.round(z.max * ftp) - 1;
  console.log(`  ${z.name}: ${lo}–${hi}W`);
});
console.log();

console.log("Segments:");
console.log(
  "  #   Power  Zone                Duration   Cumulative dist"
);
console.log("  " + "-".repeat(68));

const splits = data.powerGuidanceSplits;
let totalDuration = 0;
let weightedPower4 = 0;

splits.forEach((split: any, i: number) => {
  const power: number = split.powerTarget;
  const duration: number = split.estimatedDuration;
  const zoneIdx = getZone(power);
  zoneTimes[zoneIdx] += duration;
  totalDuration += duration;
  weightedPower4 += Math.pow(power, 4) * duration;

  const distKm = (split.cumulativeDistance / 1000).toFixed(2);
  const zoneName = zones[zoneIdx].name;
  console.log(
    `  ${String(i + 1).padStart(2)}  ${String(power).padStart(3)}W  ${zoneName.padEnd(20)}  ${fmt(duration).padStart(10)}   ${distKm} km`
  );
});

console.log();
console.log("=".repeat(60));
console.log("TIME IN EACH ZONE:");
console.log("=".repeat(60));

zones.forEach((z, i) => {
  const t = zoneTimes[i];
  if (t === 0) return;
  const pct = ((t / totalDuration) * 100).toFixed(1);
  console.log(`  ${z.name.padEnd(22)}: ${fmt(t).padStart(12)}  (${pct}%)`);
});

console.log("-".repeat(60));
console.log(`  ${"Total".padEnd(22)}: ${fmt(totalDuration).padStart(12)}`);

// TSS = (duration_s × NP × IF) / (FTP × 3600) × 100
// NP  = duration-weighted 4th-power mean of segment powers
// IF  = NP / FTP
const np  = Math.pow(weightedPower4 / totalDuration, 0.25);
const IF_ = np / ftp;
const tss = (totalDuration * np * IF_) / (ftp * 3600) * 100;

console.log();
console.log("=".repeat(60));
console.log("TRAINING STRESS SCORE:");
console.log("=".repeat(60));
console.log(`  Normalized Power (NP): ${np.toFixed(1)}W`);
console.log(`  Intensity Factor (IF): ${IF_.toFixed(3)}`);
console.log(`  TSS:                   ${tss.toFixed(1)}`);
