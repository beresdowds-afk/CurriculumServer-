export function lazySingleton<T extends object>(create: () => T): T {
  let instance: T | undefined;
  const getInstance = () => {
    instance ??= create();
    return instance;
  };

  return new Proxy({} as T, {
    get(_target, property) {
      const target = getInstance();
      const value = Reflect.get(target, property, target) as unknown;
      return typeof value === 'function' ? value.bind(target) : value;
    },
    set(_target, property, value) {
      const target = getInstance();
      return Reflect.set(target, property, value, target);
    }
  });
}
