// Simple script to test the admin sidebar
const { execSync } = require('child_process');
const path = require('path');

console.log('Starting development server to test admin sidebar improvements...');
console.log('Visit http://localhost:3005/admin in your browser after server startup');

try {
  execSync('npm run serve -- --port 3005', { stdio: 'inherit' });
} catch (error) {
  console.error('Error starting server:', error.message);
  process.exit(1);
}