import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from '@/features/shared/error-boundary';
import { performanceMonitor } from '@/features/performance/performance-monitor';

async function initializeApp() {
  const rootElement = document.getElementById('root');

  if (!rootElement) {
    throw new Error('Root element not found - check your index.html file');
  }

  try {
    const root = createRoot(rootElement);
    
    await performanceMonitor.measure('app-initialization', async () => {
      return new Promise<void>((resolve) => {
        root.render(
          <StrictMode>
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
          </StrictMode>
        );
        resolve();
      });
    });
  } catch (error) {
    console.error('Failed to initialize application:', error);
    await performanceMonitor.measure('app-initialization-error', async () => {
      return Promise.resolve();
    });
    
    // Show error to user
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'padding: 20px; color: #ef4444; text-align: center;';
    errorDiv.innerHTML = `
      <h1 style="margin-bottom: 10px;">Application Error</h1>
      <p>${error instanceof Error ? error.message : 'Failed to load application'}</p>
    `;
    document.body.appendChild(errorDiv);
  }
}

initializeApp();