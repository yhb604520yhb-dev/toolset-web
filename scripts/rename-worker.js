const fs = require('fs');
const path = require('path');

const workerPath = path.join(__dirname, '..', '.open-next', 'worker.js');
const workerRenamedPath = path.join(__dirname, '..', '.open-next', '_worker.js');

try {
  if (fs.existsSync(workerPath)) {
    fs.renameSync(workerPath, workerRenamedPath);
    console.log('✅ Successfully renamed worker.js to _worker.js');
  } else {
    console.warn('⚠️  worker.js not found, skipping rename');
    process.exit(0);
  }
} catch (error) {
  console.error('❌ Error renaming worker.js:', error.message);
  process.exit(1);
}

