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
    rootElement.innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background-color: #F8F7F4; font-family: ui-sans-serif, system-ui, sans-serif; padding: 1.5rem;">
        <div style="max-width: 28rem; width: 100%; background: #ffffff; border: 1px solid #E5E5E1; padding: 2rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); text-align: center;">
          <div style="width: 3rem; height: 3rem; background-color: #FEF3C7; border: 1px solid #FDE68A; color: #92400E; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; border-radius: 9999px; font-size: 1.25rem; font-weight: bold;">!</div>
          <h2 style="font-size: 1.125rem; font-weight: 700; color: #1A1A1A; margin-bottom: 0.5rem;">Wardrobe & Style Studio</h2>
          <p style="font-size: 0.875rem; color: #767670; margin-bottom: 1.5rem; line-height: 1.5;">An unexpected initialization issue occurred. Click below to reset stored application cache and restore default data.</p>
          <button id="emergency-reset-btn" style="background-color: #8C7355; color: #ffffff; padding: 0.625rem 1.25rem; font-size: 0.875rem; font-weight: 600; border: none; cursor: pointer; border-radius: 6px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
            Reset Cache & Reload Studio
          </button>
        </div>
      </div>
    `;
    const btn = document.getElementById('emergency-reset-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch (e) {}
        window.location.reload();
      });
    }
  }
}

