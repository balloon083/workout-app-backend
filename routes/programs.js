const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../config/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

// POST /programs - save a named program (a reusable list of exercises)
// Body: { name, exercises: ["Squat", "Bench Press", ...] }
router.post('/', async (req, res) => {
  const { name, exercises } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Program name is required' });
  }
  if (!Array.isArray(exercises) || exercises.length === 0) {
    return res.status(400).json({ error: 'At least one exercise is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const programResult = await client.query(
      'INSERT INTO programs (user_id, name) VALUES ($1, $2) RETURNING id, name, created_at',
      [req.userId, name.trim()]
    );
    const program = programResult.rows[0];

    const insertedExercises = [];
    for (let i = 0; i < exercises.length; i++) {
      const exResult = await client.query(
        'INSERT INTO program_exercises (program_id, exercise_name, exercise_order) VALUES ($1, $2, $3) RETURNING *',
        [program.id, exercises[i], i + 1]
      );
      insertedExercises.push(exResult.rows[0]);
    }

    await client.query('COMMIT');
    res.status(201).json({ ...program, exercises: insertedExercises });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Something went wrong saving the program' });
  } finally {
    client.release();
  }
});

// GET /programs - list this user's saved programs with their exercises
router.get('/', async (req, res) => {
  try {
    const programsResult = await pool.query(
      'SELECT * FROM programs WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    const programs = programsResult.rows;

    if (programs.length === 0) {
      return res.json([]);
    }

    const programIds = programs.map((p) => p.id);
    const exercisesResult = await pool.query(
      'SELECT * FROM program_exercises WHERE program_id = ANY($1::int[]) ORDER BY exercise_order',
      [programIds]
    );

    const exercisesByProgram = {};
    for (const ex of exercisesResult.rows) {
      if (!exercisesByProgram[ex.program_id]) exercisesByProgram[ex.program_id] = [];
      exercisesByProgram[ex.program_id].push(ex);
    }

    const withExercises = programs.map((p) => ({
      ...p,
      exercises: exercisesByProgram[p.id] || [],
    }));

    res.json(withExercises);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong fetching programs' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM programs WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Program not found' });
    }
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong deleting the program' });
  }
});

module.exports = router;