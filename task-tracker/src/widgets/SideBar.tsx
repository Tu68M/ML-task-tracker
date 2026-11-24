import { IconCheckbox, IconLayoutKanban, IconUsers } from '@tabler/icons-react';
import { Badge, Skeleton } from '@mantine/core';
import { NavLink } from 'react-router-dom';
import { UserButton } from '../components/UserButton';
import { useNavCounters, useProjects } from '../shared/api/queries';

const sectionClass =
  '-mx-4 mb-4 border-b border-gray-300 dark:border-dark-500 last:border-b-0';

const itemClass = (isActive: boolean) =>
  'flex items-center w-full text-xs px-2 py-2 rounded font-medium no-underline ' +
  'text-gray-700 dark:text-dark-0 ' +
  (isActive
    ? 'bg-gray-100 dark:bg-dark-600'
    : 'hover:bg-gray-50 dark:hover:bg-dark-600');

export function NavbarSearch() {
  const counters = useNavCounters();
  const projects = useProjects();

  const links = [
    { to: '/my-tasks', icon: IconCheckbox, label: 'Мои задачи', count: counters.data?.myTasks },
    { to: '/all-tasks', icon: IconLayoutKanban, label: 'Все задачи', count: counters.data?.allTasks },
    { to: '/workspace', icon: IconUsers, label: 'Общее пространство', count: counters.data?.workspace },
  ];

  return (
    <nav
      className={
        'bg-white dark:bg-dark-700 h-[700px] w-[300px] p-4 pt-0 flex flex-col ' +
        'border-r border-gray-300 dark:border-dark-500'
      }
    >
      <div className={sectionClass}>
        <UserButton />
      </div>

      <div className={sectionClass}>
        <div className="px-3 pb-4 flex flex-col">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => itemClass(isActive)}
            >
              <span className="flex items-center flex-1">
                <link.icon
                  size={20}
                  stroke={1.5}
                  className="mr-3 text-gray-500 dark:text-dark-200"
                />
                <span>{link.label}</span>
              </span>
              {counters.isLoading ? (
                <Skeleton height={20} width={20} radius="xl" />
              ) : link.count ? (
                <Badge size="sm" variant="filled" className="p-0 w-5 h-5 pointer-events-none">
                  {link.count}
                </Badge>
              ) : null}
            </NavLink>
          ))}
        </div>
      </div>

      <div className={sectionClass}>
        <div className="pl-[18px] pr-4 mb-[5px]">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Проекты
          </span>
        </div>
        <div className="px-3 pb-4 flex flex-col">
          {projects.isLoading &&
            [0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={16} my={8} mx={8} width="70%" />
            ))}

          {projects.error && (
            <span className="px-2 py-2 text-xs text-red-500">
              Не удалось загрузить проекты
            </span>
          )}

          {projects.data?.map((project) => (
            <NavLink
              key={project.id}
              to={`/projects/${project.id}`}
              className={({ isActive }) => itemClass(isActive)}
            >
              <span
                className="inline-block w-2 h-2 rounded-full mr-3 ml-1"
                style={{ backgroundColor: project.color }}
              />
              {project.name}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}