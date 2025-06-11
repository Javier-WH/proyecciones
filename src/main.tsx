import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from "react-router-dom";
import router from './routes/brouser.tsx';
import { MainContextProvider } from './context/mainContext.tsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import "./root.css"

// Crea un cliente de React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 60 * 1000, // 1 hora de caché
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <MainContextProvider>
        <RouterProvider router={router} />
      </MainContextProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
