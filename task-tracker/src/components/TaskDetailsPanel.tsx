// src/components/TaskDetailsPanel.tsx
import { useState } from 'react'; // <--- Добавили импорт useState
import { Text, Group, Badge, Button, Stack, Divider, Avatar, Box, ScrollArea, CloseButton, Modal } from '@mantine/core'; // <--- Добавили Modal
import { IconPlus } from '@tabler/icons-react'; // <--- Добавили IconPlus
import type { Task } from '../shared/api/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePrioritizedTasks } from '../shared/api/queries';
import { TaskForm } from './TaskForm';

interface TaskDetailsPanelProps {
  task: Task | null;
  onClose: () => void;
}

export function TaskDetailsPanel({ task, onClose }: TaskDetailsPanelProps) {
  const queryClient = useQueryClient();
  const { data: priorities } = usePrioritizedTasks();
  const [isSubtaskModalOpen, setIsSubtaskModalOpen] = useState(false);

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await fetch(`http://localhost:3001/api/tasks/${task?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Ошибка обновления');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['navCounters'] });
      queryClient.invalidateQueries({ queryKey: ['prioritizedTasks'] });
    },
  });

  if (!task) return null;

  return (
    <div className="w-[400px] flex-shrink-0 border-l border-gray-300 dark:border-dark-500 bg-gray-50 dark:bg-dark-800 h-screen flex flex-col animate-slide-in">
      
      {/* Шапка панели */}
      <Group justify="space-between" p="md" className="border-b border-gray-200 dark:border-dark-600">
        <Text fw={700} size="lg" lineClamp={1}>{task.title}</Text>
        <CloseButton onClick={onClose} />
      </Group>

      {/* Скроллируемый контент */}
      <ScrollArea className="flex-1 p-4">
        <Stack gap="md">
          
          <Group>
            <Badge color="blue">
              {task.status === 'todo' ? 'Нужно сделать' : 
               task.status === 'in_progress' ? 'В работе' : 'Готово'}
            </Badge>
            {task.priority === 'critical' && <Badge color="red">Очень важно</Badge>}
            {task.priority === 'urgent' && <Badge color="yellow">Срочно</Badge>}
            {task.deadline && <Badge variant="outline">до {task.deadline}</Badge>}

            {priorities && priorities[task.id] && (
              <Badge color="grape" size="lg">⚡ ML Приоритет: {priorities[task.id]}</Badge>
            )}
          </Group>

          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
            {task.description || 'Описание отсутствует'}
          </Text>

          <Divider my="sm" />

          <Group>
            <Button variant="default" size="xs" onClick={onClose}>Вернуть</Button>
            <Button 
              color="yellow" 
              size="xs" 
              onClick={() => updateStatusMutation.mutate('in_progress')}
              loading={updateStatusMutation.isPending}
            >
              В работу
            </Button>
            <Button 
              color="dark" 
              size="xs"
              onClick={() => updateStatusMutation.mutate('done')}
              loading={updateStatusMutation.isPending}
            >
              Закрыть задачу
            </Button>
          </Group>

          <Button 
            variant="light" 
            color="blue" 
            leftSection={<IconPlus size={16} />} 
            onClick={() => setIsSubtaskModalOpen(true)}
            fullWidth
          >
            Добавить подзадачу
          </Button>

          <Divider my="sm" />

          <Text fw={500}>История и комментарии</Text>
          <Box p="sm" style={{ backgroundColor: 'var(--mantine-color-default-hover)', borderRadius: 8 }}>
            <Group mb={5}>
              <Avatar size="sm" radius="xl" color="blue">МО</Avatar>
              <Text size="sm" fw={500}>Мария Орлова</Text>
              <Text size="xs" c="dimmed">сегодня, 14:14</Text>
            </Group>
            <Text size="sm">Заказчик просит сделать кнопки заметнее и поменять заголовок.</Text>
          </Box>
          
          <Group mt="md">
            <input 
              type="text" 
              placeholder="Написать комментарий" 
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 dark:bg-dark-700 dark:border-dark-500"
            />
            <Button>Отправить</Button>
          </Group>
        </Stack>
      </ScrollArea>

      {/* Модалка для создания подзадачи */}
      <Modal 
  opened={isSubtaskModalOpen} 
  onClose={() => setIsSubtaskModalOpen(false)} 
  title={`Добавить подзадачу к "${task.title}"`}
  size="lg"
  centered
>
  <TaskForm 
    // Безопасная передача projectId
    {...(task.projectId ? { defaultProjectId: task.projectId } : {})}
    parentId={task.id} // Передаем ID родителя
    onCreated={() => {
      setIsSubtaskModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['prioritizedTasks'] });
    }}
    onCancel={() => setIsSubtaskModalOpen(false)}
  />
</Modal>
    </div>
  );
}