CREATE TABLE IF NOT EXISTS sets (
  id SERIAL PRIMARY KEY,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  set_order INTEGER NOT NULL,
  weight NUMERIC(6, 2),
  reps INTEGER,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sets_exercise ON sets(exercise_id);