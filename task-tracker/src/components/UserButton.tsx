import {
  IconChevronRight,
  IconLogout,
  IconPlayerPause,
  IconSettings,
  IconSwitchHorizontal,
  IconTrash,
} from '@tabler/icons-react';
import { Avatar, Group, Menu, Skeleton, Text, UnstyledButton } from '@mantine/core';
import { useNavigate } from 'react-router-dom'; // <--- Добавили
import { useQueryClient } from '@tanstack/react-query'; // <--- Добавили
import { useCurrentUser } from '../shared/api/queries';

export function UserButton() {
  const { data: user, isLoading } = useCurrentUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Функция выхода
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    queryClient.clear(); // Очищаем кэш задач, чтобы при входе другого юзера не было старых данных
    navigate('/login');
  };

  return (
    <Group justify="center">
      <Menu withArrow width={300} position="bottom" transitionProps={{ transition: 'pop' }} withinPortal>
        <Menu.Target>
          <UnstyledButton
            p={10}
            className="w-full rounded hover:bg-gray-100 dark:hover:bg-dark-600 transition-colors"
          >
            <Group>
              {isLoading || !user ? (
                <>
                  <Skeleton circle height={38} />
                  <div className="flex-1">
                    <Skeleton height={12} width="70%" mb={6} />
                    <Skeleton height={10} width="90%" />
                  </div>
                </>
              ) : (
                <>
                  {/* Если есть avatarUrl — показываем картинку, иначе букву */}
                  {user.avatarUrl ? (
                    <Avatar radius="xl" src={user.avatarUrl} alt={user.name} />
                  ) : (
                    <Avatar radius="xl" color="blue">
                      {user.name.charAt(0).toUpperCase()}
                    </Avatar>
                  )}
                  
                  <div className="flex-1 text-left">
                    <Text fw={500}>{user.name}</Text>
                    <Text size="xs" c="dimmed">
                      {user.email}
                    </Text>
                  </div>
                  <IconChevronRight size={16} stroke={1.5} className="text-gray-400" />
                </>
              )}
            </Group>
          </UnstyledButton>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Label>Settings</Menu.Label>
          <Menu.Item leftSection={<IconSettings size={16} stroke={1.5} />}>
            Account settings
          </Menu.Item>
          <Menu.Item leftSection={<IconSwitchHorizontal size={16} stroke={1.5} />}>
            Change account
          </Menu.Item>
          
          {/* Оживляем кнопку Logout */}
          <Menu.Item 
            leftSection={<IconLogout size={16} stroke={1.5} />} 
            onClick={handleLogout} // <--- Добавили обработчик
          >
            Logout
          </Menu.Item>

          <Menu.Divider />

          <Menu.Label>Danger zone</Menu.Label>
          <Menu.Item leftSection={<IconPlayerPause size={16} stroke={1.5} />}>
            Pause subscription
          </Menu.Item>
          <Menu.Item color="red" leftSection={<IconTrash size={16} stroke={1.5} />}>
            Delete account
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
}