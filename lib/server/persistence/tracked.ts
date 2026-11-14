/* ============================================================================
   Change-tracked proxies
   ----------------------------------------------------------------------------
   The domain layer (63 pages, 17 route handlers, 5 action files) mutates the
   in-memory model directly — `db().students.push(...)`, `attempt.answers.push()`,
   `settings.geofenceRadiusM = 120`. Rewriting ~289 call sites into SQL would be
   a rewrite, not a migration.

   Instead every collection is wrapped in a deep proxy that reports *which*
   collection changed. The persistence layer then writes the touched collections
   to SQLite inside one transaction on the next microtask — i.e. before the
   response is flushed, so a committed action is a committed row.

   Only plain objects and arrays are wrapped. `Date`, `Map`, `Set`, class
   instances and primitives are returned untouched, because proxying them breaks
   internal-slot checks (`Date.prototype.toISOString` on a proxy throws).
   ========================================================================== */

type Mark = () => void;

const isPlainObject = (value: object) => {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

const proxyable = (value: unknown): value is object =>
  typeof value === "object" && value !== null && (Array.isArray(value) || isPlainObject(value));

export interface Tracked<T> {
  value: T;
  /** Unwraps proxies anywhere inside the value (for serialisation / cloning). */
  raw: () => T;
}

/**
 * Creates a wrapper bound to one collection. Identity is cached per target, so
 * `db().courses[0] === db().courses[0]` still holds and React keys/references
 * behave.
 */
export function trackCollection<T extends object>(target: T, mark: Mark): Tracked<T> {
  const proxyToTarget = new WeakMap<object, object>();
  const targetToProxy = new WeakMap<object, object>();

  const unwrap = (value: unknown): unknown => {
    if (typeof value !== "object" || value === null) return value;
    return proxyToTarget.get(value) ?? value;
  };

  const wrap = (value: object): object => {
    const cached = targetToProxy.get(value);
    if (cached) return cached;

    const handler: ProxyHandler<object> = {
      get(t, prop, receiver) {
        const found = Reflect.get(t, prop, receiver);
        if (typeof found === "function") return found.bind(receiver);
        if (proxyable(found)) {
          const inner = targetToProxy.get(found) ?? wrap(found);
          return inner;
        }
        return found;
      },
      set(t, prop, value, receiver) {
        mark();
        return Reflect.set(t, prop, unwrap(value), receiver);
      },
      defineProperty(t, prop, descriptor) {
        mark();
        if ("value" in descriptor) descriptor.value = unwrap(descriptor.value);
        return Reflect.defineProperty(t, prop, descriptor);
      },
      deleteProperty(t, prop) {
        mark();
        return Reflect.deleteProperty(t, prop);
      },
    };

    const proxy = new Proxy(value, handler);
    proxyToTarget.set(proxy, value);
    targetToProxy.set(value, proxy);
    return proxy;
  };

  return {
    value: wrap(target) as T,
    raw: () => target,
  };
}
