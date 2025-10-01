// src/lib/redshift-client.js
const { Client } = require('pg');

// --- CONFIGURATION ---
// It's crucial to use environment variables for security.
const redshiftConfig = {
    user: process.env.REDSHIFT_USER,
    host: process.env.REDSHIFT_HOST,
    database: process.env.REDSHIFT_DATABASE,
    password: process.env.REDSHIFT_PASSWORD,
    port: process.env.REDSHIFT_PORT || 5439,
};

/**
 * Inserts an array of records into a specified Redshift table.
 *
 * @param {string} tableName - The name of the table to insert into (e.g., 'raw_falconx_trades').
 * @param {Array<object>} data - An array of data objects to insert.
 */
async function batchInsert(tableName, data) {
    if (!data || data.length === 0) {
        console.log(`No data for table ${tableName}, skipping insert.`);
        return;
    }

    const client = new Client(redshiftConfig);
    try {
        await client.connect();
        console.log('Successfully connected to Redshift.');

        // --- Prepare the data for insertion ---
        // Each object in the 'data' array is stringified to be inserted into a SUPER column.
        const values = data.map(item => JSON.stringify(item)).join('\n');

        // --- Use a COPY command for efficient batch inserts ---
        // This is much faster than individual INSERT statements.
        const query = `
            COPY ${tableName} (raw_data)
            FROM STDIN
            DELIMITER '\\n'
        `;

        // We pipe the data directly to the COPY command.
        await new Promise((resolve, reject) => {
            const stream = client.query(query, (err, result) => {
                if (err) {
                    return reject(err);
                }
                resolve(result);
            });

            stream.write(values);
            stream.end();
        });
        
        console.log(`Batch insert of ${data.length} records into ${tableName} was successful.`);

    } catch (err) {
        console.error('Error during Redshift operation:', err);
        throw err;
    } finally {
        await client.end();
        console.log('Redshift client connection closed.');
    }
}

module.exports = { batchInsert };