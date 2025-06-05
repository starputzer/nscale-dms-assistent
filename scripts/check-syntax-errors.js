#!/usr/bin/env node
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function checkBuildErrors() {
  console.log('🔍 Checking for syntax errors...\n');
  
  try {
    // Try to build with TypeScript checking disabled
    const { stdout, stderr } = await execAsync('npx vite build --mode development 2>&1 | grep -A5 "ERROR:"');
    
    if (stderr || stdout) {
      console.log('❌ Found syntax errors:\n');
      console.log(stdout || stderr);
      return false;
    }
  } catch (error) {
    // grep returns error code 1 if no matches found (which is good)
    if (error.code === 1) {
      console.log('✅ No syntax errors found!');
      return true;
    }
    console.log('❌ Build errors found:\n');
    console.log(error.stdout || error.stderr);
    return false;
  }
  
  console.log('✅ Build completed without syntax errors!');
  return true;
}

// Run check
checkBuildErrors().then(success => {
  process.exit(success ? 0 : 1);
});