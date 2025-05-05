
const { db } = require('../server/db');
const { monthlyContracts, plannerAssignments } = require('../shared/schema');
const { eq } = require('drizzle-orm');

async function inspectContract(contractId) {
  try {
    console.log();
    
    // Get the contract
    const contract = await db.query.monthlyContracts.findFirst({
      where: eq(monthlyContracts.id, contractId),
      with: {
        assignments: true
      }
    });
    
    console.log('Contract:', JSON.stringify(contract, null, 2));
    
    if (contract && contract.assignments) {
      console.log();
      
      // Get details for each assignment
      if (contract.assignments.length > 0) {
        console.log('Sample assignment:', JSON.stringify(contract.assignments[0], null, 2));
      }
    }
  } catch (error) {
    console.error('Error inspecting contract:', error);
  }
}

// Pass the contract ID as an argument
const contractId = parseInt(process.argv[2]);
if (!contractId || isNaN(contractId)) {
  console.error('Please provide a valid contract ID');
  process.exit(1);
}

inspectContract(contractId).finally(() => process.exit(0));

