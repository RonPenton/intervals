import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';

export type AIConversation = OpenAI.Chat.Completions.ChatCompletionMessageParam[];

export async function sendGptMessage(messages: AIConversation): Promise<string | null> {
    const openai = new OpenAI({ apiKey: process.env.OPEN_AI_API_KEY });

    console.log("Sending messages to OpenAI...");

    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        //            max_completion_tokens: 150,
        temperature: 0,
        top_p: 1,
    });

    console.log("Received completion from OpenAI.");

    fs.writeFileSync('gpt-response.json', JSON.stringify({
        messages,
        completion
    }, null, 2));

    return completion.choices[0].message.content;
}


export function loadPrompt(
    name: string,
    data: Record<string, any> = {}
): string {
    const file = path.resolve('prompts', `${name}.md`);
    if (!fs.existsSync(file)) {
        throw new Error(`Prompt file not found: ${file}`);
    }

    let contents = fs.readFileSync(file, 'utf8').trim();
    for (const key in data) {
        contents = contents.replace(new RegExp(`{${key}}`, 'g'), data[key]);
    }

    return contents;
}
