import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import './index.css';
import App from './app/App'; // Убедитесь, что путь правильный!

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,           // данные считаются свежими минуту
      refetchOnWindowFocus: false, // не перезапрашивать при возврате на вкладку
      retry: 1,                    // по умолчанию 3 повтора, а с мок-ошибками это долго
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </MantineProvider>
    </QueryClientProvider>
  </StrictMode>
);