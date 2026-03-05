const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const unzipper = require('unzipper');
const dotenv = require('dotenv');
const readline = require('readline');

dotenv.config({ path: path.join(__dirname, '../.env') });

class DatabaseRestore {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups');
    this.restoreDir = path.join(__dirname, '../restore_temp');
    this.models = [
      'User',
      'Property',
      'Booking',
      'Inquiry',
      'Review',
      'Favorite',
      'Report',
      'Notification'
    ];
  }

  async connect() {
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kirada_guryaha');
      console.log('✅ Connected to MongoDB');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      process.exit(1);
    }
  }

  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = files
        .filter(f => f.endsWith('.zip'))
        .map(f => ({
          name: f,
          path: path.join(this.backupDir, f),
          time: f.replace('backup-', '').replace('.zip', '').replace(/-/g, ':')
        }))
        .sort((a, b) => b.time.localeCompare(a.time));
      
      return backups;
    } catch (error) {
      console.error('Error listing backups:', error);
      return [];
    }
  }

  async selectBackup() {
    const backups = await this.listBackups();
    
    if (backups.length === 0) {
      console.log('❌ No backups found');
      process.exit(1);
    }
    
    console.log('\n📋 Available backups:');
    backups.forEach((backup, index) => {
      console.log(`   ${index + 1}. ${backup.name}`);
    });
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    return new Promise((resolve) => {
      rl.question('\nSelect backup number to restore: ', (answer) => {
        rl.close();
        const index = parseInt(answer) - 1;
        if (index >= 0 && index < backups.length) {
          resolve(backups[index]);
        } else {
          console.log('❌ Invalid selection');
          process.exit(1);
        }
      });
    });
  }

  async extractBackup(backup) {
    console.log(`\n📦 Extracting backup: ${backup.name}`);
    
    try {
      await fs.mkdir(this.restoreDir, { recursive: true });
      
      await fs.createReadStream(backup.path)
        .pipe(unzipper.Extract({ path: this.restoreDir }))
        .promise();
      
      console.log('   ✅ Backup extracted');
      
      // Find the extracted directory
      const files = await fs.readdir(this.restoreDir);
      const extractedDir = files.find(f => {
        return fs.stat(path.join(this.restoreDir, f)).then(stat => stat.isDirectory()).catch(() => false);
      });
      
      return extractedDir ? path.join(this.restoreDir, extractedDir) : this.restoreDir;
    } catch (error) {
      console.error('❌ Failed to extract backup:', error);
      process.exit(1);
    }
  }

  async validateBackup(extractPath) {
    console.log('\n🔍 Validating backup...');
    
    try {
      const manifestPath = path.join(extractPath, 'manifest.json');
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
      
      console.log(`   Backup timestamp: ${manifest.timestamp}`);
      console.log(`   Total documents: ${manifest.total.documents}`);
      console.log(`   Uploads: ${manifest.total.uploads} (${manifest.total.uploadsSize})`);
      
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      return new Promise((resolve) => {
        rl.question('\nContinue with restore? (yes/no): ', (answer) => {
          rl.close();
          resolve(answer.toLowerCase() === 'yes');
        });
      });
    } catch (error) {
      console.error('❌ Invalid backup or missing manifest:', error);
      return false;
    }
  }

  async restoreCollections(extractPath) {
    console.log('\n📦 Restoring collections...');
    
    const stats = {};
    
    for (const modelName of this.models) {
      try {
        const filePath = path.join(extractPath, `${modelName}.json`);
        
        try {
          await fs.access(filePath);
        } catch {
          console.log(`   ⚠️ ${modelName}: No backup file found, skipping`);
          continue;
        }
        
        const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
        
        if (data.length === 0) {
          console.log(`   ⚠️ ${modelName}: No data to restore`);
          continue;
        }
        
        const Model = require(`../src/models/${modelName}`);
        
        // Clear existing data
        await Model.deleteMany({});
        
        // Restore data
        if (data.length > 0) {
          await Model.insertMany(data);
        }
        
        stats[modelName] = data.length;
        console.log(`   ✅ ${modelName}: ${data.length} documents restored`);
      } catch (error) {
        console.error(`   ❌ Failed to restore ${modelName}:`, error.message);
        stats[modelName] = 0;
      }
    }
    
    return stats;
  }

  async restoreUploads(extractPath) {
    console.log('\n📁 Restoring uploads...');
    
    const uploadsBackupPath = path.join(extractPath, 'uploads');
    const uploadsDir = path.join(__dirname, '../uploads');
    
    try {
      await fs.access(uploadsBackupPath);
      
      // Clear existing uploads
      try {
        await fs.rm(uploadsDir, { recursive: true, force: true });
      } catch (error) {
        // Ignore if directory doesn't exist
      }
      
      // Create uploads directory
      await fs.mkdir(uploadsDir, { recursive: true });
      
      // Copy uploads
      const { exec } = require('child_process');
      const util = require('util');
      const execPromise = util.promisify(exec);
      
      await execPromise(`cp -r ${uploadsBackupPath}/* ${uploadsDir}/`);
      
      console.log('   ✅ Uploads restored');
      
      // Get restored uploads count
      const { total } = await this.getUploadsStats(uploadsDir);
      console.log(`   📊 Total files: ${total}`);
    } catch (error) {
      console.log('   ⚠️ No uploads backup found or error restoring:', error.message);
    }
  }

  async getUploadsStats(dir) {
    let total = 0;
    
    async function walk(directory) {
      const files = await fs.readdir(directory);
      
      for (const file of files) {
        const filePath = path.join(directory, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isDirectory()) {
          await walk(filePath);
        } else {
          total++;
        }
      }
    }
    
    try {
      await walk(dir);
    } catch (error) {
      console.error('Error getting uploads stats:', error);
    }
    
    return { total };
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up temporary files...');
    
    try {
      await fs.rm(this.restoreDir, { recursive: true, force: true });
      console.log('   ✅ Temporary files removed');
    } catch (error) {
      console.error('   ❌ Failed to clean up:', error.message);
    }
  }

  async run() {
    console.log('🚀 Starting database restore...\n');
    
    const startTime = Date.now();
    
    try {
      // Select backup
      const backup = await this.selectBackup();
      console.log(`\n📋 Selected: ${backup.name}`);
      
      // Extract backup
      const extractPath = await this.extractBackup(backup);
      
      // Validate backup
      const confirmed = await this.validateBackup(extractPath);
      if (!confirmed) {
        console.log('\n❌ Restore cancelled');
        await this.cleanup();
        process.exit(0);
      }
      
      await this.connect();
      
      // Restore collections
      const collectionStats = await this.restoreCollections(extractPath);
      
      // Restore uploads
      await this.restoreUploads(extractPath);
      
      // Calculate total restored
      const totalDocs = Object.values(collectionStats).reduce((a, b) => a + b, 0);
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log('\n📊 Restore Summary:');
      console.log(`   Documents restored: ${totalDocs}`);
      console.log(`   Duration: ${duration} seconds`);
      
      console.log('\n✅ Restore completed successfully!\n');
      
      await this.cleanup();
      await mongoose.connection.close();
      process.exit(0);
    } catch (error) {
      console.error('\n❌ Restore failed:', error);
      await this.cleanup().catch(() => {});
      process.exit(1);
    }
  }
}

const restore = new DatabaseRestore();
restore.run();