const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

class NotificationCleanup {
  async connect() {
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kirada_guryaha');
      console.log('✅ Connected to MongoDB');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      process.exit(1);
    }
  }

  async cleanupOldNotifications(days = 30) {
    console.log(`\n🧹 Cleaning up notifications older than ${days} days...`);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const Notification = require('../src/models/Notification');
    
    const result = await Notification.deleteMany({
      createdAt: { $lt: cutoffDate },
      isRead: true
    });

    console.log(`   ✅ Deleted ${result.deletedCount} old notifications`);
    return result.deletedCount;
  }

  async cleanupExpiredNotifications() {
    console.log('\n🧹 Cleaning up expired notifications...');
    
    const Notification = require('../src/models/Notification');
    
    const result = await Notification.deleteMany({
      expiresAt: { $lt: new Date() }
    });

    console.log(`   ✅ Deleted ${result.deletedCount} expired notifications`);
    return result.deletedCount;
  }

  async archiveOldNotifications(days = 60) {
    console.log(`\n📦 Archiving notifications older than ${days} days...`);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const Notification = require('../src/models/Notification');
    
    const result = await Notification.updateMany(
      {
        createdAt: { $lt: cutoffDate },
        isArchived: false
      },
      {
        isArchived: true,
        archivedAt: new Date()
      }
    );

    console.log(`   ✅ Archived ${result.modifiedCount} notifications`);
    return result.modifiedCount;
  }

  async markStaleAsRead(days = 7) {
    console.log(`\n📖 Marking stale unread notifications as read (older than ${days} days)...`);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const Notification = require('../src/models/Notification');
    
    const result = await Notification.updateMany(
      {
        createdAt: { $lt: cutoffDate },
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    console.log(`   ✅ Marked ${result.modifiedCount} notifications as read`);
    return result.modifiedCount;
  }

  async getStats() {
    console.log('\n📊 Notification Statistics:\n');
    
    const Notification = require('../src/models/Notification');
    
    const total = await Notification.countDocuments();
    const unread = await Notification.countDocuments({ isRead: false });
    const archived = await Notification.countDocuments({ isArchived: true });
    const expired = await Notification.countDocuments({ expiresAt: { $lt: new Date() } });
    
    // Count by type
    const byType = await Notification.aggregate([
      { $group: {
        _id: '$type',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ]);
    
    console.log(`   Total notifications: ${total}`);
    console.log(`   Unread: ${unread}`);
    console.log(`   Archived: ${archived}`);
    console.log(`   Expired: ${expired}`);
    
    console.log('\n   By type:');
    byType.slice(0, 10).forEach(item => {
      console.log(`     - ${item._id}: ${item.count}`);
    });
    
    // Oldest and newest
    const oldest = await Notification.findOne().sort({ createdAt: 1 });
    const newest = await Notification.findOne().sort({ createdAt: -1 });
    
    if (oldest) {
      console.log(`\n   Oldest notification: ${oldest.createdAt.toLocaleDateString()}`);
    }
    if (newest) {
      console.log(`   Newest notification: ${newest.createdAt.toLocaleDateString()}`);
    }
    
    return {
      total,
      unread,
      archived,
      expired,
      byType
    };
  }

  async cleanupByUser(userId) {
    console.log(`\n🧹 Cleaning up notifications for user: ${userId}`);
    
    const Notification = require('../src/models/Notification');
    
    const result = await Notification.deleteMany({ userId });
    
    console.log(`   ✅ Deleted ${result.deletedCount} notifications for user ${userId}`);
    return result.deletedCount;
  }

  async cleanupByType(type, olderThan = 30) {
    console.log(`\n🧹 Cleaning up ${type} notifications older than ${olderThan} days...`);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThan);

    const Notification = require('../src/models/Notification');
    
    const result = await Notification.deleteMany({
      type,
      createdAt: { $lt: cutoffDate }
    });

    console.log(`   ✅ Deleted ${result.deletedCount} ${type} notifications`);
    return result.deletedCount;
  }

  async run() {
    const args = process.argv.slice(2);
    const command = args[0] || 'cleanup';

    await this.connect();

    switch (command) {
      case 'cleanup':
        await this.cleanupOldNotifications(30);
        await this.cleanupExpiredNotifications();
        break;
      
      case 'archive':
        await this.archiveOldNotifications(60);
        break;
      
      case 'mark-read':
        await this.markStaleAsRead(7);
        break;
      
      case 'stats':
        await this.getStats();
        break;
      
      case 'full':
        await this.markStaleAsRead(7);
        await this.archiveOldNotifications(60);
        await this.cleanupOldNotifications(90);
        await this.cleanupExpiredNotifications();
        break;
      
      case 'user':
        if (args[1]) {
          await this.cleanupByUser(args[1]);
        } else {
          console.log('❌ Please provide user ID: node cleanupNotifications.js user <userId>');
        }
        break;
      
      case 'type':
        if (args[1] && args[2]) {
          await this.cleanupByType(args[1], parseInt(args[2]) || 30);
        } else {
          console.log('❌ Please provide type and days: node cleanupNotifications.js type <type> <days>');
        }
        break;
      
      default:
        console.log(`
Usage: node cleanupNotifications.js [command]

Commands:
  cleanup              Clean up old (30+ days) and expired notifications
  archive              Archive notifications older than 60 days
  mark-read            Mark stale unread notifications as read (7+ days)
  stats                Show notification statistics
  full                 Run full cleanup (mark-read + archive + cleanup)
  user <userId>        Clean up notifications for specific user
  type <type> <days>   Clean up notifications of specific type older than X days
        `);
        process.exit(1);
    }

    if (command !== 'stats') {
      const stats = await this.getStats();
    }

    await mongoose.connection.close();
    process.exit(0);
  }
}

const cleanup = new NotificationCleanup();
cleanup.run();