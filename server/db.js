require('dotenv').config(); // Загружаем переменные из .env
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST ?? 'localhost', // ?? - если переменной нет, возьмется 'localhost'
  database: process.env.DB_NAME ?? 'task_tracker',
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT ?? 5432),
});

module.exports = pool;