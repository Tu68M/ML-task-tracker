// src/widgets/MainLayout.tsx
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { NavbarSearch } from './SideBar';
import { TaskDetailsPanel } from '../components/TaskDetailsPanel';
import type { Task } from '../shared/api/types';

export default function MainLayout() {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  return (
    <div className="flex min-h-screen bg-white dark:bg-dark-800 overflow-hidden">
      <NavbarSearch />
      
      <main className="flex-1 p-6 overflow-y-auto h-screen">
        {/* Передаем selectedTask в контекст */}
        <Outlet context={{ 
          openTaskPanel: (task: Task) => setSelectedTask(task),
          selectedTask // <-- Добавили сюда
        }} />
      </main>

      {/* Панель рендерится, только если selectedTask не null */}
      {selectedTask && (
        <TaskDetailsPanel task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </div>
  );
}