// Use 'dotenv' to load environment variables from a .env file
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const axios = require('axios');
const crypto = require('crypto');

// --- Configuration ---
const API_KEY = process.env.AQUANOW_API_KEY;
const API_SECRET = process.env.AQUANOW_API_SECRET;
const BASE_URL = process.env.AQUANOW_BASE_URL;

// API endpoint for getting transactions
const ENDPOINT = "/accounts/v1/transaction";

/**
 * Creates the authentication headers for an Aquanow API request.
 * @param {string} requestUrl - The request path including query parameters (e.g., '/accounts/v1/transaction?startTime=...').
 * @returns {object} An object containing the x-api-key, x-signature, and x-nonce headers.
 */
const createAquanowAuthHeaders = (requestUrl) => {
    // A nonce is a unique number for each request; using the current timestamp in milliseconds is a common practice.
    const nonce = Date.now().toString();

    // The message to be signed is the nonce concatenated with the request URL.
    const message = nonce + requestUrl;

    // The signature is an HMAC-SHA256 hash of the message, encoded in hexadecimal.
    const signature = crypto
        .createHmac('sha256', API_SECRET)
        .update(message)
        .digest('hex');

    // Return the complete headers object.
    return {
        "x-api-key": API_KEY,
        "x-signature": signature,
        "x-nonce": nonce
    };
};

/**
 * Fetches all transactions from the last 10 minutes from the Aquanow API.
 */
async function getTransactionsLast10Minutes() {
    // Get the current time in milliseconds
    const currentTimeMs = Date.now();
    
    // Calculate the time 10 minutes ago in milliseconds
    const tenMinutesAgoMs = currentTimeMs - (10 * 60 * 1000);
    
    // --- Create the request URL with the startTime parameter ---
    const requestUrl = `${ENDPOINT}?startTime=${tenMinutesAgoMs}&limit=1000`;
    
    // --- Generate authentication headers using the new helper function ---
    const headers = createAquanowAuthHeaders(requestUrl);
        
    // --- Make the API request ---
    try {
        console.log("Requesting transactions from the last 10 minutes...");
        console.log(`URL: ${BASE_URL}${requestUrl}\n`);

        const response = await axios.get(BASE_URL + requestUrl, { headers });
        const transactions = response.data;
        
        // --- Display the results ---
        if (transactions && transactions.length > 0) {
            console.log("--- Recent Transactions ---");
            transactions.forEach(tx => {
                console.log(`  ID: ${tx.txId}`);
                console.log(`  Type: ${tx.transactionType}`);
                console.log(`  Symbol: ${tx.symbol}`);
                console.log(`  Quantity: ${tx.quantity}`);
                console.log(`  Timestamp: ${tx.createdAt}`);
                console.log("--------------------");
            });
        } else {
            console.log("No transactions found in the last 10 minutes.");
        }
        
    } catch (error) {
        console.error("An error occurred while fetching transactions:");
        if (error.response) {
            console.error(`HTTP Error: ${error.response.status} ${error.response.statusText}`);
            console.error("Response Body:", error.response.data);
        } else if (error.request) {
            console.error("No response received from the server.");
        } else {
            console.error('Error', error.message);
        }
    }
}

// --- Run the function ---
if (require.main === module) {
    if (!API_KEY || !API_SECRET || !BASE_URL) {
        console.log("Please make sure AQUANOW_API_KEY, AQUANOW_API_SECRET, and AQUANOW_BASE_URL are set in your ../.env file.");
    } else {
        getTransactionsLast10Minutes();
    }
}