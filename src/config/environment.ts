export type TestRole = 'admin' | 'finance' | 'manager1' | 'manager2' | 'employee1' | 'employee2' | 'employee3' | 'nomanager' | 'inactive';

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
};

export const environment = {
  get apiUrl() { return requireEnv('SPENDWISE_API_URL'); },
  get webUrl() { return requireEnv('SPENDWISE_WEB_URL'); },
  proxyUser: () => requireEnv('SPENDWISE_PROXY_USER'),
  proxyPassword: () => requireEnv('SPENDWISE_PROXY_PASSWORD'),
  seedPassword: () => requireEnv('SPENDWISE_SEED_PASSWORD'),
  email: (role: TestRole) => `${role}@spendwise.test`,
} as const;
