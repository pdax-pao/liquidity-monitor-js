require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');

// --- CONFIGURATION ---
const CONFIG = {
    apiKey: process.env.FALCONX_API_KEY,
    secretKey: process.env.FALCONX_API_SECRET,
    passphrase: process.env.FALCONX_API_PASSPHRASE,
    apiBaseUrl: 'https://api.falconx.io',
    fetchFrequencyMinutes: 5, // Fetch data for the last 5 minutes
};

/**
 * Generates the required authentication headers for FalconX API requests.
 */
function generateAuthHeaders(method, requestPath, body = '') {
    const timestamp = (Date.now() / 1000).toString();
    const prehashString = timestamp + method.toUpperCase() + requestPath + body;
    
    const secret = Buffer.from(CONFIG.secretKey, 'base64');
    const hmac = crypto.createHmac('sha256', secret);
    const signature = hmac.update(prehashString).digest('base64');

    return {
        'FX-ACCESS-KEY': CONFIG.apiKey,
        'FX-ACCESS-SIGN': signature,
        'FX-ACCESS-TIMESTAMP': timestamp,
        'FX-ACCESS-PASSPHRASE': CONFIG.passphrase,
        'Content-Type': 'application/json',
    };
}

/**
 * Fetches, transforms, and stores actual trade data from the API.
 */
async function getExecutedQuotes() {
    console.log(`Fetching executed quotes for the last ${CONFIG.fetchFrequencyMinutes} minutes...`);

    const t_end = new Date();
    const t_start = new Date(t_end.getTime() - CONFIG.fetchFrequencyMinutes * 60 * 1000);

    const requestPath = `/v1/quotes?t_start=${t_start.toISOString()}&t_end=${t_end.toISOString()}&status=success`;
    const headers = generateAuthHeaders('GET', requestPath);

    try {
        const response = await axios.get(`${CONFIG.apiBaseUrl}${requestPath}`, { headers });
        const quotes = response.data;

        if (!Array.isArray(quotes) || quotes.length === 0) {
            console.log('No new trades found in the specified timeframe.');
            return {
                partner: 'FalconX',
                status: 'success',
                data: []
            };
        }
        
        console.log(`Found ${quotes.length} trades from API. Processing and inserting...`);

        // --- Map API data to the new database schema ---
        const mappedQuotes = quotes.map(quote => {
            const baseToken = quote.token_pair.base_token;
            const quoteToken = quote.token_pair.quote_token;
            const side = quote.side_executed;
            const price = side === 'sell' ? parseFloat(quote.sell_price) : parseFloat(quote.buy_price);
            let quantityQuote = side === 'sell' ? parseFloat(quote.position_in.value) : parseFloat(quote.position_out.value);

            return {
                tradeId: quote.fx_quote_id, orderId: quote.client_order_id, venue: null, subaccount: null,
                baseToken: baseToken, quoteToken: quoteToken, symbol: `${baseToken}/${quoteToken}`, productType: null,
                tradeTime: quote.t_execute, quantityBase: parseFloat(quote.quantity_requested.value),
                quantityQuote: quantityQuote, price: price, side: side, platform: quote.platform,
                orderType: quote.order_type, feesGross: quote.gross_fee_usd, feesToken: quoteToken,
            };
        });

        return {
            partner: 'FalconX',
            status: 'success',
            data: mappedQuotes
        };


    } catch (error) {
        console.error('Failed to fetch or process trades:', error.response ? error.response.data : error.message);
        return {
            partner: 'FalconX',
            status: 'error',
            error: error.message
        };
    }
}

async function main() {
    const trades = await getExecutedQuotes();
    console.log(JSON.stringify(trades, null, 2));
}

if (require.main === module) {
    main();
}

module.exports = { getExecutedQuotes };