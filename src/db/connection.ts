import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/intervals';

let connected = false;

export async function connect(): Promise<void> {
    if (!connected) {
        await mongoose.connect(MONGO_URI);
        connected = true;
        console.log('Connected to MongoDB.');
    }
}

export async function disconnect(): Promise<void> {
    if (connected) {
        await mongoose.disconnect();
        connected = false;
    }
}
