import "dotenv-json2/config";
import Handlebars from "handlebars";
import "./workouts";

const workout = `
Warmup
* 2m 50%

Main Set
{{ #steps 3 name="rep"}}
Rep {{add rep 1}}
    {{#steps 65 75 5 name="power"}}
* 2m 50%
* {{add rep 2}}m {{range power 5 7}}%
    {{/steps}}
{{/steps}}
`;

async function main() {
    const template = Handlebars.compile(workout);
    const result = template({});
    console.log(result);
}

main();
