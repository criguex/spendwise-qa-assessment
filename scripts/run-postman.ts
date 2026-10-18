import 'dotenv/config';
import newman from 'newman';

const required = ['SPENDWISE_API_URL', 'SPENDWISE_PROXY_USER', 'SPENDWISE_PROXY_PASSWORD', 'SPENDWISE_SEED_PASSWORD'];
const missing = required.filter(name => !process.env[name]);

if (missing.length) {
  console.error(`Faltan variables locales: ${missing.join(', ')}`);
  process.exit(2);
}

newman.run({
  collection: 'postman/SpendWise-QA.postman_collection.json',
  environment: 'postman/SpendWise-QA.postman_environment.json',
  insecure: true,
  reporters: ['cli'],
  envVar: [
    { key: 'apiUrl', value: process.env.SPENDWISE_API_URL },
    { key: 'proxyUser', value: process.env.SPENDWISE_PROXY_USER },
    { key: 'proxyPassword', value: process.env.SPENDWISE_PROXY_PASSWORD },
    { key: 'seedPassword', value: process.env.SPENDWISE_SEED_PASSWORD },
  ],
}, (error, summary) => {
  if (error) {
    console.error(`Newman no pudo iniciar: ${error.message}`);
    process.exitCode = 2;
    return;
  }

  const failures = summary.run.failures.length;
  process.exitCode = failures > 0 ? 1 : 0;
});
