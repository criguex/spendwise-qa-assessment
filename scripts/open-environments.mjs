import { chromium } from '@playwright/test';

const required = ['SPENDWISE_PROXY_USER', 'SPENDWISE_PROXY_PASSWORD', 'SPENDWISE_SEED_PASSWORD'];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
}

const webUrl = process.env.SPENDWISE_WEB_URL ?? 'https://spendwise-igs.eastus2.cloudapp.azure.com:4406';
const apiUrl = process.env.SPENDWISE_API_URL ?? 'https://spendwise-igs.eastus2.cloudapp.azure.com:4506';
const userDataDir = 'test-results/manual-auth-session';

const context = await chromium.launchPersistentContext(userDataDir, {
  channel: 'chrome',
  headless: false,
  ignoreHTTPSErrors: true,
  httpCredentials: {
    username: process.env.SPENDWISE_PROXY_USER,
    password: process.env.SPENDWISE_PROXY_PASSWORD,
  },
});

const ui = context.pages()[0] ?? await context.newPage();
await ui.goto(`${webUrl}/__gate`);
await ui.getByTestId('login-email').fill('employee1@spendwise.test');
await ui.getByTestId('login-password').fill(process.env.SPENDWISE_SEED_PASSWORD);
await ui.getByTestId('login-submit').click();
await ui.waitForURL(url => !url.pathname.includes('login'), { timeout: 15_000 });

const swagger = await context.newPage();
await swagger.goto(`${apiUrl}/__gate`);
await ui.bringToFront();

console.log('UI autenticada y Swagger abierto. Cierra la ventana de Chrome para terminar esta sesión.');
await new Promise(resolve => context.on('close', resolve));
