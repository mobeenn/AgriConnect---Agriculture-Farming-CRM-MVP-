export const cookies = () => ({
  get: (name) => (globalThis.__testCookies?.[name] !== undefined ? { name, value: globalThis.__testCookies[name] } : undefined),
});
