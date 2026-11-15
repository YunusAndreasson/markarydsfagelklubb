import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

const subscribe = (listener: () => void) => onlineManager.subscribe(listener);
const snapshot = () => onlineManager.isOnline();

/** React shares the same connectivity source as query pause/reconnect logic. */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
