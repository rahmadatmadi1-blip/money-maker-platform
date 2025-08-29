const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { AffiliateProgram } = require('../models/Affiliate');
const { NotificationTemplate } = require('../routes/notifications');

class DatabaseSeeder {
  constructor() {
    this.isSeeded = false;
  }

  /**
   * Check if database needs seeding
   */
  async needsSeeding() {
    try {
      const userCount = await User.countDocuments();
      const programCount = await AffiliateProgram.countDocuments();
      
      // If no users or programs exist, we need seeding
      return userCount === 0 || programCount === 0;
    } catch (error) {
      console.error('Error checking seed status:', error);
      return false;
    }
  }

  /**
   * Seed admin user
   */
  async seedAdminUser() {
    try {
      const adminExists = await User.findOne({ role: 'admin' });
      
      if (!adminExists) {
        const hashedPassword = await bcrypt.hash('admin123!@#', 12);
        
        const adminUser = new User({
          name: 'System Administrator',
          email: 'admin@facebook-clone.com',
          password: hashedPassword,
          role: 'admin',
          isEmailVerified: true,
          isPremium: true,
          affiliateId: 'ADMIN001',
          referralCode: 'ADMIN_REF',
          totalEarnings: 0,
          availableBalance: 0,
          pendingBalance: 0,
          preferences: {
            notifications: {
              email: true,
              push: true,
              sms: false
            },
            privacy: {
              profileVisibility: 'public',
              showEarnings: false,
              allowMessages: true
            },
            marketing: {
              newsletter: true,
              promotions: true,
              analytics: true
            }
          }
        });
        
        await adminUser.save();
        console.log('✅ Admin user created successfully');
        return adminUser;
      }
      
      return adminExists;
    } catch (error) {
      console.error('❌ Error creating admin user:', error);
      throw error;
    }
  }

  /**
   * Seed demo users
   */
  async seedDemoUsers() {
    try {
      const demoUsers = [
        {
          name: 'John Doe',
          email: 'john@demo.com',
          role: 'user',
          isPremium: true,
          affiliateId: 'DEMO001'
        },
        {
          name: 'Jane Smith',
          email: 'jane@demo.com',
          role: 'seller',
          isPremium: false,
          affiliateId: 'DEMO002'
        },
        {
          name: 'Mike Johnson',
          email: 'mike@demo.com',
          role: 'creator',
          isPremium: true,
          affiliateId: 'DEMO003'
        }
      ];

      const hashedPassword = await bcrypt.hash('demo123', 10);
      
      for (const userData of demoUsers) {
        const existingUser = await User.findOne({ email: userData.email });
        
        if (!existingUser) {
          const user = new User({
            ...userData,
            password: hashedPassword,
            isEmailVerified: true,
            referralCode: `REF_${userData.affiliateId}`,
            totalEarnings: Math.floor(Math.random() * 1000),
            availableBalance: Math.floor(Math.random() * 500),
            pendingBalance: Math.floor(Math.random() * 200),
            preferences: {
              notifications: {
                email: true,
                push: true,
                sms: false
              },
              privacy: {
                profileVisibility: 'public',
                showEarnings: false,
                allowMessages: true
              },
              marketing: {
                newsletter: true,
                promotions: false,
                analytics: true
              }
            }
          });
          
          await user.save();
          console.log(`✅ Demo user ${userData.name} created`);
        }
      }
    } catch (error) {
      console.error('❌ Error creating demo users:', error);
      throw error;
    }
  }

  /**
   * Seed affiliate programs
   */
  async seedAffiliatePrograms() {
    try {
      const adminUser = await User.findOne({ role: 'admin' });
      
      if (!adminUser) {
        throw new Error('Admin user not found. Please seed admin user first.');
      }

      const programs = [
        {
          name: 'Tech Products Affiliate',
          description: 'Promote the latest technology products and earn competitive commissions',
          merchantId: adminUser._id,
          commission: {
            type: 'percentage',
            rate: 15
          },
          category: 'technology',
          tags: ['electronics', 'gadgets', 'software'],
          requirements: {
            minFollowers: 1000,
            minTraffic: 5000,
            websiteRequired: true
          },
          cookieDuration: 30,
          paymentTerms: 'net30',
          minimumPayout: 50,
          status: 'active',
          contactEmail: 'tech@facebook-clone.com'
        },
        {
          name: 'Education & Courses',
          description: 'Share knowledge and earn from educational content sales',
          merchantId: adminUser._id,
          commission: {
            type: 'tiered',
            rate: 20,
            tiers: [
              { minSales: 0, rate: 20 },
              { minSales: 10, rate: 25 },
              { minSales: 50, rate: 30 }
            ]
          },
          category: 'education',
          tags: ['courses', 'learning', 'skills'],
          requirements: {
            minFollowers: 500,
            minTraffic: 2000,
            websiteRequired: false
          },
          cookieDuration: 60,
          paymentTerms: 'net15',
          minimumPayout: 25,
          status: 'active',
          contactEmail: 'education@facebook-clone.com'
        },
        {
          name: 'Health & Wellness',
          description: 'Promote health and wellness products with attractive commissions',
          merchantId: adminUser._id,
          commission: {
            type: 'percentage',
            rate: 12
          },
          category: 'health',
          tags: ['wellness', 'fitness', 'nutrition'],
          requirements: {
            minFollowers: 2000,
            minTraffic: 10000,
            websiteRequired: true
          },
          cookieDuration: 45,
          paymentTerms: 'net30',
          minimumPayout: 100,
          status: 'active',
          contactEmail: 'health@facebook-clone.com'
        }
      ];

      for (const programData of programs) {
        const existingProgram = await AffiliateProgram.findOne({ 
          name: programData.name,
          merchantId: programData.merchantId 
        });
        
        if (!existingProgram) {
          const program = new AffiliateProgram(programData);
          await program.save();
          console.log(`✅ Affiliate program '${programData.name}' created`);
        }
      }
    } catch (error) {
      console.error('❌ Error creating affiliate programs:', error);
      throw error;
    }
  }

  /**
   * Seed notification templates
   */
  async seedNotificationTemplates() {
    try {
      const templates = [
        {
          name: 'welcome_email',
          type: 'email',
          subject: 'Welcome to Facebook Clone!',
          content: `
            <h1>Welcome {{userName}}!</h1>
            <p>Thank you for joining our platform. We're excited to have you on board!</p>
            <p>Here's what you can do next:</p>
            <ul>
              <li>Complete your profile</li>
              <li>Explore our affiliate programs</li>
              <li>Start earning commissions</li>
            </ul>
            <p>If you have any questions, feel free to contact our support team.</p>
            <p>Best regards,<br>The Facebook Clone Team</p>
          `,
          variables: ['userName'],
          isActive: true
        },
        {
          name: 'commission_earned',
          type: 'email',
          subject: 'New Commission Earned - ${{amount}}',
          content: `
            <h1>Congratulations {{userName}}!</h1>
            <p>You've earned a new commission of <strong>${{amount}} {{currency}}</strong></p>
            <p><strong>Program:</strong> {{programName}}</p>
            <p><strong>Order:</strong> {{orderNumber}}</p>
            <p><strong>Commission Rate:</strong> {{commissionRate}}%</p>
            <p>Keep up the great work!</p>
            <p>Best regards,<br>The Facebook Clone Team</p>
          `,
          variables: ['userName', 'amount', 'currency', 'programName', 'orderNumber', 'commissionRate'],
          isActive: true
        },
        {
          name: 'payment_processed',
          type: 'email',
          subject: 'Payment Processed - ${{amount}}',
          content: `
            <h1>Payment Processed</h1>
            <p>Hi {{userName}},</p>
            <p>Your payment of <strong>${{amount}} {{currency}}</strong> has been processed successfully.</p>
            <p><strong>Payment Method:</strong> {{paymentMethod}}</p>
            <p><strong>Transaction ID:</strong> {{transactionId}}</p>
            <p>The funds should appear in your account within 1-3 business days.</p>
            <p>Best regards,<br>The Facebook Clone Team</p>
          `,
          variables: ['userName', 'amount', 'currency', 'paymentMethod', 'transactionId'],
          isActive: true
        },
        {
          name: 'order_confirmation',
          type: 'email',
          subject: 'Order Confirmation - {{orderNumber}}',
          content: `
            <h1>Order Confirmation</h1>
            <p>Hi {{userName}},</p>
            <p>Thank you for your order! Here are the details:</p>
            <p><strong>Order Number:</strong> {{orderNumber}}</p>
            <p><strong>Total Amount:</strong> ${{totalAmount}}</p>
            <p><strong>Items:</strong> {{itemCount}} item(s)</p>
            <p>We'll send you another email when your order ships.</p>
            <p>Best regards,<br>The Facebook Clone Team</p>
          `,
          variables: ['userName', 'orderNumber', 'totalAmount', 'itemCount'],
          isActive: true
        }
      ];

      for (const templateData of templates) {
        const existingTemplate = await NotificationTemplate.findOne({ 
          name: templateData.name 
        });
        
        if (!existingTemplate) {
          const template = new NotificationTemplate(templateData);
          await template.save();
          console.log(`✅ Notification template '${templateData.name}' created`);
        }
      }
    } catch (error) {
      console.error('❌ Error creating notification templates:', error);
      throw error;
    }
  }

  /**
   * Run all seeders
   */
  async seedDatabase() {
    try {
      console.log('🌱 Starting database seeding...');
      
      const needsSeeding = await this.needsSeeding();
      
      if (!needsSeeding) {
        console.log('✅ Database already seeded, skipping...');
        return;
      }

      // Seed in order
      await this.seedAdminUser();
      await this.seedDemoUsers();
      await this.seedAffiliatePrograms();
      await this.seedNotificationTemplates();
      
      this.isSeeded = true;
      console.log('🌱 Database seeding completed successfully!');
      
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      throw error;
    }
  }

  /**
   * Clear all seeded data (for testing)
   */
  async clearSeedData() {
    try {
      console.log('🧹 Clearing seed data...');
      
      await User.deleteMany({ 
        email: { 
          $in: ['admin@facebook-clone.com', 'john@demo.com', 'jane@demo.com', 'mike@demo.com'] 
        } 
      });
      
      await AffiliateProgram.deleteMany({ 
        name: { 
          $in: ['Tech Products Affiliate', 'Education & Courses', 'Health & Wellness'] 
        } 
      });
      
      await NotificationTemplate.deleteMany({ 
        name: { 
          $in: ['welcome_email', 'commission_earned', 'payment_processed', 'order_confirmation'] 
        } 
      });
      
      console.log('✅ Seed data cleared successfully');
      
    } catch (error) {
      console.error('❌ Error clearing seed data:', error);
      throw error;
    }
  }
}

module.exports = DatabaseSeeder;