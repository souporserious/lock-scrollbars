# lock-scrollbars

# 0.5.0

- Move to ESM syntax.
- Avoids errors when tearing down styles if no style element exists.
- Prevents page from jumping to top when stacking multiple locks.
- Fixes bug where event listeners failed to re-attach after mouseOut due to
  `AbortController` reuse.
- Replaces global animation frame variable with a `WeakMap` to support multiple
  scrollable instances safely.
- Optimizes `getScrollableElements` to skip expensive DOM scans when no specific
  node is provided.

# 0.4.1

- Uses position fixed and scroll restoration to prevent scrolling in Safari

# 0.4.0

- Uses `AbortController` to remove events, resulting in less code.
- Prevents selecting text in background except for Safari.
- Moves to stable scrollbar and overflow hidden styles.

# 0.3.4

- Fixes being able to drag the scrollbar with the mouse by collapsing the
  scrollbar width when the scroll lock is active.
