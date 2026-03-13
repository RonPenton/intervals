"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const openapi_typescript_1 = __importDefault(require("openapi-typescript"));
const file = './src/intervals-api.json';
async function generateTypes(filePath) {
    const absPath = (0, path_1.resolve)(filePath);
    const openapiContent = (0, fs_1.readFileSync)(absPath, 'utf8');
    const output = await (0, openapi_typescript_1.default)(openapiContent, {});
    console.log(output);
}
generateTypes(file).catch(err => {
    console.error('Error generating types:', err);
    process.exit(1);
});
