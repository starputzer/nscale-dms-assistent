#!/usr/bin/env node
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function analyzeBundle() {
  console.log('🔍 Analyzing bundle size...\n');
  
  // Build without TypeScript checks
  console.log('📦 Building production bundle...');
  await new Promise((resolve, reject) => {
    exec('npm run build', (error, stdout, stderr) => {
      if (error) {
        console.error('Build failed:', error);
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
  
  // Analyze dist folder
  const distPath = path.join(__dirname, '../dist');
  
  try {
    const stats = await analyzeDist(distPath);
    console.log('\n📊 Bundle Analysis:');
    console.log('==================');
    console.log(`Total Size: ${formatBytes(stats.totalSize)}`);
    console.log(`JavaScript: ${formatBytes(stats.jsSize)} (${((stats.jsSize / stats.totalSize) * 100).toFixed(1)}%)`);
    console.log(`CSS: ${formatBytes(stats.cssSize)} (${((stats.cssSize / stats.totalSize) * 100).toFixed(1)}%)`);
    console.log(`Images: ${formatBytes(stats.imageSize)} (${((stats.imageSize / stats.totalSize) * 100).toFixed(1)}%)`);
    console.log(`Other: ${formatBytes(stats.otherSize)} (${((stats.otherSize / stats.totalSize) * 100).toFixed(1)}%)`);
    
    console.log('\n📈 Largest Files:');
    stats.largestFiles.forEach((file, i) => {
      console.log(`${i + 1}. ${file.name}: ${formatBytes(file.size)}`);
    });
    
    console.log('\n🎯 Optimization Recommendations:');
    generateRecommendations(stats);
    
  } catch (error) {
    console.error('Error analyzing bundle:', error);
  }
}

async function analyzeDist(distPath) {
  const stats = {
    totalSize: 0,
    jsSize: 0,
    cssSize: 0,
    imageSize: 0,
    otherSize: 0,
    files: [],
    largestFiles: []
  };
  
  async function processDirectory(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await processDirectory(fullPath);
      } else {
        const stat = await fs.stat(fullPath);
        const ext = path.extname(entry.name);
        const fileInfo = {
          name: path.relative(distPath, fullPath),
          size: stat.size,
          ext
        };
        
        stats.files.push(fileInfo);
        stats.totalSize += stat.size;
        
        if (ext === '.js' || ext === '.mjs') {
          stats.jsSize += stat.size;
        } else if (ext === '.css') {
          stats.cssSize += stat.size;
        } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'].includes(ext)) {
          stats.imageSize += stat.size;
        } else {
          stats.otherSize += stat.size;
        }
      }
    }
  }
  
  await processDirectory(distPath);
  
  // Sort by size and get top 10
  stats.largestFiles = stats.files
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);
  
  return stats;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function generateRecommendations(stats) {
  const recommendations = [];
  
  // Check if JS is too large
  if (stats.jsSize > 1.5 * 1024 * 1024) { // 1.5MB
    recommendations.push('• JavaScript bundle is large. Consider:');
    recommendations.push('  - Code splitting for route-based chunks');
    recommendations.push('  - Lazy loading heavy components');
    recommendations.push('  - Tree shaking unused code');
    recommendations.push('  - Analyzing dependencies for duplicates');
  }
  
  // Check for large individual files
  const largeFiles = stats.largestFiles.filter(f => f.size > 200 * 1024); // 200KB
  if (largeFiles.length > 0) {
    recommendations.push('• Large individual files detected:');
    largeFiles.forEach(file => {
      if (file.name.includes('vendor')) {
        recommendations.push(`  - ${file.name}: Consider splitting vendor chunks`);
      } else {
        recommendations.push(`  - ${file.name}: Review for optimization opportunities`);
      }
    });
  }
  
  // Check CSS size
  if (stats.cssSize > 200 * 1024) { // 200KB
    recommendations.push('• CSS is large. Consider:');
    recommendations.push('  - PurgeCSS to remove unused styles');
    recommendations.push('  - CSS modules or scoped styles');
    recommendations.push('  - Critical CSS extraction');
  }
  
  // Check images
  if (stats.imageSize > 500 * 1024) { // 500KB
    recommendations.push('• Images are large. Consider:');
    recommendations.push('  - WebP format for better compression');
    recommendations.push('  - Lazy loading images');
    recommendations.push('  - Image optimization tools');
  }
  
  recommendations.forEach(rec => console.log(rec));
}

// Run the analyzer
analyzeBundle().catch(console.error);