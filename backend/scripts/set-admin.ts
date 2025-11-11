/**
 * Script to set a user as admin
 * Usage: npm run set-admin <email>
 * Example: npm run set-admin user@example.com
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../src/models/User';

const email = process.argv[2];

if (!email) {
  console.error('❌ Usage: npm run set-admin <email>');
  console.error('   Example: npm run set-admin user@example.com');
  process.exit(1);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/finaldoan';

async function setAdmin() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check if any admin exists
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount > 0) {
      console.warn('⚠️  Warning: Admin users already exist.');
      console.warn('   This script will still set the user as admin.\n');
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.error(`❌ User with email "${email}" not found`);
      console.error('   Please make sure the user has registered first.');
      process.exit(1);
    }

    // Check if already admin
    if (user.role === 'admin') {
      console.log(`ℹ️  User "${user.name}" (${user.email}) is already an admin`);
      process.exit(0);
    }

    // Set user as admin
    user.role = 'admin';
    await user.save();

    console.log(`✅ Success! User "${user.name}" (${user.email}) has been set as admin`);
    console.log(`   User ID: ${user._id}`);
    console.log(`   Role: ${user.role}`);
    console.log('\n📝 Next steps:');
    console.log('   1. Log out and log in again to refresh your session');
    console.log('   2. You should see the "Quản trị" (Admin) menu in the sidebar');
    console.log('   3. Access admin dashboard at /admin');
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

setAdmin();

