// Use 'dotenv' to load environment variables from a .env file
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const axios = require('axios');
const crypto = require('crypto');

// --- Configuration ---
// Credentials are now loaded from the .env file
const API_KEY = process.env.AQUANOW_API_KEY;
const API_SECRET = process.env.AQUANOW_API_SECRET;
const BASE_URL = process.env.AQUANOW_BASE_URL;

// API endpoint for getting transactions
const ENDPOINT = "/accounts/v1/transaction";

/**
 * Fetches all transactions from the last 10 minutes from the Aquanow API.
 */
async function getTransactionsLast10Minutes() {
    // Get the current time in milliseconds
    const currentTimeMs = Date.now();
    
    // Calculate the time 10 minutes ago in milliseconds
    const tenMinutesAgoMs = currentTimeMs - (10 * 60 * 1000);
    
    // Nonce must be a string for the signature
    const nonce = currentTimeMs.toString();
    
    // --- Create the request URL with the startTime parameter ---
    const requestUrl = `${ENDPOINT}?startTime=${tenMinutesAgoMs}&limit=1000`;
    
    // --- Generate the signature for authentication ---
    const message = nonce + requestUrl;
    
    const signature = crypto
        .createHmac('sha256', API_SECRET)
        .update(message)
        .digest('hex');
        
    // --- Set up the request headers ---
    const headers = {
        "x-api-key": API_KEY,
        "x-signature": signature,
        "x-nonce": nonce
    };
    
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