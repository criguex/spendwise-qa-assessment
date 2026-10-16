export type TestRole = 'admin' | 'finance' | 'manager1' | 'manager2' | 'employee1' | 'employee2' | 'employee3' | 'nomanager' | 'inactive';

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
};

export const environment = {
  apiUrl: process.env.SPENDWISE_API_URL ?? 'https://spendwise-igs.eastus2.cloudapp.azure.com:4506',
  webUrl: process.env.SPENDWISE_WEB_URL ?? 'https://spendwise-igs.eastus2.cloudapp.azure.com:4406',
  proxyUser: () => requireEnv('SPENDWISE_PROXY_USER'),
  proxyPassword: () => requireEnv('SPENDWISE_PROXY_PASSWORD'),
  seedPassword: () => requireEnv('SPENDWISE_SEED_PASSWORD'),
  email: (role: TestRole) => `${role}@spendwise.test`,
} as const;
