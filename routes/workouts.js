const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../config/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.post('/', async (req, res) => {
  const { workout_date, notes, exercises } = req.body;

  if (!Array.isArray(exercises) || exercises.length === 0) {
    return res.status(400).json({ error: 'At least one exercise is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const workoutResult = await client.query(
      'INSERT INTO workouts (user_id, workout_date, notes) VALUES ($1, $2, $3) RETURNING id, workout_date, notes',
      [req.userId, workout_date || new Date(), notes || null]
    );
    const workout = workoutResult.rows[0];

    const insertedExercises = [];
    for (const ex of exercises) {
      const exResult = await client.query(
        'INSERT INTO exercises (workout_id, exercise_name, sets, reps, weight) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [workout.id, ex.exercise_name, ex.sets || null, ex.reps || null, ex.weight || null]
      );
      insertedExercises.push(exResult.rows[0]);
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

router.get('/', async (req, res) => {
  try {
    const workoutsResult = await pool.query(
      'SELECT * FROM workouts WHERE user_id = $1 ORDER BY workout_date DESC, id DESC',
      [req.userId]
    );
    const workouts = workoutsResult.rows;

    if (workouts.length === 0) {
      return res.json([]);
    }

    const workoutIds = workouts.map((w) => w.id);
    const exercisesResult = await pool.query(
      'SELECT * FROM exercises WHERE workout_id = ANY($1::int[])',
      [workoutIds]
    );

    const exercisesByWorkout = {};
    for (const ex of exercisesResult.rows) {
      if (!exercisesByWorkout[ex.workout_id]) exercisesByWorkout[ex.workout_id] = [];
      exercisesByWorkout[ex.workout_id].push(ex);
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