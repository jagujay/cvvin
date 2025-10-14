// Test script to verify port configuration
const { SERVER_CONFIG } = require('./src/config/server.config');

console.log('Port Configuration Test:');
console.log('Environment PORT:', process.env.PORT);
console.log('SERVER_CONFIG.PORT:', SERVER_CONFIG.PORT);
console.log('Final port:', process.env.PORT || SERVER_CONFIG.PORT);

// Test if we can start a simple server on port 3000
const express = require('express');
const app = express();

app.get('/test', (req, res) => {
    res.json({ message: 'Port test successful', port: SERVER_CONFIG.PORT });
});

const PORT = process.env.PORT || SERVER_CONFIG.PORT;
app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
    console.log(`Test URL: http://localhost:${PORT}/test`);
});
