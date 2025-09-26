const { handler } = require('../src/handlers/liquidity-aggregator');

// --- 1. MOCK ALL SERVICE MODULES ---
// This replaces the real services with fakes that we can control in our tests.
jest.mock('../src/services/falconx');
jest.mock('../src/services/fireblocks');
jest.mock('../src/services/talos');
jest.mock('../src/services/aquanow');

// Import the mocked services
const falconxService = require('../src/services/falconx');
const fireblocksService = require('../src/services/fireblocks');
const talosService = require('../src/services/talos');
const aquanowService = require('../src/services/aquanow');

// --- (Optional but Recommended) PREPARE FOR REAL JSON DATA ---
// When you get a real JSON blob, you can save it in a file like 'tests/mock-data/aquanow-success.json'
// and then import it like this:
// const mockAquanowSuccess = require('./mock-data/aquanow-success.json');


describe('Liquidity Aggregator Handler', () => {

    // This function runs before each test, ensuring a clean state.
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // --- 2. DEFINE TEST CASES ---

    test('should aggregate data successfully when all partners respond', async () => {
        // ARRANGE: Define the return values for our mocked services.
        falconxService.getExecutedQuotes.mockResolvedValue({
            partner: 'FalconX', status: 'success', data: [{ tradeId: 'fx1' }]
        });
        fireblocksService.getTransactions.mockResolvedValue({
            partner: 'Fireblocks', status: 'success', data: [{ transactionId: 'fb1' }]
        });
        talosService.getTrades.mockResolvedValue({
            partner: 'Talos', status: 'success', data: [{ tradeId: 'talos1' }]
        });
        // Here you could use your real data blob like this:
        // aquanowService.getOrders.mockResolvedValue({
        //     partner: 'Aquanow', status: 'success', data: mockAquanowSuccess
        // });
        aquanowService.getOrders.mockResolvedValue({
            partner: 'Aquanow', status: 'success', data: [{ orderId: 'aq1' }]
        });


        // ACT: Call the handler with an empty event object.
        const result = await handler({});
        const body = JSON.parse(result.body);

        // ASSERT: Check if the output is correct.
        expect(result.statusCode).toBe(200);
        expect(body.successfulPartners).toHaveLength(4);
        expect(body.failedPartners).toHaveLength(0);
        expect(body.data).toHaveLength(4); // 1 item from each partner
    });

    test('should handle partial failures gracefully', async () => {
        // ARRANGE: Simulate success from some partners and failure from others.
        falconxService.getExecutedQuotes.mockResolvedValue({
            partner: 'FalconX', status: 'success', data: [{ tradeId: 'fx1' }]
        });
        aquanowService.getOrders.mockResolvedValue({
            partner: 'Aquanow', status: 'success', data: [{ orderId: 'aq1' }]
        });
        fireblocksService.getTransactions.mockResolvedValue({ // A failure reported by the service itself
            partner: 'Fireblocks', status: 'error', error: 'Invalid API Key'
        });
        talosService.getTrades.mockRejectedValue({ // A complete promise rejection (e.g., network error)
            partner: 'Talos', error: 'Connection Timeout'
        });

        // ACT
        const result = await handler({});
        const body = JSON.parse(result.body);

        // ASSERT
        expect(result.statusCode).toBe(200);
        expect(body.successfulPartners).toEqual(['FalconX', 'Aquanow']);
        expect(body.failedPartners).toHaveLength(2);
        expect(body.data).toHaveLength(2); // Only data from successful partners
        expect(body.failedPartners).toContainEqual({
            partner: 'Fireblocks',
            reason: 'Invalid API Key'
        });
    });
});