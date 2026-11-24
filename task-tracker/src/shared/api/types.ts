export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
}

export interface NavCounters {
  myTasks: number;
  allTasks: number;
  workspace: number;
}

export interface Project {
  id: string;
  name: string;
  color: string;
}

export type Priority = 'normal' | 'urgent' | 'critical';
export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Assignee {
  id: string;
  name: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigneeId: string | null;
  deadline: string | null; // 'YYYY-MM-DD'
  priority: Priority | null;
  status: TaskStatus;
  labels: string[];
  projectId: string | null;
  createdAt: string;
  parentId?: string | null;
}

export type NewTask = Omit<Task, 'id' | 'createdAt'> & {
  parentId?: string; // <--- Добавляем это поле в тип создания
};