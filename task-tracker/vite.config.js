import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'; // Если вы уже добавили плагин Tailwind

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Убедитесь, что этот плагин на месте, если мы его настраивали ранее
  ],
  server: {
    proxy: {
      // Все запросы, начинающиеся с /api, будут перенаправлены на бэкенд
      '/api': {
        target: 'http://localhost:3001', // Адрес, где запущен ваш Express-сервер
        changeOrigin: true,              // Меняет origin заголовка на target (полезно для CORS)
        // rewrite: (path) => path.replace(/^\/api/, ''), // Раскомментируйте, если на бэкенде нет префикса /api (у вас ОН ЕСТЬ, так что оставьте закомментированным)
      },
    },
  },
});