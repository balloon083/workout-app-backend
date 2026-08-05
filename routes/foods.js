const express = require('express');
const authMiddleware = require('../config/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

const NUTRIENT_MAP = {
  Energy: 'calories',
  Protein: 'protein',
  'Carbohydrate, by difference': 'carbs',
  'Total lipid (fat)': 'fat',
  'Fiber, total dietary': 'fiber',
  'Sugars, total including NLEA': 'sugar',
  'Sugars, total': 'sugar',
};

function extractMacros(foodNutrients) {
  const macros = { calories: null, protein: null, carbs: null, fat: null, fiber: null, sugar: null };
  if (!Array.isArray(foodNutrients)) return macros;

  for (const n of foodNutrients) {
    const name = n.nutrientName;
    const key = NUTRIENT_MAP[name];
    if (key && macros[key] === null) {
      macros[key] = n.value ?? null;
    }
  }
  return macros;
}

router.get('/search', async (req, res) => {
  const { query } = req.query;

  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'A search query is required' });
  }

  const apiKey = process.env.USDA_API_KEY || 'DEMO_KEY';

  try {
    const url = new URL('https://api.nal.usda.gov/fdc/v1/foods/search');
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('query', query);
    url.searchParams.set('pageSize', '20');
    url.searchParams.set('dataType', 'Foundation,SR Legacy,Branded');

    const usdaResponse = await fetch(url.toString());
    if (!usdaResponse.ok) {
      console.error('USDA API error:', usdaResponse.status, await usdaResponse.text());
      return res.status(502).json({ error: 'Food database lookup failed' });
    }

    const data = await usdaResponse.json();
    const foods = (data.foods || []).map((f) => ({
      fdcId: f.fdcId,
      description: f.description,
      brandOwner: f.brandOwner || null,
      servingSize: f.servingSize || null,
      servingSizeUnit: f.servingSizeUnit || null,
      ...extractMacros(f.foodNutrients),
    }));

    res.json(foods);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong searching for food' });
  }
});

module.exports = router;