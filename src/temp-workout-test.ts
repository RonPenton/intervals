import { compileWorkout } from './workout';

const source = `
Warmup:
  2m @ 50%

Main Set:
  3x as rep:
    65..75 step 5 as power:
      2m @ 50%
      {rep+1}m @ {power-5}-{power+7}%
`;

const steps = compileWorkout(source);
console.log(JSON.stringify(steps, null, 2));
