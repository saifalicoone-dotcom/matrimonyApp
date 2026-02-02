/**
 * Test script for OTP-based authentication system
 * This script demonstrates the complete OTP-based registration and login flow
 */

require('dotenv').config();
const axios = require('axios');

// Base URL for your API
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Test phone number (use a valid phone number format)
const TEST_PHONE = '+1234567890'; // Replace with actual test phone
const TEST_EMAIL = 'test@example.com';

async function testOTPAuthFlow() {
  console.log('Starting OTP-based authentication flow test...\n');
  
  try {
    // Test 1: Health check
    console.log('Test 1: Checking health status...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✓ Health check passed:', healthResponse.data.status);
    console.log('Services status:', healthResponse.data.checks);
    console.log('');
    
    // Test 2: Register with OTP
    console.log('Test 2: Initiating registration with OTP...');
    try {
      const registerRes = await axios.post(`${BASE_URL}/api/auth/register-otp`, {
        phone: TEST_PHONE
      });
      console.log('✓ Registration initiation successful:', registerRes.data.message);
      console.log('Response:', registerRes.data);
    } catch (error) {
      console.log('✗ Registration initiation failed:', error.response?.data || error.message);
    }
    console.log('');
    
    // Note: In a real test scenario, you would need to retrieve the OTP sent to the phone
    // For demo purposes, we'll assume the OTP is known (in development mode it might be returned)
    
    // Test 3: Complete registration with OTP
    console.log('Test 3: Completing registration with OTP...');
    try {
      // This is a placeholder - in real scenario you'd use the actual OTP received
      const otp = '123456'; // Replace with actual OTP received
      
      const completeRegRes = await axios.post(`${BASE_URL}/api/auth/complete-registration`, {
        phone: TEST_PHONE,
        otp: otp,
        email: TEST_EMAIL
      });
      
      console.log('✓ Registration completion successful:', completeRegRes.data.message);
      console.log('User ID:', completeRegRes.data.data.user.id);
      const token = completeRegRes.data.data.token;
      console.log('JWT Token received');
    } catch (error) {
      console.log('✗ Registration completion failed:', error.response?.data || error.message);
    }
    console.log('');
    
    // Test 4: Login with OTP
    console.log('Test 4: Initiating login with OTP...');
    try {
      const loginRes = await axios.post(`${BASE_URL}/api/auth/login-otp`, {
        phone: TEST_PHONE
      });
      console.log('✓ Login initiation successful:', loginRes.data.message);
      console.log('Response:', loginRes.data);
    } catch (error) {
      console.log('✗ Login initiation failed:', error.response?.data || error.message);
    }
    console.log('');
    
    // Test 5: Complete login with OTP
    console.log('Test 5: Completing login with OTP...');
    try {
      // This is a placeholder - in real scenario you'd use the actual OTP received
      const otp = '123456'; // Replace with actual OTP received
      
      const completeLoginRes = await axios.post(`${BASE_URL}/api/auth/complete-login`, {
        phone: TEST_PHONE,
        otp: otp
      });
      
      console.log('✓ Login completion successful:', completeLoginRes.data.message);
      console.log('User ID:', completeLoginRes.data.data.user.id);
      const token = completeLoginRes.data.data.token;
      console.log('JWT Token received');
    } catch (error) {
      console.log('✗ Login completion failed:', error.response?.data || error.message);
    }
    console.log('');
    
    console.log('OTP-based authentication flow test completed!');
    
  } catch (error) {
    console.error('Test suite failed:', error.message);
  }
}

// Run the test
testOTPAuthFlow().catch(console.error);