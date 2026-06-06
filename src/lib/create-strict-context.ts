import { createContext, use, type Context } from 'react';

export function createStrictContext<T>(name: string): [Context<T | null>, () => T] {
  const ctx = createContext<T | null>(null);
  function useCtx(): T {
    const value = use(ctx);
    if (!value) throw new Error(`${name} must be used within a provider`);
    return value;
  }
  return [ctx, useCtx];
}
