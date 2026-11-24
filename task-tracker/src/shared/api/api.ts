import type {
  Assignee,
  CurrentUser,
  NavCounters,
  NewTask,
  Project,
  Task,
} from './types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    // Достаем токен из localStorage
    const token = localStorage.getItem('token');
    
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { 
        'Content-Type': 'application/json',
        // Если токен есть — добавляем его в заголовок
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      ...init,
    });
  } catch {
    throw new Error('Не удалось связаться с сервером');
  }

  if (!res.ok) {
    // Если токен протух (401), можно автоматически выкинуть на страницу логина
    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login'; 
    }
    
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Ошибка ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getCurrentUser: () => http<CurrentUser>('/api/user'),
  getNavCounters: () => http<NavCounters>('/api/counters'),
  getProjects: () => http<Project[]>('/api/projects'),
  getAssignees: () => http<Assignee[]>('/api/assignees'),
  getUsers: () => http<Assignee[]>('/api/users'), 
  getLabels: () => http<string[]>('/api/labels'),
  createTask: (input: NewTask) =>
    http<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(input) }),
  
  // Добавили метод для получения списка задач
  getTasks: () => http<Task[]>('/api/tasks'),


  login: (data: { username: string; password: string }) =>
    http<{ token: string; user: { id: string; username: string } }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  register: (data: { username: string; password: string }) =>
    http<{ token: string; user: { id: string; username: string } }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

    getPrioritizedTasks: () => http<Record<string, number>>('/api/tasks/prioritized'),
};

