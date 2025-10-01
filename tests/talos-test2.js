// --- Import dotenv and configure it to look one directory up ---
require('dotenv').config({ path: '../.env' });
const https = require('https' );
const crypto = require('crypto');

// --- Load credentials from environment variables ---
const apiKey = process.env.TALOS_API_KEY;
const apiSecret = process.env.TALOS_API_SECRET;
const host = process.env.TALOS_API_HOST;

/**
 * Generates a timestamp, signs the payload, and sends a request to the Talos API.
 */
function sendTalosRequest() {
    const startTime = new Date();
    console.log(`⏱️  Execution Start Time: ${startTime.toISOString()}`);

    const path = '/v1/execution-reports';

    // This is the timestamp that will be used
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const utcNow = now.toISOString().replace(/\.\d{3}Z$/, '.000000Z');
    const utcFiveMinutesAgo = fiveMinutesAgo.toISOString().replace(/\.\d{3}Z$/, '.000000Z');

    const query = `StartDate=${utcFiveMinutesAgo}&EndDate=${utcNow}`;

    // 'utcNow' is placed directly into the array to be hashed
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

    // This line logs the exact timestamp used in the hash
    console.log(`🔷 Timestamp for Hash (TALOS-TS): ${utcNow}`);
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