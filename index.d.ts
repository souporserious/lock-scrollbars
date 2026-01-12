/**
 * Lock all scrollbars by disabling mousewheel and locking scrollbars in position.
 * Optionally provide a specific element to allow scrolling.
 *
 * @param node - The DOM element to allow scrolling on hover.
 * @returns Function to unlock the scrollbars.
 */
export function lockScrollbars(node?: HTMLElement | null): () => void
