const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

// Connect to database
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/moneymaker', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Database connected'))
.catch(err => console.error('❌ Database connection error:', err));

async function createAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@moneymaker.com' });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists!');
      console.log('Email:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
      return;
    }

    // Create admin user
    const adminUser = new User({
      name: 'Super Admin',
      email: 'admin@moneymaker.com',
      password: 'admin123456', // Will be hashed automatically by the model
      role: 'admin',
      isActive: true,
      isEmailVerified: true,
      isPremium: true,
      premiumExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      earnings: {
        available: 0,
        pending: 0,
        total: 0
      },
      preferences: {
        notifications: {
          email: true,
          push: true,
          marketing: true
        },
        privacy: {
          profileVisible: true,
          showEarnings: false
        }
      }
    });

    await adminUser.save();
    
    console.log('🎉 Admin user created successfully!');
    console.log('📧 Email: admin@moneymaker.com');
    console.log('🔑 Password: admin123456');
    console.log('👑 Role: admin');
    console.log('\n🚀 You can now login as admin!');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the script
createAdmin();