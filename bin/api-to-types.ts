import { readFileSync } from 'fs';
import { resolve } from 'path';
import openapiTS from 'openapi-typescript';

const file = './src/intervals-api.json';

async function generateTypes(filePath: string) {
    const absPath = resolve(filePath);
    const openapiContent = readFileSync(absPath, 'utf8');
    const output = await openapiTS(openapiContent, {
    });
    console.log(output);
}

generateTypes(file).catch(err => {
    console.error('Error generating types:', err);
    process.exit(1);
});
