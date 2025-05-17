const { exec } = require('child_process');

// File to check
const filePath = 'src/App.pure.vue';

// Run vue-tsc to check the file
exec(`npx vue-tsc --noEmit ${filePath}`, (error, stdout, stderr) => {
  if (error) {
    console.error(`vue-tsc check failed: ${error.message}`);
    if (stderr) {
      console.error(`Error output: ${stderr}`);
    }
    if (stdout) {
      console.log(`Output: ${stdout}`);
    }
    return;
  }
  
  if (stderr) {
    console.error(`Error output: ${stderr}`);
    return;
  }
  
  console.log('Vue file TypeScript check passed successfully!');
});