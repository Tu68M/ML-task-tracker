// server/seed.js
const pool = require('./db');

const seedDatabase = async () => {
  try {
    console.log('Проверка базы данных...');

    // 1. Создаем таблицы (только если их еще нет)
    // Обратите внимание: мы убрали DROP TABLE.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS auth_users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT,
        color TEXT
      );

      CREATE TABLE IF NOT EXISTS labels (
        name TEXT PRIMARY KEY
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        assignee_id TEXT REFERENCES auth_users(id) ON DELETE SET NULL,
        deadline DATE,
        priority TEXT CHECK (priority IN ('normal', 'urgent', 'critical')),
        status TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'done')),
        labels TEXT[] NOT NULL DEFAULT '{}',
        project_id TEXT NOT NULL REFERENCES projects(id),
        work NUMERIC(5, 2) NOT NULL DEFAULT 1.0,
        complexity INTEGER NOT NULL DEFAULT 3 CHECK (complexity >= 1 AND complexity <= 5),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS task_dependencies (
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        depends_on_task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        PRIMARY KEY (task_id, depends_on_task_id),
        CONSTRAINT no_self_dependency CHECK (task_id != depends_on_task_id)
      );
    `);

    console.log('Таблицы готовы.');

    // 2. Добавляем базовые данные (проекты и метки), если их нет
    const projectsCount = await pool.query('SELECT count(*)::int FROM projects');
    if (projectsCount.rows[0].count === 0) {
      await pool.query(`
        INSERT INTO projects (id, name, color) VALUES 
          ('bank-site', 'Сайт для банка', '#f5b83d'),
          ('delivery', 'Сервис доставки', '#8b5cf6'),
          ('print-branding', 'Брендинг типографии', '#22b07d'),
          ('consulting', 'Консультации', '#ef5b5b');
      `);
      console.log('Проекты добавлены.');
    }

    const labelsCount = await pool.query('SELECT count(*)::int FROM labels');
    if (labelsCount.rows[0].count === 0) {
      await pool.query(`
        INSERT INTO labels (name) VALUES 
          ('Аналитика'), ('Дизайн'), ('Исследования'), ('Разработка'), ('Продвижение');
      `);
      console.log('Метки добавлены.');
    }

    console.log('✅ База данных готова к работе!');
  } catch (err) {
    console.error('Ошибка при инициализации базы данных:', err);
  } finally {
    await pool.end();
  }
};

seedDatabase();