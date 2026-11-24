import { useState } from 'react';
import { Button, Group, Modal, Card, Text, Badge, Stack, Loader, Alert } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { TaskForm } from '../components/TaskForm';
import { useOutletContext } from 'react-router-dom';
import { useTasks, usePrioritizedTasks } from '../shared/api/queries'; 
import type { Task } from '../shared/api/types';

type LayoutContext = {
  openTaskPanel: (task: Task) => void;
  selectedTask: Task | null;
};

// Вспомогательный компонент для рекурсивного вывода задачи и её подзадач
function TaskNode({ 
  task, 
  allTasks, 
  priorities, 
  selectedTask, 
  openTaskPanel,
  level = 0,
  isLast = false,
}: { 
  task: Task; 
  allTasks: Task[]; 
  priorities: Record<string, number> | undefined; 
  selectedTask: Task | null; 
  openTaskPanel: (t: Task) => void;
  level?: number;
  isLast?: boolean;
}) {
  const children = allTasks.filter((t) => t.parentId === task.id);
  const isSelected = selectedTask?.id === task.id;
  const isSubtask = level > 0;
  const priorityValue = priorities?.[task.id];

  return (
    <div className={`${isSubtask ? 'subtask-node' : 'root-task-node'} ${isLast ? 'subtask-node--last' : ''}`}>
      <Card 
        shadow={isSubtask ? 'xs' : 'sm'} 
        padding={isSubtask ? 'md' : 'lg'} 
        radius="md" 
        withBorder
        onClick={() => openTaskPanel(task)}
        className="cursor-pointer transition-all duration-200"
        style={{
          borderStyle: isSubtask ? 'dashed' : 'solid',
          borderWidth: isSelected ? '2px' : '1px',
          borderColor: isSelected
            ? 'var(--mantine-color-blue-6)'
            : isSubtask
              ? 'var(--mantine-color-gray-4)'
              : 'var(--mantine-color-gray-3)',
          backgroundColor: isSelected ? 'var(--mantine-color-gray-1)' : undefined,
        }}
      >
        <Group justify="space-between" mb="xs">
          <Text fw={500} size={isSubtask ? 'sm' : 'lg'}>{task.title}</Text>
          <Badge color={task.status === 'done' ? 'green' : 'blue'}>
            {task.status === 'todo' ? 'Нужно сделать' : 
             task.status === 'in_progress' ? 'В работе' : 'Готово'}
          </Badge>
        </Group>
        
        {task.description && (
          <Text size="sm" c="dimmed" mb="md">{task.description}</Text>
        )}

        <Group gap="xs">
          {task.priority === 'critical' && <Badge color="red">Очень важно</Badge>}
          {task.priority === 'urgent' && <Badge color="yellow">Срочно</Badge>}
          {task.deadline && <Badge variant="outline" color="gray">до {task.deadline}</Badge>}
          {priorityValue !== undefined && (
            <Badge color="grape" variant={isSubtask ? 'light' : 'filled'}>
              ML Приоритет: {priorityValue}
            </Badge>
          )}
        </Group>
      </Card>

      {children.length > 0 && (
        <div className="subtasks-group">
          {children.map((child, idx) => (
            <TaskNode 
              key={child.id} 
              task={child} 
              allTasks={allTasks} 
              priorities={priorities} 
              selectedTask={selectedTask} 
              openTaskPanel={openTaskPanel}
              level={level + 1} 
              isLast={idx === children.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MyTasksPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: tasks, isLoading, isError, error } = useTasks();
  const { data: priorities } = usePrioritizedTasks();
  const { openTaskPanel, selectedTask } = useOutletContext<LayoutContext>();

  // Берем только корневые задачи (у которых нет родителя)
  const rootTasks = tasks?.filter((t) => !t.parentId) || [];

  return (
    <div>
      <Group justify="space-between" mb="lg">
        <h1 className="text-xl font-semibold">Мои задачи</h1>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setIsModalOpen(true)}>
          Новая задача
        </Button>
      </Group>

      {isLoading && <Group justify="center" mt="xl"><Loader /></Group>}
      {isError && (
        <Alert color="red" title="Ошибка">
          {error instanceof Error ? error.message : 'Не удалось загрузить задачи'}
        </Alert>
      )}

      {!isLoading && !isError && rootTasks.length === 0 && (
        <div className="text-gray-500">Список задач пока пуст. Создайте первую!</div>
      )}

      <Stack gap="md">
        {rootTasks.map((task) => (
          <TaskNode 
            key={task.id} 
            task={task} 
            allTasks={tasks || []} 
            priorities={priorities} 
            selectedTask={selectedTask} 
            openTaskPanel={openTaskPanel} 
          />
        ))}
      </Stack>

      <Modal 
        opened={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Создание задачи"
        size="lg"
        centered
      >
        <TaskForm 
          onCreated={() => setIsModalOpen(false)}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
}