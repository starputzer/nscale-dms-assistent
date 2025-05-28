// Simple script to test the admin interface
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Ensure the admin CSS file exists
const adminCssPath = path.join(__dirname, 'public/assets/styles/admin-consolidated.css');
if (!fs.existsSync(adminCssPath)) {
  console.log('Admin CSS file not found. Compiling SCSS...');
  
  try {
    const compilePath = path.join(__dirname, 'src/assets/styles/compile-admin-css.sh');
    execSync(`bash ${compilePath}`, { stdio: 'inherit' });
  } catch (error) {
    console.error('Error compiling SCSS:', error.message);
    process.exit(1);
  }
}

// Start the server to test the admin interface
console.log('Starting development server to test admin interface...');
console.log('Visit http://localhost:3003/admin in your browser after server startup');

try {
  execSync('npm run serve -- --port 3003', { stdio: 'inherit' });
} catch (error) {
  console.error('Error starting server:', error.message);
  process.exit(1);
}