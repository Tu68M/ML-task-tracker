// src/components/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';

export function ProtectedRoute() {
  const token = localStorage.getItem('token');

  // Если токена нет — отправляем на страницу входа
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Если токен есть — показываем вложенные роуты (MainLayout)
  return <Outlet />;
}