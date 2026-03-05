const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const dotenv = require('dotenv');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

dotenv.config({ path: path.join(__dirname, '../.env') });

class DatabaseBackup {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups');
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.backupPath = path.join(this.backupDir, this.timestamp);
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

  async ensureBackupDir() {
    try {
      await fs.access(this.backupDir);
    } catch {
      await fs.mkdir(this.backupDir, { recursive: true });
    }
    await fs.mkdir(this.backupPath, { recursive: true });
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

  async backupCollections() {
    console.log('\n📦 Backing up collections...');
    
    const stats = {};
    
    for (const modelName of this.models) {
      try {
        const Model = require(`../src/models/${modelName}`);
        const data = await Model.find({}).lean();
        
        const filePath = path.join(this.backupPath, `${modelName}.json`);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        
        stats[modelName] = data.length;
        console.log(`   ✅ ${modelName}: ${data.length} documents`);
      } catch (error) {
        console.error(`   ❌ Failed to backup ${modelName}:`, error.message);
        stats[modelName] = 0;
      }
    }
    
    return stats;
  }

  async backupUploads() {
    console.log('\n📁 Backing up uploads...');
    
    const uploadsDir = path.join(__dirname, '../uploads');
    const uploadsBackupDir = path.join(this.backupPath, 'uploads');
    
    try {
      await fs.access(uploadsDir);
      await fs.mkdir(uploadsBackupDir, { recursive: true });
      
      // Copy uploads directory
      await execPromise(`cp -r ${uploadsDir}/* ${uploadsBackupDir}/`);
      console.log('   ✅ Uploads backed up');
      
      // Get uploads stats
      const stats = await this.getUploadsStats(uploadsDir);
      return stats;
    } catch (error) {
      console.log('   ⚠️ No uploads directory found or error copying:', error.message);
      return { total: 0, size: 0 };
    }
  }

  async getUploadsStats(dir) {
    let total = 0;
    let size = 0;
    
    async function walk(directory) {
      const files = await fs.readdir(directory);
      
      for (const file of files) {
        const filePath = path.join(directory, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isDirectory()) {
          await walk(filePath);
        } else {
          total++;
          size += stat.size;
        }
      }
    }
    
    try {
      await walk(dir);
    } catch (error) {
      console.error('Error getting uploads stats:', error);
    }
    
    return { total, size: this.formatBytes(size) };
  }

  async createArchive() {
    console.log('\n🗜️  Creating archive...');
    
    const archivePath = path.join(this.backupDir, `backup-${this.timestamp}.zip`);
    const output = fs.createWriteStream(archivePath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    archive.pipe(output);
    archive.directory(this.backupPath, false);
    
    await archive.finalize();
    
    return new Promise((resolve, reject) => {
      output.on('close', () => {
        console.log(`   ✅ Archive created: ${archivePath} (${this.formatBytes(archive.pointer())})`);
        resolve(archivePath);
      });
      
      archive.on('error', reject);
    });
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up temporary files...');
    
    try {
      await fs.rm(this.backupPath, { recursive: true, force: true });
      console.log('   ✅ Temporary files removed');
    } catch (error) {
      console.error('   ❌ Failed to clean up:', error.message);
    }
  }

  async saveManifest(stats) {
    const manifest = {
      timestamp: new Date().toISOString(),
      database: process.env.MONGODB_URI || 'mongodb://localhost:27017/kirada_guryaha',
      collections: stats.collections,
      uploads: stats.uploads,
      total: stats.total
    };
    
    const manifestPath = path.join(this.backupPath, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async cleanupOldBackups(daysToKeep = 30) {
    console.log(`\n🧹 Cleaning up backups older than ${daysToKeep} days...`);
    
    try {
      const files = await fs.readdir(this.backupDir);
      const now = Date.now();
      let deleted = 0;
      
      for (const file of files) {
        if (!file.endsWith('.zip')) continue;
        
        const filePath = path.join(this.backupDir, file);
        const stat = await fs.stat(filePath);
        const age = (now - stat.mtimeMs) / (1000 * 60 * 60 * 24);
        
        if (age > daysToKeep) {
          await fs.unlink(filePath);
          deleted++;
        }
      }
      
      console.log(`   ✅ Deleted ${deleted} old backup(s)`);
    } catch (error) {
      console.error('   ❌ Failed to clean up old backups:', error.message);
    }
  }

  async run() {
    console.log('🚀 Starting database backup...\n');
    
    const startTime = Date.now();
    
    try {
      await this.ensureBackupDir();
      await this.connect();
      
      // Backup collections
      const collectionStats = await this.backupCollections();
      
      // Backup uploads
      const uploadStats = await this.backupUploads();
      
      // Calculate total documents
      const totalDocs = Object.values(collectionStats).reduce((a, b) => a + b, 0);
      
      const stats = {
        collections: collectionStats,
        uploads: uploadStats,
        total: {
          documents: totalDocs,
          uploads: uploadStats.total,
          uploadsSize: uploadStats.size
        }
      };
      
      await this.saveManifest(stats);
      
      // Create archive
      await this.createArchive();
      
      // Cleanup
      await this.cleanup();
      await this.cleanupOldBackups();
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log('\n📊 Backup Summary:');
      console.log(`   Documents backed up: ${totalDocs}`);
      console.log(`   Uploads backed up: ${uploadStats.total} (${uploadStats.size})`);
      console.log(`   Duration: ${duration} seconds`);
      
      console.log('\n✅ Backup completed successfully!\n');
      
      await mongoose.connection.close();
      process.exit(0);
    } catch (error) {
      console.error('\n❌ Backup failed:', error);
      process.exit(1);
    }
  }
}

const backup = new DatabaseBackup();
backup.run();