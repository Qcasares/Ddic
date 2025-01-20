import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from '@/features/shared/error-boundary';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found - check your index.html file');
}

try {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
} catch (error) {
  console.error('Failed to initialize application:', error);
  
  // Show error to user
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'padding: 20px; color: #ef4444; text-align: center;';
  errorDiv.innerHTML = `
    <h1 style="margin-bottom: 10px;">Application Error</h1>
    <p>${error instanceof Error ? error.message : 'Failed to load application'}</p>
  `;
  document.body.appendChild(errorDiv);
}