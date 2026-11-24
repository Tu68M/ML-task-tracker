import { Alert, Button, Group, MultiSelect, Select, Stack, Textarea, TextInput, NumberInput, Card, ActionIcon, Text } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import type { Priority, TaskStatus } from '../shared/api/types';
import {
  useUsers,
  useCreateTask,
  useLabels,
  useProjects,
} from '../shared/api/queries';

// Тип для одной подзадачи (все поля, кроме проекта и статуса, т.к. они наследуются)
interface SubTaskValues {
  title: string;
  description: string;
  assigneeId: string | null;
  deadline: string | null;
  priority: Priority | null;
  work: number;
  complexity: number;
}

interface FormValues {
  title: string;
  description: string;
  assigneeId: string | null;
  deadline: string | null;
  priority: Priority | null;
  status: TaskStatus;
  labels: string[];
  projectId: string | null;
  work: number;
  complexity: number;
  subtasks: SubTaskValues[]; // <--- Массив подзадач
}

const priorityOptions = [
  { value: 'normal', label: 'Не срочно' },
  { value: 'urgent', label: 'Срочно' },
  { value: 'critical', label: 'Очень важно' },
];

const statusOptions = [
  { value: 'todo', label: 'Нужно сделать' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'done', label: 'Готово' },
];

interface TaskFormProps {
  defaultProjectId?: string;
  defaultStatus?: TaskStatus;
  parentId?: string;
  onCreated?: () => void;
  onCancel?: () => void;
}

export function TaskForm({
  defaultProjectId,
  defaultStatus = 'todo',
  parentId,
  onCreated,
  onCancel,
}: TaskFormProps) {
  const users = useUsers();
  const labels = useLabels();
  const projects = useProjects();
  const createTask = useCreateTask();

  const form = useForm<FormValues>({
    initialValues: {
      title: '',
      description: '',
      assigneeId: null,
      deadline: null,
      priority: null,
      status: defaultStatus,
      labels: [],
      projectId: defaultProjectId ?? null,
      work: 1,
      complexity: 3,
      subtasks: [], // Изначально пустой массив
    },
    validate: {
      title: (v) =>
        v.trim().length < 3 ? 'Минимум 3 символа' : v.length > 120 ? 'Максимум 120 символов' : null,
      projectId: (v) => (v ? null : 'Выберите проект'),
    },
  });

  // Функция для добавления новой подзадачи в форму
  const addSubtask = () => {
    form.insertListItem('subtasks', {
      title: '',
      description: '',
      assigneeId: null,
      deadline: null,
      priority: null,
      work: 1,
      complexity: 3,
    });
  };

  const handleSubmit = form.onSubmit(async (values) => {
  // 1. Отделяем подзадачи от основной задачи
  const { subtasks, ...mainTaskData } = values;

  try {
    // 2. Создаем основную задачу
    const mainTask = await createTask.mutateAsync({
      ...mainTaskData,
      title: mainTaskData.title.trim(),
      description: mainTaskData.description.trim(),
      assigneeId: mainTaskData.assigneeId || null, // Явно передаем null, если пусто
      deadline: mainTaskData.deadline || null,
      priority: mainTaskData.priority || null,
      ...(parentId ? { parentId } : {}),
    });

    // 3. Создаем подзадачи
    for (const sub of subtasks) {
      await createTask.mutateAsync({
        ...mainTaskData, // Берем проект и статус от родителя
        ...sub,
        title: sub.title.trim(),
        description: sub.description.trim(),
        assigneeId: sub.assigneeId || null, // <--- Явно передаем null
        deadline: sub.deadline || null,
        priority: sub.priority || null,
        parentId: mainTask.id, // Привязываем к родителю
      });
    }

    form.reset();
    onCreated?.();
  } catch (error) {
    console.error("Ошибка при создании задачи или подзадач", error);
  }
});

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap="md">
        {/* --- ОСНОВНАЯ ЗАДАЧА --- */}
        <TextInput
          label="Название"
          placeholder="Что нужно сделать?"
          withAsterisk
          data-autofocus
          {...form.getInputProps('title')}
        />

        <Textarea
          label="Описание"
          placeholder="Подробности, ссылки, критерии готовности"
          autosize
          minRows={3}
          maxRows={8}
          {...form.getInputProps('description')}
        />

        <Group grow align="flex-start">
          <Select
            label="Проект"
            placeholder={projects.isLoading ? 'Загрузка…' : 'Выберите'}
            withAsterisk
            data={projects.data?.map((p) => ({ value: p.id, label: p.name })) ?? []}
            disabled={projects.isLoading}
            {...form.getInputProps('projectId')}
          />
          <Select
            label="Статус"
            data={statusOptions}
            allowDeselect={false}
            {...form.getInputProps('status')}
          />
        </Group>

        <Group grow align="flex-start">
          <Select
            label="Исполнитель"
            placeholder={users.isLoading ? 'Загрузка…' : 'Не назначен'}
            data={users.data?.map((u) => ({ value: u.id, label: u.name })) ?? []}
            disabled={users.isLoading}
            clearable
            searchable
            {...form.getInputProps('assigneeId')}
          />
          <DateInput
            label="Дедлайн"
            placeholder="Выберите дату"
            valueFormat="D MMM YYYY"
            minDate={new Date()}
            clearable
            {...form.getInputProps('deadline')}
          />
        </Group>

        <Group grow align="flex-start">
          <NumberInput
            label="Трудоемкость (часы)"
            min={0.5}
            step={0.5}
            withAsterisk
            {...form.getInputProps('work')}
          />
          <NumberInput
            label="Сложность"
            min={1}
            max={5}
            withAsterisk
            {...form.getInputProps('complexity')}
          />
        </Group>

        <Select
          label="Приоритет"
          placeholder="Не указан"
          data={priorityOptions}
          clearable
          {...form.getInputProps('priority')}
        />

        <MultiSelect
          label="Метки"
          placeholder={labels.isLoading ? 'Загрузка…' : 'Добавьте метки'}
          data={labels.data ?? []}
          disabled={labels.isLoading}
          searchable
          clearable
          {...form.getInputProps('labels')}
        />

        {/* --- ДИНАМИЧЕСКИЕ ПОДЗАДАЧИ --- */}
        {form.values.subtasks.length > 0 && (
          <div className="border-t border-gray-200 dark:border-dark-500 pt-4 mt-2">
            <Text fw={500} mb="sm">Подзадачи:</Text>
            {form.values.subtasks.map((_, index) => (
              <Card key={index} withBorder mb="md" p="sm" className="bg-gray-50 dark:bg-dark-700">
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={500}>Подзадача #{index + 1}</Text>
                  <ActionIcon color="red" variant="subtle" onClick={() => form.removeListItem('subtasks', index)}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
                
                <Stack gap="xs">
                  <TextInput
                    label="Название подзадачи"
                    placeholder="Что нужно сделать?"
                    withAsterisk
                    {...form.getInputProps(`subtasks.${index}.title`)}
                  />
                  <Textarea
                    label="Описание"
                    autosize
                    minRows={2}
                    {...form.getInputProps(`subtasks.${index}.description`)}
                  />
                  <Group grow>
                    <Select
                      label="Исполнитель"
                      data={users.data?.map((u) => ({ value: u.id, label: u.name })) ?? []}
                      clearable
                      searchable
                      {...form.getInputProps(`subtasks.${index}.assigneeId`)}
                    />
                    <DateInput
                      label="Дедлайн"
                      valueFormat="D MMM YYYY"
                      clearable
                      {...form.getInputProps(`subtasks.${index}.deadline`)}
                    />
                  </Group>
                  <Group grow>
                    <NumberInput
                      label="Трудоемкость"
                      min={0.5}
                      step={0.5}
                      {...form.getInputProps(`subtasks.${index}.work`)}
                    />
                    <NumberInput
                      label="Сложность"
                      min={1}
                      max={5}
                      {...form.getInputProps(`subtasks.${index}.complexity`)}
                    />
                  </Group>
                </Stack>
              </Card>
            ))}
          </div>
        )}

        {/* Кнопка добавления подзадачи */}
        <Button variant="light" leftSection={<IconPlus size={16} />} onClick={addSubtask}>
          Добавить подзадачу
        </Button>

        {createTask.error && (
          <Alert color="red" variant="light">
            {createTask.error.message}
          </Alert>
        )}

        <Group justify="flex-end" mt="md">
          {onCancel && (
            <Button variant="default" onClick={onCancel} disabled={createTask.isPending}>
              Отмена
            </Button>
          )}
          <Button type="submit" loading={createTask.isPending}>
            Создать задачу
          </Button>
        </Group>
      </Stack>
    </form>
  );
}