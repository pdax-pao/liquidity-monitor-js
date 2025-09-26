const axios = require('axios');
const crypto = require('crypto');
// dotenv is already configured in the test file, so no need to call config() here.

// Load credentials and configuration from environment variables
const { TALOS_API_KEY, TALOS_API_SECRET, TALOS_API_URL } = process.env;

/**
 * Creates the necessary authentication headers for a Talos API request.
 * @param {string} path - The API endpoint path (e.g., '/v1/execution-reports').
 * @param {string} query - The query string for the request.
 * @returns {object} The headers object for the API request.
 */
const createAuthHeaders = (path, query) => {
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, '.000000Z');
    const host = new URL(TALOS_API_URL).host;

    let payloadToSign = ['GET', timestamp, host, path];
    if (query) {
        payloadToSign.push(query);
    }
    const signaturePayload = payloadToSign.join('\n');

    const signature = crypto
        .createHmac('sha256', TALOS_API_SECRET)
        .update(signaturePayload)
        .digest('base64');

    return {
        'TALOS-KEY': TALOS_API_KEY,
        'TALOS-TS': timestamp,
        'TALOS-SIGN': signature,
    };
};

/**
 * Fetches executed trades from the last 15 minutes from Talos.
 * This is the function our test will call.
 */
const getTrades = async () => {
    try {
        const now = new Date();
        const fifteenMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

        const startDate = fifteenMinutesAgo.toISOString();
        const endDate = now.toISOString();

        const path = '/v1/execution-reports';
        const query = `StartDate=${startDate}&EndDate=${endDate}`;
        const headers = createAuthHeaders(path, query);
        
        const response = await axios.get(`${TALOS_API_URL}${path}?${query}`, { headers });
        
        // Filter for reports that indicate a trade (fill)
        const filledOrders = response.data.data.filter(report => report.ExecType === 'Trade');

        // Return data in the format expected by the aggregator
        return {
            partner: 'Talos',
            status: 'success',
            data: filledOrders
        };

    } catch (error) {
        console.error('Error in Talos service:', error.response ? error.response.data : error.message);
        // Return an error object in the expected format
        return {
            partner: 'Talos',
            status: 'error',
            error: error.response ? error.response.data : error.message,
        };
    }
};

// We must export the function so other files can import and use it.
module.exports = {
    getTrades
};