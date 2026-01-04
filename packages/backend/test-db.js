import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  database: 'chartgen_dev',
  user: 'chartgen',
  // password: 'dev_password', // Testing without password since pg_hba.conf is set to trust
});

async function testConnection() {
  try {
    await client.connect();
    console.log('✓ Successfully connected to database!');
    const res = await client.query('SELECT version()');
    console.log('PostgreSQL version:', res.rows[0].version);
    await client.end();
  } catch (err) {
    console.error('✗ Connection error:', err.message);
    console.error('Full error:', err);
  }
}

testConnection();
