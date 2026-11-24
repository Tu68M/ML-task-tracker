// src/pages/AuthPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Group, Stack, TextInput, Title, Text, Anchor, Alert } from '@mantine/core';
import { useForm } from '@mantine/form';
import { api } from '../shared/api/api';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true); // Переключатель Вход/Регистрация
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const form = useForm({
    initialValues: {
      username: '',
      password: '',
    },
    validate: {
      username: (v) => (v.length < 3 ? 'Минимум 3 символа' : null),
      password: (v) => (v.length < 6 ? 'Минимум 6 символов' : null),
    },
  });

  const handleSubmit = async (values: { username: string; password: string }) => {
    setError(null);
    setLoading(true);

    try {
      // Выбираем метод в зависимости от режима
      const response = isLogin 
        ? await api.login(values) 
        : await api.register(values);

      // Сохраняем токен и данные пользователя
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));

      // Перенаправляем в трекер
      navigate('/my-tasks');
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-900 p-4">
      <Card shadow="md" radius="md" p="xl" withBorder className="w-full max-w-md">
        <Title order={2} className="text-center mb-6">
          {isLogin ? 'Вход в систему' : 'Регистрация'}
        </Title>

        {error && (
          <Alert color="red" mb="md" title="Ошибка">
            {error}
          </Alert>
        )}

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Никнейм"
              placeholder="Ваш никнейм"
              required
              {...form.getInputProps('username')}
            />
            <TextInput
              label="Пароль"
              placeholder="Ваш пароль"
              type="password"
              required
              {...form.getInputProps('password')}
            />
            <Button type="submit" fullWidth loading={loading} mt="md">
              {isLogin ? 'Войти' : 'Зарегистрироваться'}
            </Button>
          </Stack>
        </form>

        <Group justify="center" mt="md">
          <Text size="sm" c="dimmed">
            {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
          </Text>
          <Anchor 
            component="button" 
            size="sm" 
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              form.reset();
            }}
          >
            {isLogin ? 'Зарегистрироваться' : 'Войти'}
          </Anchor>
        </Group>
      </Card>
    </div>
  );
}