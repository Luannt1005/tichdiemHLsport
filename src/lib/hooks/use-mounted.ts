import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/** true sau khi hydrate ở client — dùng trước createPortal để tránh lỗi SSR */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
