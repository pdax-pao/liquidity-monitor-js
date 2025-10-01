// --- Import dotenv and configure it to look one directory up ---
require('dotenv').config({ path: '../.env' });
const https = require('https');
const crypto = require('crypto');

// --- Load credentials from environment variables ---
const apiKey = process.env.TALOS_API_KEY;
const apiSecret = process.env.TALOS_API_SECRET;
const host = process.env.TALOS_API_HOST;

// --- Basic check to ensure environment variables are loaded ---
if (!apiKey || !apiSecret || !host) {
    console.error('Error: Make sure TALOS_API_KEY, TALOS_API_SECRET, and TALOS_API_HOST are set in your ../.env file');
    process.exit(1);
}

console.log('✅ Script started. Credentials loaded successfully.');

const path = '/v1/execution-reports';

// Calculate the timestamp for the last 5 minutes
const now = new Date();
const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

const utcNow = now.toISOString().replace(/\.\d{3}Z$/, '.000000Z');
const utcFiveMinutesAgo = fiveMinutesAgo.toISOString().replace(/\.\d{3}Z$/, '.000000Z');

const query = `StartDate=${utcFiveMinutesAgo}&EndDate=${utcNow}`;

const params = [
    'GET',
    utcNow,
    host,
    path,
    query
];

const payload = params.join('\n');

const hash = crypto.createHmac('sha256', Buffer.from(apiSecret, 'ascii'));
hash.update(Buffer.from(payload, 'ascii'));
const signature = hash.digest('base64url');

const options = {
    hostname: host,
    path: `${path}?${query}`,
    method: 'GET',
    headers: {
        'TALOS-KEY': apiKey,
        'TALOS-SIGN': signature,
        'TALOS-TS': utcNow,
    }
};
console.log(`🔷 TALOS-TS Header: ${utcNow}`);

console.log(`🚀 Sending request to: https://${options.hostname}${options.path}`);

const req = https.request(options, (res) => {
    // This logs the status code from the server
    console.log(`statusCode: ${res.statusCode}`);
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const jsonData = JSON.parse(data);
            // This logs the final JSON data from the API
            console.log('--- API Response ---');
            console.log(JSON.stringify(jsonData, null, 2));
        } catch (e) {
            // This logs an error if the response isn't valid JSON
            console.error('Error parsing JSON response:', e);
            console.log('Raw response:', data);
        }
    });
});

req.on('error', (error) => {
    // This logs any error with the request itself
    console.error('--- Request Error ---');
    console.error(error);
});

req.end();