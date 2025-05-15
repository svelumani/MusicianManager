const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Building the application for production...');

// Create a dist directory if it doesn't exist
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

try {
  // Build the frontend
  console.log('📦 Building frontend...');
  execSync('npm run build:client', { stdio: 'inherit' });
  
  // Build the backend
  console.log('📦 Building backend...');
  execSync('npm run build:server', { stdio: 'inherit' });
  
  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}