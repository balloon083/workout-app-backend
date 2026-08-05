const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../config/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

// POST /workouts
// Body: { notes, duration_seconds, exercises: [{ exercise_name, sets: [{ weight, reps, completed }] }] }
router.post('/', async (req, res) => {
  const { workout_date, notes, duration_seconds, exercises } = req.body;

  if (!Array.isArray(exercises)) {
    return res.status(400).json({ error: 'Exercises must be an array (can be empty)' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const workoutResult = await client.query(
      'INSERT INTO workouts (user_id, workout_date, notes, duration_seconds) VALUES ($1, $2, $3, $4) RETURNING id, workout_date, notes, duration_seconds, created_at',
      [req.userId, workout_date || new Date(), notes || null, duration_seconds || null]
    );
    const workout = workoutResult.rows[0];

    const insertedExercises = [];
    for (const ex of exercises) {
      const exResult = await client.query(
        'INSERT INTO exercises (workout_id, exercise_name) VALUES ($1, $2) RETURNING id, exercise_name',
        [workout.id, ex.exercise_name]
      );
      const exerciseRow = exResult.rows[0];

      const insertedSets = [];
      const setsList = Array.isArray(ex.sets) ? ex.sets : [];
      for (let i = 0; i < setsList.length; i++) {
        const s = setsList[i];
        const setResult = await client.query(
          'INSERT INTO sets (exercise_id, set_order, weight, reps, completed) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [exerciseRow.id, i + 1, s.weight ?? null, s.reps ?? null, s.completed ?? false]
        );
        insertedSets.push(setResult.rows[0]);
      }

      insertedExercises.push({ ...exerciseRow, sets: insertedSets });
    }

    await client.query('COMMIT');
    res.status(201).json({ ...workout, exercises: insertedExercises });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Something went wrong logging the workout' });
  } finally {
    client.release();
  }
});

// GET /workouts - list this user's workouts with exercises and their sets attached
router.get('/', async (req, res) => {
  try {
    const workoutsResult = await pool.query(
      'SELECT * FROM workouts WHERE user_id = $1 ORDER BY created_at DESC, id DESC',
      [req.userId]
    );
    const workouts = workoutsResult.rows;

    if (workouts.length === 0) {
      return res.json([]);
    }

    const workoutIds = workouts.map((w) => w.id);
    const exercisesResult = await pool.query(
      'SELECT * FROM exercises WHERE workout_id = ANY($1::int[]) ORDER BY id',
      [workoutIds]
    );
    const exercises = exercisesResult.rows;

    let setsByExercise = {};
    if (exercises.length > 0) {
      const exerciseIds = exercises.map((e) => e.id);
      const setsResult = await pool.query(
        'SELECT * FROM sets WHERE exercise_id = ANY($1::int[]) ORDER BY set_order',
        [exerciseIds]
      );
      for (const s of setsResult.rows) {
        if (!setsByExercise[s.exercise_id]) setsByExercise[s.exercise_id] = [];
        setsByExercise[s.exercise_id].push(s);
      }
    }

    const exercisesByWorkout = {};
    for (const ex of exercises) {
      if (!exercisesByWorkout[ex.workout_id]) exercisesByWorkout[ex.workout_id] = [];
      exercisesByWorkout[ex.workout_id].push({
        ...ex,
        sets: setsByExercise[ex.id] || [],
      });
    }

    const withExercises = workouts.map((w) => ({
      ...w,
      exercises: exercisesByWorkout[w.id] || [],
    }));

    res.json(withExercises);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong fetching workouts' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM workouts WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workout not found' });
    }
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong deleting the workout' });
  }
});

module.exports = router;