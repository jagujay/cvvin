// Simple test script for OTP functionality
const API_BASE_URL = 'http://localhost:3000';

async function testOTP() {
  const testEmail = 'test@example.com';
  
  try {
    console.log('🧪 Testing OTP functionality...\n');
    
    // Test 1: Send OTP
    console.log('1. Sending OTP...');
    const sendResponse = await fetch(`${API_BASE_URL}/api/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        type: 'verification'
      })
    });
    
    const sendData = await sendResponse.json();
    console.log('Send OTP Response:', sendData);
    
    if (!sendData.success) {
      throw new Error('Failed to send OTP');
    }
    
    // Test 2: Verify OTP (this will fail since we don't have the actual OTP)
    console.log('\n2. Testing OTP verification with wrong code...');
    const verifyResponse = await fetch(`${API_BASE_URL}/api/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        otp: '123456',
        type: 'verification'
      })
    });
    
    const verifyData = await verifyResponse.json();
    console.log('Verify OTP Response (wrong code):', verifyData);
    
    // Test 3: Health check
    console.log('\n3. Testing health check...');
    const healthResponse = await fetch(`${API_BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('Health Check Response:', healthData);
    
    console.log('\n✅ OTP test completed!');
    console.log('\n📧 Check your email for the actual OTP code.');
    console.log('💡 Use the OTP from the email to test verification manually.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testOTP();
