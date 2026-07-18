const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const sharp = require('sharp');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'password123';

// Test image handling functionality
async function testImageHandling() {
  try {
    console.log('🖼️ Testing Image Handling Functionality\n');

    // Step 1: Login to get authentication token
    console.log('1. 🔐 Authenticating user...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    const token = loginResponse.data.data.token;
    console.log('✅ Authentication successful\n');

    // Step 2: Create a test image
    console.log('2. 🎨 Creating test image...');
    
    // Create a test PNG image using Sharp
    const testImageBuffer = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 100, g: 150, b: 200 }
      }
    })
    .png()
    .toBuffer();
    
    fs.writeFileSync('test-image.png', testImageBuffer);
    console.log('✅ Test image created (800x600 PNG)\n');

    // Step 3: Upload test image
    console.log('3. 📤 Uploading test image...');
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream('test-image.png'));
    
    const uploadResponse = await axios.post(`${BASE_URL}/api/users/files/upload`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      }
    });

    const fileId = uploadResponse.data.fileId;
    console.log(`✅ Image uploaded successfully. File ID: ${fileId}\n`);

    // Step 4: Get image information
    console.log('4. 📋 Getting image metadata...');
    const imageInfoResponse = await axios.get(`${BASE_URL}/api/images/${fileId}/info`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const imageInfo = imageInfoResponse.data.data;
    console.log('✅ Image metadata retrieved:');
    console.log(`   - File Name: ${imageInfo.fileName}`);
    console.log(`   - File Size: ${imageInfo.fileSize} bytes`);
    console.log(`   - MIME Type: ${imageInfo.mimeType}`);
    console.log(`   - Dimensions: ${imageInfo.metadata.width}x${imageInfo.metadata.height}`);
    console.log(`   - Format: ${imageInfo.metadata.format}`);
    console.log(`   - Channels: ${imageInfo.metadata.channels}`);
    console.log(`   - Has Alpha: ${imageInfo.metadata.hasAlpha}\n`);

    // Step 5: Test image resizing
    console.log('5. 🔄 Testing image resizing...');
    
    // Test 300x200 resize
    const resizedResponse = await axios.get(`${BASE_URL}/api/images/${fileId}?w=300&h=200`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      responseType: 'stream'
    });

    const resizedFile = 'resized-image.png';
    const writer = fs.createWriteStream(resizedFile);
    resizedResponse.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Get resized image metadata
    const resizedMetadata = await sharp(resizedFile).metadata();
    console.log(`✅ Image resized to: ${resizedMetadata.width}x${resizedMetadata.height}\n`);

    // Step 6: Test thumbnail generation
    console.log('6. 🖼️ Testing thumbnail generation...');
    
    const thumbnailResponse = await axios.get(`${BASE_URL}/api/images/${fileId}/thumbnail?size=150`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      responseType: 'stream'
    });

    const thumbnailFile = 'thumbnail-image.jpg';
    const thumbnailWriter = fs.createWriteStream(thumbnailFile);
    thumbnailResponse.data.pipe(thumbnailWriter);

    await new Promise((resolve, reject) => {
      thumbnailWriter.on('finish', resolve);
      thumbnailWriter.on('error', reject);
    });

    // Get thumbnail metadata
    const thumbnailMetadata = await sharp(thumbnailFile).metadata();
    console.log(`✅ Thumbnail generated: ${thumbnailMetadata.width}x${thumbnailMetadata.height}\n`);

    // Step 7: Test format conversion
    console.log('7. 🔄 Testing format conversion...');
    
    // Convert to WebP
    const webpResponse = await axios.get(`${BASE_URL}/api/images/${fileId}?format=webp&q=80`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      responseType: 'stream'
    });

    const webpFile = 'converted-image.webp';
    const webpWriter = fs.createWriteStream(webpFile);
    webpResponse.data.pipe(webpWriter);

    await new Promise((resolve, reject) => {
      webpWriter.on('finish', resolve);
      webpWriter.on('error', reject);
    });

    const webpMetadata = await sharp(webpFile).metadata();
    console.log(`✅ Converted to WebP: ${webpMetadata.width}x${webpMetadata.height} (${webpMetadata.format})\n`);

    // Step 8: Test quality adjustment
    console.log('8. ⚙️ Testing quality adjustment...');
    
    // High quality JPEG
    const highQualityResponse = await axios.get(`${BASE_URL}/api/images/${fileId}?format=jpeg&q=95`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      responseType: 'stream'
    });

    const highQualityFile = 'high-quality.jpg';
    const hqWriter = fs.createWriteStream(highQualityFile);
    highQualityResponse.data.pipe(hqWriter);

    await new Promise((resolve, reject) => {
      hqWriter.on('finish', resolve);
      hqWriter.on('error', reject);
    });

    const hqMetadata = await sharp(highQualityFile).metadata();
    console.log(`✅ High quality JPEG created: ${hqMetadata.width}x${hqMetadata.height}\n`);

    // Step 9: File size comparison
    console.log('9. 📊 File size comparison:');
    const originalSize = fs.statSync('test-image.png').size;
    const resizedSize = fs.statSync(resizedFile).size;
    const thumbnailSize = fs.statSync(thumbnailFile).size;
    const webpSize = fs.statSync(webpFile).size;
    const hqSize = fs.statSync(highQualityFile).size;

    console.log(`   - Original PNG: ${(originalSize / 1024).toFixed(2)} KB`);
    console.log(`   - Resized PNG: ${(resizedSize / 1024).toFixed(2)} KB`);
    console.log(`   - Thumbnail JPG: ${(thumbnailSize / 1024).toFixed(2)} KB`);
    console.log(`   - WebP: ${(webpSize / 1024).toFixed(2)} KB`);
    console.log(`   - High Quality JPG: ${(hqSize / 1024).toFixed(2)} KB\n`);

    // Step 10: Cleanup
    console.log('10. 🧹 Cleaning up test files...');
    const filesToClean = [
      'test-image.png',
      'resized-image.png',
      'thumbnail-image.jpg',
      'converted-image.webp',
      'high-quality.jpg'
    ];

    filesToClean.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });

    console.log('✅ Test files cleaned up\n');

    console.log('🎉 All image handling tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Image upload working');
    console.log('   ✅ Metadata extraction working');
    console.log('   ✅ Image resizing working');
    console.log('   ✅ Thumbnail generation working');
    console.log('   ✅ Format conversion working');
    console.log('   ✅ Quality adjustment working');
    console.log('   ✅ Authentication working');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    // Cleanup on error
    const filesToClean = [
      'test-image.png',
      'resized-image.png',
      'thumbnail-image.jpg',
      'converted-image.webp',
      'high-quality.jpg'
    ];

    filesToClean.forEach(file => {
      try {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError.message);
      }
    });
  }
}

// Run the test
if (require.main === module) {
  testImageHandling();
}

module.exports = { testImageHandling };
