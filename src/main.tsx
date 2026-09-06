import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Guard against unhandled script errors propagating to iframe parent
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    // Log complete error diagnostics to console
    console.error('[App Runtime Error]:', event.error || event.message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Unhandled Promise Rejection]:', event.reason);
  });
}

const rootElement = document.getElementById('root');
if (rootElement) {
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  } catch (initError) {
    console.error('[Failed to mount React application]:', initError);
  }
}

