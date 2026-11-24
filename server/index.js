// server/index.js
require('dotenv').config(); // Загружаем .env
const express = require('express');
const cors = require('cors');
const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;

// Проверка, что секретный ключ задан в .env
if (!JWT_SECRET) {
  console.error('ОШИБКА: JWT_SECRET не задан в файле .env');
  process.exit(1);
}

app.use(cors());
app.use(express.json());

const serverError = (res, err) => {
  console.error(err);
  res.status(500).json({ error: 'Ошибка сервера' });
};

// Вспомогательная функция для получения ID пользователя из токена
const getUserIdFromToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.userId;
  } catch (err) {
    return null;
  }
};

// ==========================================
// --- АУТЕНТИФИКАЦИЯ (Регистрация и Вход) ---
// ==========================================

app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || username.length < 3) {
    return res.status(400).json({ error: 'Никнейм должен быть не менее 3 символов' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
  }

  try {
    const existingUser = await pool.query('SELECT id FROM auth_users WHERE username = $1', [username]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Этот никнейм уже занят' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await pool.query(
      `INSERT INTO auth_users (id, username, password_hash) 
       VALUES ($1, $2, $3) 
       RETURNING id, username`,
      [randomUUID(), username, passwordHash]
    );

    const token = jwt.sign(
      { userId: newUser.rows[0].id, username: newUser.rows[0].username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({ message: 'Регистрация успешна', token, user: newUser.rows[0] });
  } catch (err) {
    serverError(res, err);
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Введите никнейм и пароль' });
  }

  try {
    const result = await pool.query('SELECT id, username, password_hash FROM auth_users WHERE username = $1', [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Неверный никнейм или пароль' });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Неверный никнейм или пароль' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ message: 'Вход выполнен', token, user: { id: user.id, username: user.username } });
  } catch (err) {
    serverError(res, err);
  }
});

// ==========================================
// --- ЧТЕНИЕ ДАННЫХ (Защищенные роуты) ---
// ==========================================

app.get('/api/user', async (req, res) => {
  const userId = getUserIdFromToken(req);
  if (!userId) return res.status(401).json({ error: 'Не авторизован' });

  try {
    const { rows } = await pool.query('SELECT id, username FROM auth_users WHERE id = $1', [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const user = rows[0];
    res.json({
      id: user.id,
      name: user.username,
      email: `${user.username}@example.com`, // Заглушка
      avatarUrl: '', // Пусто, чтобы фронтенд рисовал букву
    });
  } catch (err) {
    serverError(res, err);
  }
});

app.get('/api/counters', async (req, res) => {
  const userId = getUserIdFromToken(req);
  if (!userId) return res.status(401).json({ error: 'Не авторизован' });

  try {
    const allTasksRes = await pool.query('SELECT count(*)::int FROM tasks WHERE user_id = $1', [userId]);
    // Считаем "мои задачи" как те, что созданы мной и не выполнены
    const myTasksRes = await pool.query("SELECT count(*)::int FROM tasks WHERE user_id = $1 AND status != 'done'", [userId]);
    
    res.json({
      myTasks: myTasksRes.rows[0].count,
      allTasks: allTasksRes.rows[0].count,
      workspace: 5, // Заглушка
    });
  } catch (err) {
    serverError(res, err);
  }
});

app.get('/api/projects', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name, color FROM projects');
    res.json(rows);
  } catch (err) {
    serverError(res, err);
  }
});

app.get('/api/assignees', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name FROM assignees ORDER BY name');
    res.json(rows);
  } catch (err) {
    serverError(res, err);
  }
});

app.get('/api/labels', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT name FROM labels ORDER BY name');
    res.json(rows.map((r) => r.name));
  } catch (err) {
    serverError(res, err);
  }
});

app.get('/api/tasks', async (req, res) => {
  const userId = getUserIdFromToken(req);
  if (!userId) return res.status(401).json({ error: 'Не авторизован' });

  try {
    // Мы делаем LEFT JOIN с таблицей зависимостей, чтобы вытащить ID родителя (depends_on_task_id)
    const { rows } = await pool.query(`
      SELECT 
        t.id, t.title, t.description,
        t.assignee_id AS "assigneeId",
        t.deadline::text AS deadline,
        t.priority, t.status, t.labels,
        t.project_id AS "projectId",
        t.work, t.complexity,
        t.created_at AS "createdAt",
        (SELECT count(*) FROM task_dependencies td WHERE td.depends_on_task_id = t.id)::int AS "n_dependents",
        -- Достаем ID родителя (если задача является подзадачей)
        (SELECT td.depends_on_task_id FROM task_dependencies td WHERE td.task_id = t.id LIMIT 1) AS "parentId"
      FROM tasks t
      WHERE t.user_id = $1
      ORDER BY t.created_at ASC 
    `, [userId]);

    res.json(rows);
  } catch (err) {
    serverError(res, err);
  }
});

// ==========================================
// --- СОЗДАНИЕ И ОБНОВЛЕНИЕ ЗАДАЧ ---
// ==========================================

const STATUSES = ['todo', 'in_progress', 'done'];

app.post('/api/tasks', async (req, res) => {
  const userId = getUserIdFromToken(req);
  if (!userId) return res.status(401).json({ error: 'Не авторизован' });

  const {
    title, description = '', assigneeId = null, deadline = null,
    priority = null, status = 'todo', labels = [], projectId,
    work = 1, complexity = 3, // <--- ДОБАВИЛИ НОВЫЕ ПОЛЯ
    parentId = null           // <--- ДОБАВИЛИ ID РОДИТЕЛЯ
  } = req.body;

  // Валидация (оставляем вашу и добавляем проверку на числовые поля)
  const cleanTitle = typeof title === 'string' ? title.trim() : '';
  if (cleanTitle.length < 3 || cleanTitle.length > 120) {
    return res.status(400).json({ error: 'Название должно быть от 3 до 120 символов' });
  }
  if (!projectId) return res.status(400).json({ error: 'Выберите проект' });
  
  const taskWork = Number(work);
  const taskComplexity = Number(complexity);
  if (isNaN(taskWork) || taskWork < 0.5) return res.status(400).json({ error: 'Некорректная трудоемкость' });
  if (isNaN(taskComplexity) || taskComplexity < 1 || taskComplexity > 5) return res.status(400).json({ error: 'Сложность должна быть от 1 до 5' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const taskId = randomUUID();

    // 1. Сохраняем саму задачу (с work и complexity)
        // 1. Сохраняем саму задачу
    const { rows } = await client.query(
      `INSERT INTO tasks
         (id, user_id, title, description, assignee_id, deadline, priority, status, labels, project_id, work, complexity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, title, description,
                 assignee_id AS "assigneeId",
                 deadline::text AS deadline,
                 priority, status, labels,
                 project_id AS "projectId",
                 work, complexity,
                 created_at AS "createdAt"`,
      [
        taskId, 
        userId, 
        cleanTitle, 
        String(description).trim(), 
        assigneeId ? String(assigneeId) : null, // <--- ИСПРАВЛЕНИЕ ЗДЕСЬ
        deadline || null, 
        priority || null, 
        status, 
        labels, 
        projectId, 
        taskWork, 
        taskComplexity
      ]
    );

    // 2. Если это подзадача — создаем связь в графе
    if (parentId) {
      // Проверяем, существует ли родительская задача (чтобы не было ошибки внешнего ключа)
      const parentCheck = await client.query('SELECT id FROM tasks WHERE id = $1 AND user_id = $2', [parentId, userId]);
      if (parentCheck.rows.length === 0) {
        throw new Error('Родительская задача не найдена');
      }

      await client.query(
        'INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES ($1, $2)',
        [taskId, parentId] // Наша новая задача зависит от parentId
      );
    }

    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.message === 'Родительская задача не найдена') {
      return res.status(404).json({ error: err.message });
    }
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Проект или исполнитель не найден' });
    }
    serverError(res, err);
  } finally {
    client.release();
  }
});



const axios = require('axios');

// ... (внутри ваших роутов)

app.get('/api/tasks/prioritized', async (req, res) => {
  const userId = getUserIdFromToken(req);
  if (!userId) return res.status(401).json({ error: 'Не авторизован' });

  try {
    // Достаем задачи с реальным количеством зависимостей
    const { rows: tasks } = await pool.query(`
      SELECT 
        t.id, t.deadline, t.work, t.complexity,
        (SELECT count(*) FROM task_dependencies td WHERE td.depends_on_task_id = t.id)::int AS "n_dependents"
      FROM tasks t
      WHERE t.user_id = $1
    `, [userId]);

    if (tasks.length === 0) return res.json({});

    const formattedTasks = tasks.map((t) => {
      let daysToDeadline = 30;
      if (t.deadline) {
        const diffTime = new Date(t.deadline) - new Date();
        daysToDeadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      return {
        id: t.id,
        days_to_deadline: Math.max(0, daysToDeadline),
        work: t.work || 1,             // Реальные данные
        complexity: t.complexity || 3, // Реальные данные
        assignee_load: 0,              // Пока заглушка (в будущем можно посчитать)
        n_dependents: t.n_dependents,  // <--- РЕАЛЬНОЕ КОЛИЧЕСТВО ПОДЗАДАЧ
        deadline: t.deadline || ''
      };
    });

    // Отправляем в Python
    const mlResponse = await axios.post('http://localhost:8000/api/prioritize', {
      tasks: formattedTasks,
      deps: [] // Мы пока не передаем сам граф в Python, только количество зависимых задач.
               // Если захотите передавать граф, нужно будет достать связи из БД.
    });

    if (mlResponse.data.error) {
      return res.status(400).json({ error: mlResponse.data.error });
    }

    res.json(mlResponse.data.priorities);
  } catch (err) {
    console.error('Ошибка ML:', err.message);
    res.status(500).json({ error: 'ML сервис недоступен' });
  }
});




app.patch('/api/tasks/:id', async (req, res) => {
  const userId = getUserIdFromToken(req);
  if (!userId) return res.status(401).json({ error: 'Не авторизован' });

  const { id } = req.params;
  const { status } = req.body;

  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Неверный статус' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE tasks SET status = $1 
       WHERE id = $2 AND user_id = $3
       RETURNING id, title, description, assignee_id AS "assigneeId", deadline::text AS deadline, priority, status, labels, project_id AS "projectId"`,
      [status, id, userId]
    );
    
    if (rows.length === 0) return res.status(404).json({ error: 'Задача не найдена или у вас нет прав на её изменение' });
    res.json(rows[0]);
  } catch (err) {
    serverError(res, err);
  }
});

// ==========================================
// --- ЗАПУСК СЕРВЕРА ---
// ==========================================

app.listen(PORT, () => {
  console.log(`Бэкенд запущен на http://localhost:${PORT}`);
});


app.get('/api/users', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, username AS name FROM auth_users');
    res.json(rows);
  } catch (err) {
    serverError(res, err);
  }
});