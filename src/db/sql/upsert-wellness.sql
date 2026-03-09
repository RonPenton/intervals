INSERT INTO wellness
    (date, fitness, fatigue, fitness_load, fatigue_load, ramp_rate, raw_json)
VALUES ($1,$2,$3,$4,$5,$6,$7)
ON CONFLICT (date) DO UPDATE SET
    fitness      = EXCLUDED.fitness,
    fatigue      = EXCLUDED.fatigue,
    fitness_load = EXCLUDED.fitness_load,
    fatigue_load = EXCLUDED.fatigue_load,
    ramp_rate    = EXCLUDED.ramp_rate,
    raw_json     = EXCLUDED.raw_json
