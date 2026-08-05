require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const workoutRoutes = require('./routes/workouts');
const mealRoutes = require('./routes/meals');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Workout app API is running' });
});

app.use('/auth', authRoutes);
app.use('/workouts', workoutRoutes);
app.use('/meals', mealRoutes);

const foodRoutes = require('./routes/foods');
app.use('/foods', foodRoutes);

const programRoutes = require('./routes/programs');
app.use('/programs', programRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});