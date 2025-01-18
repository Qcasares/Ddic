import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from '@/components/error-boundary';
import { performanceMonitor } from '@/lib/performance-monitor';

function initializeApp() {
  const rootElement = document.getElementById('root');

  if (!rootElement) {
    throw new Error('Root element not found - check your index.html file');
  }

  try {
    const root = createRoot(rootElement);
    
    performanceMonitor.measure('app-initialization', () => {
      root.render(
        <StrictMode>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </StrictMode>
      );
    });
  } catch (error) {
    console.error('Failed to initialize application:', error);
    performanceMonitor.measure('app-initialization-error', () => {
      // Error handling code remains the same
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