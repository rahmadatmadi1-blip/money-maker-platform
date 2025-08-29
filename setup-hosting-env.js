#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up Environment Variables for Hosting Platforms...');
console.log('=' .repeat(60));

// Environment variables for different platforms
const envConfigs = {
  vercel: {
    name: 'Vercel (Frontend)',
    file: 'vercel-env.txt',
    vars: {
      'REACT_APP_API_URL': 'https://money-maker-backend.onrender.com',
      'REACT_APP_CLIENT_URL': 'https://money-maker-platform.vercel.app',
      'REACT_APP_APP_NAME': 'Money Maker Platform',
      'REACT_APP_VERSION': '1.0.0',
      'REACT_APP_ENVIRONMENT': 'production'
    }
  },
  render: {
    name: 'Render (Backend)',
    file: 'render-env.txt',
    vars: {
      'MONGODB_URI': 'mongodb+srv://moneymaker-admin:MoneyMaker2024!@cluster0.mongodb.net/money-maker-db?retryWrites=true&w=majority',
      'JWT_SECRET': 'money-maker-super-secret-jwt-key-production-2024-very-long-and-secure',
      'JWT_EXPIRE': '7d',
      'PORT': '10000',
      'NODE_ENV': 'production',
      'CLIENT_URL': 'https://money-maker-platform.vercel.app',
      'CORS_ORIGIN': 'https://money-maker-platform.vercel.app',
      'RATE_LIMIT_WINDOW': '15',
      'RATE_LIMIT_MAX_REQUESTS': '100'
    }
  },
  railway: {
    name: 'Railway (Backend Alternative)',
    file: 'railway-env.txt',
    vars: {
      'MONGODB_URI': 'mongodb+srv://moneymaker-admin:MoneyMaker2024!@cluster0.mongodb.net/money-maker-db?retryWrites=true&w=majority',
      'JWT_SECRET': 'money-maker-super-secret-jwt-key-production-2024-very-long-and-secure',
      'JWT_EXPIRE': '7d',
      'PORT': '3000',
      'NODE_ENV': 'production',
      'CLIENT_URL': 'https://money-maker-platform.vercel.app'
    }
  }
};

// Create environment files for each platform
function createEnvFiles() {
  console.log('\n📝 Creating environment variable files...');
  
  Object.entries(envConfigs).forEach(([platform, config]) => {
    console.log(`\n🔧 ${config.name}:`);
    
    let content = `# Environment Variables for ${config.name}\n`;
    content += `# Copy these to your ${platform} dashboard\n\n`;
    
    Object.entries(config.vars).forEach(([key, value]) => {
      content += `${key}=${value}\n`;
      console.log(`   ✅ ${key}`);
    });
    
    fs.writeFileSync(path.join(__dirname, config.file), content);
    console.log(`   📄 Saved to: ${config.file}`);
  });
}

// Create deployment checklist
function createDeploymentChecklist() {
  const checklist = `# 🚀 Deployment Checklist - Money Maker Platform

## ✅ Pre-Deployment (Completed)
- [x] Build React application
- [x] Configure MongoDB Atlas
- [x] Setup environment variables
- [x] Test application locally
- [x] Prepare deployment files

## 🌐 Frontend Deployment (Vercel)
- [ ] Create Vercel account
- [ ] Import GitHub repository
- [ ] Configure build settings:
  - Root Directory: \`client\`
  - Build Command: \`npm run build\`
  - Output Directory: \`build\`
- [ ] Add environment variables (see vercel-env.txt)
- [ ] Deploy and test

## 🚀 Backend Deployment (Render)
- [ ] Create Render account
- [ ] Create new Web Service
- [ ] Configure service settings:
  - Name: \`money-maker-backend\`
  - Build Command: \`npm install\`
  - Start Command: \`npm start\`
- [ ] Add environment variables (see render-env.txt)
- [ ] Deploy and test

## 🔗 Post-Deployment
- [ ] Update frontend API URL with backend URL
- [ ] Test all payment methods
- [ ] Verify admin dashboard
- [ ] Check mobile responsiveness
- [ ] Test security features
- [ ] Monitor application performance

## 🧪 Testing Checklist

### Authentication
- [ ] User registration
- [ ] User login/logout
- [ ] Password validation
- [ ] JWT token handling

### Payment Methods
- [ ] Bank Transfer BRI (109901076653502)
- [ ] Bank Transfer Jago (101206706732)
- [ ] E-wallet DANA (0895326914463)
- [ ] E-wallet OVO (0895326914463)
- [ ] Credit Card General
- [ ] Credit Card Jago (4532-prefix)

### Security
- [ ] HTTPS enabled
- [ ] CORS configured
- [ ] Rate limiting active
- [ ] Input validation working
- [ ] Error handling proper

### Performance
- [ ] Page load times < 3s
- [ ] API response times < 1s
- [ ] Mobile performance good
- [ ] SEO basics implemented

## 🎯 Expected URLs
- Frontend: https://money-maker-platform.vercel.app
- Backend: https://money-maker-backend.onrender.com
- API Health: https://money-maker-backend.onrender.com/api/health

## 📞 Support Resources
- Vercel Docs: https://vercel.com/docs
- Render Docs: https://render.com/docs
- MongoDB Atlas: https://docs.atlas.mongodb.com

---
*Generated automatically for Money Maker Platform deployment*
`;
  
  fs.writeFileSync(path.join(__dirname, 'DEPLOYMENT_CHECKLIST.md'), checklist);
  console.log('\n📋 Deployment checklist created: DEPLOYMENT_CHECKLIST.md');
}

// Create quick setup commands
function createQuickSetup() {
  const quickSetup = `#!/bin/bash
# Quick Setup Commands for Money Maker Platform

# 1. Install Vercel CLI (if needed)
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy Frontend (run from client directory)
cd client
vercel --prod

# 4. For backend, use web interface:
# - Go to https://dashboard.render.com
# - Create new Web Service
# - Use environment variables from render-env.txt

echo "✅ Setup commands ready!"
echo "📖 Follow MANUAL_DEPLOYMENT_GUIDE.md for detailed steps"
`;
  
  fs.writeFileSync(path.join(__dirname, 'quick-setup.sh'), quickSetup);
  console.log('📜 Quick setup script created: quick-setup.sh');
}

// Main function
function main() {
  try {
    createEnvFiles();
    createDeploymentChecklist();
    createQuickSetup();
    
    console.log('\n🎉 Environment setup completed!');
    console.log('=' .repeat(60));
    console.log('\n📁 Files created:');
    console.log('   📄 vercel-env.txt - Frontend environment variables');
    console.log('   📄 render-env.txt - Backend environment variables');
    console.log('   📄 railway-env.txt - Alternative backend environment');
    console.log('   📋 DEPLOYMENT_CHECKLIST.md - Step-by-step checklist');
    console.log('   📜 quick-setup.sh - Quick setup commands');
    
    console.log('\n🚀 Next Steps:');
    console.log('   1. Follow MANUAL_DEPLOYMENT_GUIDE.md');
    console.log('   2. Use environment files for hosting platforms');
    console.log('   3. Complete DEPLOYMENT_CHECKLIST.md');
    console.log('   4. Test production deployment');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup
main();