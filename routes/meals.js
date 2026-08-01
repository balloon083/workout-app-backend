const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../config/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.post('/', async (req, res) => {
  const { food_name, calories, entry_date } = req.body;

  if (!food_name || calories === undefined) {
    return res.status(400).json({ error: 'food_name and calories are required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO meal_entries (user_id, food_name, calories, entry_date) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.userId, food_name, calories, entry_date || new Date()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong logging the meal' });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM meal_entries WHERE user_id = $1 ORDER BY entry_date DESC, id DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong fetching meals' });
  }
});

router.get('/today', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM meal_entries WHERE user_id = $1 AND entry_date = CURRENT_DATE ORDER BY id DESC`,
      [req.userId]
    );
    const totalCalories = result.rows.reduce((sum, entry) => sum + entry.calories, 0);
    res.json({ entries: result.rows, totalCalories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong fetching today's meals" });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM meal_entries WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meal entry not found' });
    }
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong deleting the meal entry' });
  }
});

module.exports = router;