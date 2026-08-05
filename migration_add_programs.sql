CREATE TABLE IF NOT EXISTS programs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS program_exercises (
  id SERIAL PRIMARY KEY,
  program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  exercise_name VARCHAR(255) NOT NULL,
  exercise_order INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_program_exercises_program ON program_exercises(program_id);