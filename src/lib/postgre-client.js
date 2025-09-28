// src/lib/db-client.js
const { Client } = require('pg');

// Configuration for Supabase. You can find these in your Supabase project settings.
const supabaseConfig = {
    user: process.env.SUPABASE_USER,
    host: process.env.SUPABASE_HOST,
    database: process.env.SUPABASE_DATABASE,
    password: process.env.SUPABASE_PASSWORD,
    port: process.env.SUPABASE_PORT || 5432,
};

/**
 * Inserts an array of records into a specified Supabase (PostgreSQL) table.
 *
 * @param {string} tableName - The name of the table to insert into (e.g., 'raw_falconx_trades').
 * @param {Array<object>} data - An array of data objects to insert.
 */
async function batchInsert(tableName, data) {
    if (!data || data.length === 0) {
        console.log(`No data for table ${tableName}, skipping insert.`);
        return;
    }

    const client = new Client(supabaseConfig);
    try {
        await client.connect();
        console.log('Successfully connected to Supabase.');

        // For PostgreSQL, you'll want a table with a JSONB column.
        // Example SQL:
        // CREATE TABLE raw_falconx_trades (id SERIAL PRIMARY KEY, ingested_at TIMESTAMPTZ DEFAULT NOW(), raw_data JSONB);

        // We map each data object to a parameterized value ($1, $2, etc.) to prevent SQL injection.
        const values = data.map(item => [JSON.stringify(item)]); // Wrap each JSON string in an array
        
        // This uses a more secure and efficient way to insert many rows in PostgreSQL
        const query = `INSERT INTO ${tableName} (raw_data) SELECT * FROM UNNEST($1::jsonb[])`;
        
        await client.query(query, [values.map(v => v[0])]);
        
        console.log(`Batch insert of ${data.length} records into ${tableName} was successful.`);

    } catch (err) {
        console.error('Error during Supabase operation:', err);
        throw err;
    } finally {
        await client.end();
        console.log('Supabase client connection closed.');
    }
}

module.exports = { batchInsert };