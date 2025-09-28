// Import your service modules. We'll add more as they are created.
// Since falconx is working, you'll need to create a `falconx.js` file similar to `aquanow.js`.
const falconxService = require('../services/falconx'); 
// const aquanowService = require('../services/aquanow');
// const fireblocksService = require('../services/fireblocks');
// const talosService = require('../services/talos');

/**
 * Main handler for the Lambda function. It orchestrates fetching data
 * from all liquidity partners concurrently.
 */
exports.handler = async (event) => {
    // Define all the partner services to be called.
    // For now, we'll use the Aquanow mock service.
    const partnerServices = [
        { name: 'FalconX', service: falconxService.getExecutedQuotes },
        // { name: 'Aquanow', service: aquanowService.getOrders }
        // Add other services here as you build them.
    ];

    console.log('Starting liquidity aggregation for all partners...');

    // We use Promise.allSettled to run every service call at the same time.
    // This is very efficient and ensures that a failure in one service
    // does not stop the others from completing.
    const promises = partnerServices.map(p => p.service(new Date(), new Date())); // Using placeholder dates
    const results = await Promise.allSettled(promises);

    const successfulPartners = [];
    const failedPartners = [];
    const aggregatedData = {}; // We will store all data in this object

    // Now, we process the results from each service call.
    results.forEach((result, index) => {
        const partner = partnerServices[index];
        
        if (result.status === 'fulfilled' && result.value.status === 'success') {
            console.log(`Successfully fetched data from ${partner.name}.`);
            successfulPartners.push(partner.name);
            // Add the successful data to our main JSON blob, keyed by partner name.
            aggregatedData[partner.name] = result.value.data;

        } else {
            // This block catches any failures.
            const reason = result.reason ? (result.reason.error || result.reason.message) : (result.value && result.value.error);
            console.error(`Failed to fetch data from ${partner.name}:`, reason);
            failedPartners.push({
                partner: partner.name,
                reason: reason || 'Unknown error'
            });
        }
    });

    // This is the final JSON blob that the Lambda will output.
    const responsePayload = {
        message: 'Aggregation process completed.',
        summary: {
            successful: successfulPartners.length,
            failed: failedPartners.length,
        },
        successfulPartners,
        failedPartners,
        data: aggregatedData
    };

    // Return the response in the format required by API Gateway.
    return {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(responsePayload, null, 2), // Pretty-print for readability
    };
};