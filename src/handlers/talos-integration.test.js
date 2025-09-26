// This will be the *real* talos service, not a mock
const talosService = require('../services/talos'); 
require('dotenv').config(); // Make sure your .env file is configured

// We use 'describe.skip' so this test doesn't run automatically.
describe('Talos Integration Test', () => {

    test('should fetch real trade data from Talos and log it to the console', async () => {
        // Set a longer timeout for the real API call
        jest.setTimeout(30000); 

        let talosData;
        try {
            // ACT: Call the real Talos service
            talosData = await talosService.getTrades();
        } catch (error) {
            console.error("Failed to fetch data from Talos:", error);
            throw error; // Fail the test if the API call is unsuccessful
        }

        // ASSERT: Check that we got a successful response
        expect(talosData.status).toBe('success');
        expect(talosData.data).toBeDefined();

        // --- CHANGE ---
        // Log the JSON blob directly to the console in a readable format
        console.log("--- TALOS API RESPONSE (JSON BLOB) ---");
        console.log(JSON.stringify(talosData.data, null, 2));
        console.log("--------------------------------------");
    });
});