import { describe, expect, it, vi } from 'vitest';
import { createPushPreferenceSync, type PushPermission } from './push-preference-sync';

function fixture(desired = true) {
  let stored = desired;
  const deps = {
    readDesired: () => stored,
    writeDesired: vi.fn((next: boolean) => { stored = next; }),
    permission: vi.fn(async (): Promise<PushPermission> => 'granted'),
    requestPermission: vi.fn(async (): Promise<PushPermission> => 'granted'),
    token: vi.fn(async (): Promise<string | null> => 'test-token'),
    register: vi.fn(async (_token: string) => {}),
    remove: vi.fn(async (_token: string) => {}),
  };
  const sync = createPushPreferenceSync(deps);
  sync.setUser('qa-user');
  return { deps, sync, stored: () => stored };
}

describe('push preference synchronization', () => {
  it('does not confirm an enable until registration succeeds', async () => {
    const { deps, sync } = fixture();
    let finish!: () => void;
    deps.register.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    const pending = sync.sync();
    await vi.waitFor(() => expect(deps.register).toHaveBeenCalledOnce());
    expect(sync.getSnapshot()).toMatchObject({ confirmed: null, busy: true });
    finish();
    await pending;
    expect(sync.getSnapshot()).toMatchObject({ confirmed: true, busy: false, error: null });
  });

  it('retains a failed disable request and confirms it on retry', async () => {
    const { deps, sync, stored } = fixture();
    await sync.sync();
    deps.remove.mockRejectedValueOnce(new Error('offline'));
    await sync.setEnabled(false);
    expect(stored()).toBe(false);
    expect(sync.getSnapshot()).toMatchObject({ desired: false, confirmed: true, error: 'disable', busy: false });
    await sync.sync();
    expect(sync.getSnapshot()).toMatchObject({ confirmed: false, error: null, busy: false });
    expect(deps.remove).toHaveBeenCalledTimes(2);
  });

  it('does not prompt on startup, and respects a denied explicit request', async () => {
    const { deps, sync } = fixture();
    deps.permission.mockImplementation(async () => 'undetermined');
    deps.requestPermission.mockImplementation(async () => 'denied');
    await sync.sync();
    expect(deps.requestPermission).not.toHaveBeenCalled();
    await sync.setEnabled(true);
    expect(deps.requestPermission).toHaveBeenCalledOnce();
    expect(sync.getSnapshot()).toMatchObject({ permission: 'denied', confirmed: false, busy: false });
    expect(deps.register).not.toHaveBeenCalled();
  });

  it('surfaces failed enable and missing token without pretending success', async () => {
    const { deps, sync } = fixture();
    deps.register.mockRejectedValueOnce(new Error('offline'));
    await sync.sync();
    expect(sync.getSnapshot()).toMatchObject({ confirmed: null, error: 'enable', busy: false });
    deps.token.mockResolvedValueOnce(null);
    await sync.sync();
    expect(sync.getSnapshot()).toMatchObject({ confirmed: null, error: 'unavailable', busy: false });
    await sync.sync();
    expect(sync.getSnapshot()).toMatchObject({ confirmed: true, error: null });
  });

  it('does not register when the durable preference cannot be saved', async () => {
    const { deps, sync } = fixture();
    deps.writeDesired.mockImplementation(() => { throw new Error('storage unavailable'); });
    await sync.setEnabled(true);
    expect(sync.getSnapshot()).toMatchObject({ error: 'enable', confirmed: null, busy: false });
    expect(deps.register).not.toHaveBeenCalled();
  });

  it('reconciles a disable made while registration is in flight', async () => {
    const { deps, sync } = fixture();
    let finish!: () => void;
    deps.register.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    const first = sync.sync();
    await vi.waitFor(() => expect(deps.register).toHaveBeenCalledOnce());
    const second = sync.setEnabled(false);
    finish();
    await Promise.all([first, second]);
    expect(deps.remove).toHaveBeenCalledOnce();
    expect(sync.getSnapshot()).toMatchObject({ desired: false, confirmed: false, error: null });
  });

  it('ignores late results from a previous account', async () => {
    const { deps, sync } = fixture();
    let finish!: () => void;
    deps.register.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    const pending = sync.sync();
    await vi.waitFor(() => expect(deps.register).toHaveBeenCalledOnce());
    sync.setUser(null);
    finish();
    await pending;
    expect(sync.getSnapshot()).toMatchObject({ confirmed: null, error: null, busy: false });
  });
});
