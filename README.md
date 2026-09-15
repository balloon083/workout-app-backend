# Workout App — Backend

Node.js/Express + PostgreSQL backend for a full-stack workout logging and calorie tracking app.

## Features
- User auth and session management
- Workout, set, and program logging (see `migration_add_*.sql`)
- Macro tracking (`migration_add_macros.sql`)
- REST API consumed by [workout-app-frontend](https://github.com/balloon083/workout-app-frontend)

## ML component
Calorie tracking is backed by a custom PyTorch CNN trained on Indian food images.
Model code lives in [food-recognition-cnn](https://github.com/balloon083/food-recognition-cnn).

## Stack
Node.js, Express, PostgreSQL

## Setup
\`\`\`bash
git clone https://github.com/balloon083/workout-app-backend
cd workout-app-backend
npm install
# set up .env with your PostgreSQL connection string
psql -d your_db -f schema.sql
npm start
\`\`\`
