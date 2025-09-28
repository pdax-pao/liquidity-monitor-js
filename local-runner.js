// local-runner.js

// Import the handler function from your aggregator file
const { handler } = require('./src/handlers/liquidity-aggregator');

// This is an async function so we can use 'await'
async function run() {
  console.log('--- Running Local Test ---');
  
  // Call the handler with an empty event object, just like Lambda would
  const result = await handler({});
  
  // Log the output to the console
  console.log('--- Handler Response ---');
  console.log(JSON.stringify(JSON.parse(result.body), null, 2)); 
  console.log('------------------------');
}

// Execute the run function
run();