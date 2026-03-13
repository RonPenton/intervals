"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connect = connect;
exports.disconnect = disconnect;
const mongoose_1 = __importDefault(require("mongoose"));
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/intervals';
let connected = false;
async function connect() {
    if (!connected) {
        await mongoose_1.default.connect(MONGO_URI);
        connected = true;
        console.log('Connected to MongoDB.');
    }
}
async function disconnect() {
    if (connected) {
        await mongoose_1.default.disconnect();
        connected = false;
    }
}
