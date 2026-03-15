import mongoose, { Schema } from 'mongoose';

const targetValuesSchema = new Schema({
    date: { type: String, required: true },
    userId: { type: String, required: true },

    targetForm: Schema.Types.Mixed,           // number | 'decay' | 'maintain' | Delta
    targetFormPercent: Schema.Types.Mixed,     // number | Delta
    targetTomorrowForm: Number,
    targetTomorrowFormPercent: Number,
    targetFitness: Schema.Types.Mixed,        // number | 'maintain' | Delta
    targetFatigue: Schema.Types.Mixed,        // number | 'maintain' | Delta
    targetTrainingLoad: Number,
    minMinutes: Number,
    maxMinutes: Number,
    minZone: Number,
    maxZone: Number,
}, {
    timestamps: true,
});

targetValuesSchema.index({ userId: 1, date: 1 }, { unique: true });

export const TargetValuesModel = mongoose.model('TargetValues', targetValuesSchema);
