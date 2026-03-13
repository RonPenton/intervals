"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendGptMessage = sendGptMessage;
exports.loadPrompt = loadPrompt;
const openai_1 = require("openai");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function sendGptMessage(messages) {
    const openai = new openai_1.OpenAI({ apiKey: process.env.OPEN_AI_API_KEY });
    console.log("Sending messages to OpenAI...");
    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        //            max_completion_tokens: 150,
        temperature: 0,
        top_p: 1,
    });
    console.log("Received completion from OpenAI.");
    fs_1.default.writeFileSync('gpt-response.json', JSON.stringify({
        messages,
        completion
    }, null, 2));
    return completion.choices[0].message.content;
}
function loadPrompt(name, data = {}) {
    const file = path_1.default.resolve('prompts', `${name}.md`);
    if (!fs_1.default.existsSync(file)) {
        throw new Error(`Prompt file not found: ${file}`);
    }
    let contents = fs_1.default.readFileSync(file, 'utf8').trim();
    for (const key in data) {
        contents = contents.replace(new RegExp(`{${key}}`, 'g'), data[key]);
    }
    return contents;
}
