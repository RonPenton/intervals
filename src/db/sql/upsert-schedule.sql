INSERT INTO schedules
    (date, offset_days, fitness, fatigue, form, training_load,
     needs_ride, zone, ride_options, meta)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
ON CONFLICT (date) DO UPDATE SET
    offset_days   = EXCLUDED.offset_days,
    fitness       = EXCLUDED.fitness,
    fatigue       = EXCLUDED.fatigue,
    form          = EXCLUDED.form,
    training_load = EXCLUDED.training_load,
    needs_ride    = EXCLUDED.needs_ride,
    zone          = EXCLUDED.zone,
    ride_options  = EXCLUDED.ride_options,
    meta          = EXCLUDED.meta
