import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { Task } from './types'; // Импортируем тип из types.ts

// Все ключи в одном месте
export const queryKeys = {
  currentUser: ['currentUser'] as const,
  navCounters: ['navCounters'] as const,
  projects: ['projects'] as const,
  assignees: ['assignees'] as const,
  labels: ['labels'] as const,
  tasks: ['tasks'] as const,
  users: ['users'] as const,
};

// ---- Чтение ----

export const useCurrentUser = () =>
  useQuery({ queryKey: queryKeys.currentUser, queryFn: api.getCurrentUser });

export const useNavCounters = () =>
  useQuery({ queryKey: queryKeys.navCounters, queryFn: api.getNavCounters });

export const useProjects = () =>
  useQuery({ queryKey: queryKeys.projects, queryFn: api.getProjects });

export const useAssignees = () =>
  useQuery({ queryKey: queryKeys.assignees, queryFn: api.getAssignees });

export const useLabels = () =>
  useQuery({ queryKey: queryKeys.labels, queryFn: api.getLabels });

// Используем api.getTasks
export const useTasks = () =>
  useQuery({ queryKey: queryKeys.tasks, queryFn: api.getTasks });

// ---- Запись ----

export const useCreateTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createTask,
    onSuccess: () => {
      // Обновляем счетчики в сайдбаре
      qc.invalidateQueries({ queryKey: queryKeys.navCounters });
      // Обновляем список задач на странице
      qc.invalidateQueries({ queryKey: queryKeys.tasks });
    },
  });
};


export const useUsers = () =>
  useQuery({ queryKey: queryKeys.users, queryFn: api.getUsers });


export const usePrioritizedTasks = () =>
  useQuery({ 
    queryKey: ['prioritizedTasks'], 
    queryFn: api.getPrioritizedTasks,
    staleTime: 0, // Всегда запрашиваем свежие приоритеты, когда они нужны
  });