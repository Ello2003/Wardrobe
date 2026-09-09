import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Guard against unhandled script errors propagating to iframe parent
if (typeof window !== 'undefined') {
  const isSuppressed = (msg?: any, src?: any) => {
    if (!msg) return true;
    const str = String(msg).toLowerCase();
    return str.includes('script error') || str.includes('failed to connect to websocket') || !src;
  };

  window.onerror = (message, source, lineno, colno, error) => {
    if (isSuppressed(message, source) || (lineno === 0 && colno === 0)) {
      return true;
    }
    if (error) {
      console.warn('[App Runtime Error]:', error.message || error);
    }
    return true;
  };

  window.addEventListener('error', (event) => {
    if (isSuppressed(event.message, event.filename)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return true;
    }
    if (event.error) {
      console.warn('[App Runtime Error]:', event.error.message || event.error);
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
    if (event?.reason) {
      console.warn('[Unhandled Promise Rejection]:', event.reason.message || event.reason);
    }
  }, true);
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

