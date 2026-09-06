/**
 * Safe confirm helper for iframe-embedded environments.
 * In sandboxed iframes without `allow-modals`, calling `window.confirm` throws a DOMException
 * which causes uncaught "Script error." in browsers. This wrapper guards against that.
 */
export function safeConfirm(message: string): boolean {
  try {
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      return window.confirm(message);
    }
    return true;
  } catch (err) {
    console.warn('window.confirm blocked or unpermitted in iframe sandbox:', err);
    return true;
  }
}
