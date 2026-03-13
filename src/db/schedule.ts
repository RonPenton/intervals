import mongoose, { Schema } from 'mongoose';
import { ScheduleRecord } from '../types';

const scheduleSchema = new Schema<ScheduleRecord>({
    date: { type: String, required: true, unique: true },
    fitness: Number,
    fatigue: Number,
    form: Number,
    trainingLoad: Number,

    targetForm: Schema.Types.Mixed,
    targetFormPercent: Schema.Types.Mixed,
    targetTomorrowForm: Number,
    targetTomorrowFormPercent: Number,
    targetFitness: Schema.Types.Mixed,
    targetFatigue: Schema.Types.Mixed,

    targetTrainingLoad: Number,
    minMinutes: Number,
    maxMinutes: Number,
    minZone: Number,
    maxZone: Number,

    needsRide: Boolean,
    rideOptions: [Schema.Types.Mixed],
    zone: Number,
});

export const ScheduleModel = mongoose.model<ScheduleRecord>('Schedule', scheduleSchema);
