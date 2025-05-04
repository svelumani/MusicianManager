/**
 * Test script for the monthly contract responses API
 * 
 * This script tests the different endpoints of the monthly contract response API
 * to verify they are working correctly.
 */

import fetch from 'node-fetch';

// Base URL for the API
const API_BASE_URL = 'http://localhost:5000/api';
let authCookie = '';

// Helper function to make API requests
async function makeRequest(method, endpoint, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Cookie: authCookie
    },
    credentials: 'include'
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  
  // Save the auth cookie if present
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    authCookie = setCookie;
  }
  
  return {
    status: response.status,
    data: await response.json().catch(() => null)
  };
}

// Test functions
async function login() {
  console.log('🔑 Logging in as admin...');
  const result = await makeRequest('POST', '/auth/login', {
    username: 'admin',
    password: 'admin123'
  });
  
  console.log(`Status: ${result.status}`);
  console.log('User data:', result.data);
  return result.status === 200;
}

async function testContractResponseSummary(contractId) {
  console.log(`📊 Testing contract response summary for contract ID ${contractId}...`);
  const result = await makeRequest('GET', `/monthly-contract-responses/${contractId}/summary`);
  
  console.log(`Status: ${result.status}`);
  console.log('Summary data:', result.data);
  return result.status === 200;
}

async function testUpdateContractStatus(contractId) {
  console.log(`📝 Testing update contract status for contract ID ${contractId}...`);
  const result = await makeRequest('PUT', `/monthly-contract-responses/${contractId}/status`, {
    status: 'in-progress',
    notes: 'Testing contract status update'
  });
  
  console.log(`Status: ${result.status}`);
  console.log('Update result:', result.data);
  return result.status === 200;
}

async function testUpdateMusicianContractStatus(musicianContractId) {
  console.log(`🎵 Testing update musician contract status for ID ${musicianContractId}...`);
  const result = await makeRequest('PUT', `/monthly-contract-responses/musicians/${musicianContractId}/status`, {
    status: 'accepted',
    notes: 'Testing musician contract status update'
  });
  
  console.log(`Status: ${result.status}`);
  console.log('Update result:', result.data);
  return result.status === 200;
}

// Main test function
async function runTests() {
  try {
    // First, we need to log in
    const loggedIn = await login();
    if (!loggedIn) {
      console.error('❌ Failed to log in. Tests cannot continue.');
      return;
    }
    
    console.log('✅ Login successful');
    
    // Use actual IDs from our database
    const contractId = 36; // Valid monthly contract ID
    const musicianContractId = 1; // Valid musician contract ID from our database query
    
    // Test contract response summary
    const summarySuccess = await testContractResponseSummary(contractId);
    console.log(summarySuccess ? '✅ Summary test passed' : '❌ Summary test failed');
    
    // Test update contract status
    const updateContractSuccess = await testUpdateContractStatus(contractId);
    console.log(updateContractSuccess ? '✅ Contract update test passed' : '❌ Contract update test failed');
    
    // Test update musician contract status
    const updateMusicianSuccess = await testUpdateMusicianContractStatus(musicianContractId);
    console.log(updateMusicianSuccess ? '✅ Musician update test passed' : '❌ Musician update test failed');
    
    console.log('\n📋 Test Summary:');
    console.log(`Summary test: ${summarySuccess ? 'PASSED' : 'FAILED'}`);
    console.log(`Contract update test: ${updateContractSuccess ? 'PASSED' : 'FAILED'}`);
    console.log(`Musician update test: ${updateMusicianSuccess ? 'PASSED' : 'FAILED'}`);
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the tests
runTests();