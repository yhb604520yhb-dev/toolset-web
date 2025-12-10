const fs = require('fs');
const path = require('path');

const openNextDir = path.join(__dirname, '..', '.open-next');
const workerPath = path.join(openNextDir, 'worker.js');
const workerRenamedPath = path.join(openNextDir, '_worker.js');

console.log('🔍 Checking OpenNext build output...');
console.log(`   Build directory: ${openNextDir}`);

try {
  // Check if .open-next directory exists
  if (!fs.existsSync(openNextDir)) {
    console.error('❌ .open-next directory not found!');
    process.exit(1);
  }

  // List directory contents for debugging
  const dirContents = fs.readdirSync(openNextDir);
  console.log(`   Directory contents: ${dirContents.join(', ')}`);

  // Check if worker.js exists
  if (fs.existsSync(workerPath)) {
    // Check if _worker.js already exists
    if (fs.existsSync(workerRenamedPath)) {
      console.log('⚠️  _worker.js already exists, removing old file...');
      fs.unlinkSync(workerRenamedPath);
    }

    // Rename worker.js to _worker.js
    fs.renameSync(workerPath, workerRenamedPath);
    console.log('✅ Successfully renamed worker.js to _worker.js');

    // Verify the rename
    if (fs.existsSync(workerRenamedPath)) {
      const stats = fs.statSync(workerRenamedPath);
      console.log(`✅ Verified: _worker.js exists (${(stats.size / 1024).toFixed(2)} KB)`);
    } else {
      console.error('❌ _worker.js was not created after rename!');
      process.exit(1);
    }
  } else if (fs.existsSync(workerRenamedPath)) {
    console.log('✅ _worker.js already exists, no rename needed');
  } else {
    console.warn('⚠️  Neither worker.js nor _worker.js found!');
    console.warn(`   Available files: ${dirContents.join(', ')}`);
    // Don't fail - might be a different build structure
    process.exit(0);
  }
} catch (error) {
  console.error('❌ Error renaming worker.js:', error.message);
  console.error(error.stack);
  process.exit(1);
}

