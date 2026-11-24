import { Route, Routes, useParams } from 'react-router-dom';
import MainLayout from '../widgets/MainLayout';
import MyTasksPage from '../pages/MyTasksPage'
import AuthPage from '../pages/AuthPage'; // <-- Импорт
import { ProtectedRoute } from '../components/ProtectedRoute';


const Placeholder = ({ title }: { title: string }) => (
  <h1 className="text-xl font-semibold">{title}</h1>
);

function ProjectPage() {
  const { projectId } = useParams();
  return <Placeholder title={`Проект: ${projectId}`} />;
}

export default function App() {
  return (
    <Routes>
      {/* Публичный роут */}
      <Route path="/login" element={<AuthPage />} />

      {/* Защищенные роуты */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route index element={null} />
          <Route path="my-tasks" element={<MyTasksPage />} />
          <Route path="all-tasks" element={<Placeholder title="Все задачи" />} />
          <Route path="workspace" element={<Placeholder title="Общее пространство" />} />
          <Route path="projects/:projectId" element={<ProjectPage />} />
          <Route path="profile" element={<Placeholder title="Профиль" />} />
        </Route>
      </Route>
    </Routes>
  );
}