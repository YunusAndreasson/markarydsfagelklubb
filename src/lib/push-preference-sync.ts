export type PushPermission = 'granted' | 'denied' | 'undetermined';
export type PushSyncError = 'enable' | 'disable' | 'unavailable' | null;
type Dependencies = {
  readDesired: () => boolean;
  writeDesired: (enabled: boolean) => void;
  permission: () => Promise<PushPermission>;
  requestPermission: () => Promise<PushPermission>;
  token: () => Promise<string | null>;
  register: (token: string) => Promise<void>;
  remove: (token: string) => Promise<void>;
};

/** One serialized synchronization path for startup, settings and reconnects.
 * Requested preference is durable; confirmed state changes only after success. */
export function createPushPreferenceSync(deps: Dependencies) {
  let epoch = 0;
  let userId: string | null = null;
  let queuedEpoch: number | null = null;
  let queue: Promise<void> = Promise.resolve();
  let state: {
    desired: boolean; confirmed: boolean | null; permission: PushPermission;
    busy: boolean; error: PushSyncError;
  } = { desired: deps.readDesired(), confirmed: null, permission: 'undetermined', busy: false, error: null };
  const listeners = new Set<() => void>();
  const publish = (patch: Partial<typeof state>) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };

  function setUser(next: string | null) {
    if (next === userId) return;
    userId = next;
    epoch++;
    queuedEpoch = null;
    publish({ desired: deps.readDesired(), confirmed: null, permission: 'undetermined', busy: false, error: null });
  }

  function sync(askPermission = false): Promise<void> {
    if (!userId || queuedEpoch === epoch) return queue;
    const generation = epoch;
    queuedEpoch = generation;
    publish({ busy: true });
    queue = queue.then(async () => {
      try {
        while (generation === epoch && userId) {
          const desired = state.desired;
          deps.writeDesired(desired);
          let permission = await deps.permission();
          if (generation !== epoch) return;
          if (desired && permission !== 'granted' && askPermission) {
            permission = await deps.requestPermission();
          }
          if (generation !== epoch) return;
          publish({ permission });
          if (state.desired !== desired) continue;
          if (desired && permission !== 'granted') {
            publish({ confirmed: false, error: null });
            return;
          }
          const token = await deps.token();
          if (generation !== epoch) return;
          if (!token) {
            publish({ error: 'unavailable' });
            return;
          }
          // A preference changed while obtaining the token. Never register an
          // already-cancelled enable request; reconcile the newest intent.
          if (state.desired !== desired) continue;
          if (desired) await deps.register(token);
          else await deps.remove(token);
          if (generation !== epoch) return;
          publish({ confirmed: desired, error: null });
          if (state.desired === desired) return;
        }
      } catch {
        if (generation === epoch) publish({ error: state.desired ? 'enable' : 'disable' });
      } finally {
        if (generation === epoch) {
          queuedEpoch = null;
          publish({ busy: false });
        }
      }
    });
    return queue;
  }

  return {
    setUser, sync,
    whenIdle: () => queue,
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    setEnabled: (enabled: boolean) => {
      publish({ desired: enabled, error: null });
      // Opt-out also suppresses foreground presentation immediately, even
      // while an older in-flight registration is being drained.
      try { deps.writeDesired(enabled); } catch { /* sync surfaces/retries this failure */ }
      return sync(enabled);
    },
  };
}
