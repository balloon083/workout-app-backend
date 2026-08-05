const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../config/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.post('/', async (req, res) => {
  const { food_name, calories, protein, carbs, fat, fiber, sugar, entry_date } = req.body;

  if (!food_name || calories === undefined) {
    return res.status(400).json({ error: 'food_name and calories are required' });
  }

  try {
    const query = entry_date
      ? `INSERT INTO meal_entries (user_id, food_name, calories, protein, carbs, fat, fiber, sugar, entry_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`
      : `INSERT INTO meal_entries (user_id, food_name, calories, protein, carbs, fat, fiber, sugar, entry_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE) RETURNING *`;

    const params = entry_date
      ? [req.userId, food_name, calories, protein ?? null, carbs ?? null, fat ?? null, fiber ?? null, sugar ?? null, entry_date]
      : [req.userId, food_name, calories, protein ?? null, carbs ?? null, fat ?? null, fiber ?? null, sugar ?? null];

    const result = await pool.query(query, params);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong logging the meal' });
  }
});

// PUT /meals/:id - update an existing entry (e.g. filling in a placeholder
// created by "Log Empty Meal", or correcting any logged meal)
router.put('/:id', async (req, res) => {
  const { food_name, calories, protein, carbs, fat, fiber, sugar } = req.body;

  if (!food_name || calories === undefined) {
    return res.status(400).json({ error: 'food_name and calories are required' });
  }

  try {
    const result = await pool.query(
      `UPDATE meal_entries
       SET food_name = $1, calories = $2, protein = $3, carbs = $4, fat = $5, fiber = $6, sugar = $7
       WHERE id = $8 AND user_id = $9 RETURNING *`,
      [
        food_name,
        calories,
        protein ?? null,
        carbs ?? null,
        fat ?? null,
        fiber ?? null,
        sugar ?? null,
        req.params.id,
        req.userId,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meal entry not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong updating the meal' });
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
    const entries = result.rows;

    const totals = entries.reduce(
      (acc, e) => {
        acc.totalCalories += e.calories || 0;
        acc.totalProtein += parseFloat(e.protein) || 0;
        acc.totalCarbs += parseFloat(e.carbs) || 0;
        acc.totalFat += parseFloat(e.fat) || 0;
        acc.totalFiber += parseFloat(e.fiber) || 0;
        acc.totalSugar += parseFloat(e.sugar) || 0;
        return acc;
      },
      { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, totalFiber: 0, totalSugar: 0 }
    );

    res.json({ entries, ...totals });
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