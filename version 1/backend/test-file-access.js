const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'password123';

// Test file access functionality
async function testFileAccess() {
  try {
    console.log('🧪 Testing File Access Functionality\n');

    // Step 1: Login to get authentication token
    console.log('1. 🔐 Authenticating user...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    const token = loginResponse.data.data.token;
    console.log('✅ Authentication successful\n');

    // Step 2: Upload a test file
    console.log('2. 📤 Uploading test file...');
    
    // Create a test file
    const testContent = 'This is a test file for CVVIN platform file access testing.';
    fs.writeFileSync('test-file.txt', testContent);
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream('test-file.txt'));
    
    const uploadResponse = await axios.post(`${BASE_URL}/api/users/files/upload`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      }
    });

    const fileId = uploadResponse.data.fileId;
    console.log(`✅ File uploaded successfully. File ID: ${fileId}\n`);

    // Step 3: Get file information
    console.log('3. 📋 Getting file information...');
    const fileInfoResponse = await axios.get(`${BASE_URL}/api/users/files/${fileId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ File information retrieved:');
    console.log(`   - File Name: ${fileInfoResponse.data.data.fileName}`);
    console.log(`   - File Size: ${fileInfoResponse.data.data.fileSize} bytes`);
    console.log(`   - MIME Type: ${fileInfoResponse.data.data.mimeType}`);
    console.log(`   - Storage Method: ${fileInfoResponse.data.data.storageMethod}\n`);

    // Step 4: Get file URLs
    console.log('4. 🔗 Getting file URLs...');
    const fileUrlResponse = await axios.get(`${BASE_URL}/api/files/${fileId}/url`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ File URLs retrieved:');
    console.log(`   - Download URL: ${fileUrlResponse.data.data.downloadUrl}`);
    console.log(`   - View URL: ${fileUrlResponse.data.data.viewUrl}\n`);

    // Step 5: Download file
    console.log('5. ⬇️ Downloading file...');
    const downloadResponse = await axios.get(`${BASE_URL}/api/files/${fileId}/download`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      responseType: 'stream'
    });

    // Save downloaded file
    const downloadedFile = 'downloaded-test-file.txt';
    const writer = fs.createWriteStream(downloadedFile);
    downloadResponse.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    console.log(`✅ File downloaded successfully as: ${downloadedFile}\n`);

    // Step 6: Verify downloaded content
    console.log('6. ✅ Verifying downloaded content...');
    const downloadedContent = fs.readFileSync(downloadedFile, 'utf8');
    
    if (downloadedContent === testContent) {
      console.log('✅ Downloaded content matches original content\n');
    } else {
      console.log('❌ Downloaded content does not match original content\n');
    }

    // Step 7: List all user files
    console.log('7. 📁 Listing all user files...');
    const filesResponse = await axios.get(`${BASE_URL}/api/users/files`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ User files retrieved:');
    filesResponse.data.data.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.fileName} (${file.fileSize} bytes)`);
    });
    console.log('');

    // Step 8: Cleanup
    console.log('8. 🧹 Cleaning up test files...');
    fs.unlinkSync('test-file.txt');
    fs.unlinkSync('downloaded-test-file.txt');
    console.log('✅ Test files cleaned up\n');

    console.log('🎉 All file access tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    // Cleanup on error
    try {
      if (fs.existsSync('test-file.txt')) fs.unlinkSync('test-file.txt');
      if (fs.existsSync('downloaded-test-file.txt')) fs.unlinkSync('downloaded-test-file.txt');
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError.message);
    }
  }
}

// Run the test
if (require.main === module) {
  testFileAccess();
}

module.exports = { testFileAccess };
