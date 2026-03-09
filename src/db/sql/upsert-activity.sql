INSERT INTO activities
    (date, current_ftp, training_load, kj, normalized_watts,
     miles, duration, hours, elevation, mph, calories,
     temperature, intensity_factor, fatigue, fitness, zone, raw_json)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
ON CONFLICT (date) DO UPDATE SET
    current_ftp      = EXCLUDED.current_ftp,
    training_load    = EXCLUDED.training_load,
    kj               = EXCLUDED.kj,
    normalized_watts = EXCLUDED.normalized_watts,
    miles            = EXCLUDED.miles,
    duration         = EXCLUDED.duration,
    hours            = EXCLUDED.hours,
    elevation        = EXCLUDED.elevation,
    mph              = EXCLUDED.mph,
    calories         = EXCLUDED.calories,
    temperature      = EXCLUDED.temperature,
    intensity_factor = EXCLUDED.intensity_factor,
    fatigue          = EXCLUDED.fatigue,
    fitness          = EXCLUDED.fitness,
    zone             = EXCLUDED.zone,
    raw_json         = EXCLUDED.raw_json
