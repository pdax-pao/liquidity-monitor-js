// --- Import dotenv and configure it to look one directory up ---
require('dotenv').config({ path: '../.env' });
const https = require('https' );
const crypto = require('crypto');

// --- Load credentials from environment variables ---
const apiKey = process.env.TALOS_API_KEY;
const apiSecret = process.env.TALOS_API_SECRET;
const host = process.env.TALOS_API_HOST;

/**
 * Creates the authentication headers required for a Talos API request.
 * @param {string} path - The request path (e.g., '/v1/execution-reports').
 * @param {string} query - The URL query string (e.g., 'StartDate=...&EndDate=...').
 * @returns {object} An object containing the TALOS-KEY, TALOS-TS, and TALOS-SIGN headers.
 */
const createAuthHeaders = (path, query) => {
    // FIX 2: Generate a timestamp with microsecond-level formatting.
    // JavaScript's Date object is only precise to milliseconds.
    // We format the ISO string to show 6 decimal places for seconds as some APIs require.
    const now = new Date();
    const timestamp = now.toISOString().replace('Z', '000Z'); // Turns '.123Z' into '.123000Z'

    // Construct the payload that will be signed. The order is critical.
    const params = [
        'GET',
        timestamp, // Use the exact microsecond-formatted timestamp
        host,
        path,
        query
    ];
    const payloadToSign = params.join('\n');

    // Create the signature using standard base64 encoding.
    const signature = crypto
        .createHmac('sha256', apiSecret)
        .update(payloadToSign)
        .digest('base64');

    // FIX 1: Convert the standard base64 signature to be URL-safe
    // by replacing '+' with '-' and '/' with '_'.
    const urlSafeSignature = signature.replace(/\+/g, '-').replace(/\//g, '_');

    // Return the headers object.
    return {
        'TALOS-KEY': apiKey,
        'TALOS-TS': timestamp,
        'TALOS-SIGN': urlSafeSignature,
    };
};


/**
 * Generates a timestamp, signs the payload, and sends a request to the Talos API.
 */
function sendTalosRequest() {
    const startTime = new Date();
    console.log(`⏱️  Execution Start Time: ${startTime.toISOString()}`);

    const path = '/v1/execution-reports';

    // --- Define the query parameters ---
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    // Note: The timestamp for the query does not need microsecond formatting.
    const utcNow = now.toISOString();
    const utcFiveMinutesAgo = fiveMinutesAgo.toISOString();

    const query = `StartDate=${utcFiveMinutesAgo}&EndDate=${utcNow}`;

    // --- Generate authentication headers using the new function ---
    const authHeaders = createAuthHeaders(path, query);

    const options = {
        hostname: host,
        path: `${path}?${query}`,
        method: 'GET',
        headers: authHeaders // Use the newly generated headers here
    };

    console.log(`🔷 Timestamp for Hash (TALOS-TS): ${authHeaders['TALOS-TS']}`);
    console.log(`🚀 Sending request to: https://${options.hostname}${options.path}`);

    const req = https.request(options, (res) => {
        console.log(`statusCode: ${res.statusCode}`);
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            const endTime = new Date();
            console.log(`🏁 Execution End Time:   ${endTime.toISOString()}`);
            const duration = endTime - startTime;
            console.log(`⏳ Total Duration:       ${duration} ms`);

            console.log('--- Raw API Response ---');
            console.log(data);
            console.log('------------------------');

            try {
                const jsonData = JSON.parse(data);
                console.log('--- Formatted JSON (if applicable) ---');
                console.log(JSON.stringify(jsonData, null, 2));
                console.log('--------------------------------------');
            } catch (e) {
                console.log('(Response was not valid JSON)');
            }
        });
    });

    req.on('error', (error) => {
        console.error('--- Request Error ---');
        console.error(error);
    });

    req.end();
}

// --- Script Execution Starts Here ---
if (!apiKey || !apiSecret || !host) {
    console.error('Error: Make sure TALOS_API_KEY, TALOS_API_SECRET, and TALOS_API_HOST are set in your ../.env file');
    process.exit(1);
}

sendTalosRequest();