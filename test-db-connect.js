// test-db-connection.js
require('dotenv').config(); // Loads variables from your .env file
const { Client } = require('pg');

// This config object is the same as the one in db-client.js
const supabaseConfig = {
    user: process.env.SUPABASE_USER,
    host: process.env.SUPABASE_HOST,
    database: process.env.SUPABASE_DATABASE,
    password: process.env.SUPABASE_PASSWORD,
    port: process.env.SUPABASE_PORT || 5432,
};

async function checkConnection() {
    console.log('Attempting to connect to Supabase...');
    const client = new Client(supabaseConfig);

    try {
        await client.connect();
        console.log('✅ Connection Successful!');
        
        // Let's run a simple query to be sure
        const res = await client.query('SELECT NOW()');
        console.log('🕒 Server time:', res.rows[0].now);

    } catch (err) {
        console.error('🔥 Connection Failed:', err.stack);
    } finally {
        await client.end();
        console.log('Client has disconnected.');
    }
}

checkConnection();