"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = void 0;
const better_auth_1 = require("better-auth");
const mongodb_1 = require("better-auth/adapters/mongodb");
const mongodb_2 = require("mongodb");
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/intervals";
const client = new mongodb_2.MongoClient(MONGO_URI);
const db = client.db();
exports.auth = (0, better_auth_1.betterAuth)({
    database: (0, mongodb_1.mongodbAdapter)(db),
    emailAndPassword: {
        enabled: true,
    },
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    trustedOrigins: [
        process.env.BETTER_AUTH_URL || "http://localhost:3000",
    ],
});
