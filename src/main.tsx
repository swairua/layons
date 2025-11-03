// Must be imported first to suppress ResizeObserver errors before anything renders
import { enableResizeObserverErrorSuppression } from '@/utils/resizeObserverErrorHandler';
enabledResizeObserverErrorSuppression();

import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { CompanyProvider } from '@/contexts/CompanyContext';
import { AuthErrorBoundary } from '@/components/auth/AuthErrorBoundary';
import { AuthStatusIndicator } from '@/components/auth/AuthStatusIndicator';
import App from './App.tsx'
import './index.css'

// Removed auto-migration imports for production safety

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthErrorBoundary>
      <AuthProvider>
        <AuthStatusIndicator />
        <CompanyProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </CompanyProvider>
      </AuthProvider>
    </AuthErrorBoundary>
  </QueryClientProvider>
);
