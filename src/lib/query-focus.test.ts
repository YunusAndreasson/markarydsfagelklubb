import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppState } from 'react-native';
import { watchQueryFocus } from './query-focus';

const native = vi.hoisted(() => ({
  listener: undefined as undefined | ((state: string) => void),
  remove: vi.fn(),
}));
vi.mock('react-native', () => ({
  AppState: {
    currentState: 'background',
    addEventListener: vi.fn((_event, listener: (state: string) => void) => {
      native.listener = listener;
      return { remove: native.remove };
    }),
  },
}));
afterEach(() => { vi.clearAllMocks(); native.listener = undefined; });

describe('native query focus', () => {
  it('seeds current focus, follows foreground transitions and unsubscribes', () => {
    const focused = vi.fn();
    const stop = watchQueryFocus(focused);
    expect(focused).toHaveBeenLastCalledWith(false);
    native.listener?.('active');
    expect(focused).toHaveBeenLastCalledWith(true);
    native.listener?.('inactive');
    expect(focused).toHaveBeenLastCalledWith(false);
    stop();
    expect(native.remove).toHaveBeenCalledOnce();
  });

  it('does not assume background while the initial native state is unknown', () => {
    const focused = vi.fn();
    vi.spyOn(AppState, 'currentState', 'get').mockReturnValue(null as never);
    const stop = watchQueryFocus(focused);
    expect(focused).not.toHaveBeenCalled();
    native.listener?.('active');
    expect(focused).toHaveBeenCalledWith(true);
    stop();
    vi.restoreAllMocks();
  });
});
