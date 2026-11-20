import 'dotenv/config';

// Integration tests always run against the separate test database, never the dev one.
if (!process.env.DATABASE_URL_TEST) throw new Error('DATABASE_URL_TEST is not set');
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
process.env.TZ = 'America/New_York';
