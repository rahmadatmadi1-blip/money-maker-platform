#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Deploying Money Maker Platform to Production Hosting...');
console.log('=' .repeat(60));

// Check if Vercel CLI is installed
function checkVercelCLI() {
  try {
    execSync('vercel --version', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

// Install Vercel CLI if not present
function installVercelCLI() {
  console.log('📦 Installing Vercel CLI...');
  try {
    execSync('npm install -g vercel', { stdio: 'inherit' });
    console.log('✅ Vercel CLI installed successfully!');
  } catch (error) {
    console.error('❌ Failed to install Vercel CLI:', error.message);
    process.exit(1);
  }
}

// Deploy Frontend to Vercel
function deployFrontend() {
  console.log('\n🌐 Step 1: Deploying Frontend to Vercel...');
  console.log('-'.repeat(40));
  
  try {
    // Change to client directory
    process.chdir(path.join(__dirname, 'client'));
    
    // Create vercel.json if not exists
    const vercelConfig = {
      "name": "money-maker-platform",
      "version": 2,
      "builds": [
        {
          "src": "build/**",
          "use": "@vercel/static"
        }
      ],
      "routes": [
        {
          "src": "/(.*)",
          "dest": "/build/$1"
        },
        {
          "src": "/.*",
          "dest": "/build/index.html"
        }
      ],
      "env": {
        "REACT_APP_API_URL": "https://money-maker-backend.onrender.com",
        "REACT_APP_CLIENT_URL": "https://money-maker-platform.vercel.app"
      }
    };
    
    fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2));
    console.log('✅ Vercel configuration created!');
    
    // Deploy to Vercel
    console.log('🚀 Deploying to Vercel...');
    execSync('vercel --prod --yes', { stdio: 'inherit' });
    console.log('✅ Frontend deployed to Vercel successfully!');
    
    // Go back to root directory
    process.chdir(__dirname);
    
  } catch (error) {
    console.error('❌ Frontend deployment failed:', error.message);
    process.exit(1);
  }
}

// Create deployment instructions for backend
function createBackendInstructions() {
  console.log('\n🚀 Step 2: Backend Deployment Instructions...');
  console.log('-'.repeat(40));
  
  const instructions = `
# 🚀 Backend Deployment to Render

## Quick Setup:

1. **Go to Render Dashboard:**
   👉 https://dashboard.render.com

2. **Create New Web Service:**
   - Click "New" → "Web Service"
   - Connect GitHub repository: "money-maker-platform"
   - Name: "money-maker-backend"
   - Root Directory: "."
   - Build Command: "npm install"
   - Start Command: "npm start"
   - Plan: "Free"

3. **Environment Variables:**
   Copy and paste these exactly:

   MONGODB_URI=mongodb+srv://moneymaker-admin:MoneyMaker2024!@cluster0.mongodb.net/money-maker-db?retryWrites=true&w=majority
   JWT_SECRET=money-maker-super-secret-jwt-key-production-2024-very-long-and-secure
   JWT_EXPIRE=7d
   PORT=10000
   NODE_ENV=production
   CLIENT_URL=https://money-maker-platform.vercel.app

4. **Deploy:**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Copy the service URL (e.g., https://money-maker-backend.onrender.com)

5. **Update Frontend:**
   - Update REACT_APP_API_URL in Vercel dashboard
   - Redeploy frontend if needed

## 🎯 Expected URLs:
- Frontend: https://money-maker-platform.vercel.app
- Backend: https://money-maker-backend.onrender.com

## ✅ Features Ready for Production:
- ✅ Bank Transfer (BRI, Jago)
- ✅ E-wallet (DANA, OVO) 
- ✅ Credit Card (General, Jago)
- ✅ Payment Security & Validation
- ✅ User Authentication
- ✅ Admin Dashboard
- ✅ Responsive Design
- ✅ Performance Optimized

## 🔧 Post-Deployment Testing:
1. Test user registration/login
2. Test all payment methods
3. Verify admin dashboard
4. Check mobile responsiveness
5. Test payment security features

---
*Generated automatically by Money Maker Platform deployment script*
`;
  
  fs.writeFileSync('BACKEND_DEPLOYMENT_INSTRUCTIONS.md', instructions);
  console.log('✅ Backend deployment instructions created!');
  console.log('📄 File: BACKEND_DEPLOYMENT_INSTRUCTIONS.md');
}

// Main deployment process
async function main() {
  try {
    // Check and install Vercel CLI
    if (!checkVercelCLI()) {
      installVercelCLI();
    } else {
      console.log('✅ Vercel CLI already installed!');
    }
    
    // Deploy Frontend
    deployFrontend();
    
    // Create Backend Instructions
    createBackendInstructions();
    
    console.log('\n🎉 Deployment Process Completed!');
    console.log('=' .repeat(60));
    console.log('\n📋 Next Steps:');
    console.log('1. ✅ Frontend deployed to Vercel');
    console.log('2. 📖 Follow backend instructions in BACKEND_DEPLOYMENT_INSTRUCTIONS.md');
    console.log('3. 🧪 Test the application end-to-end');
    console.log('4. 🌐 Configure custom domain (optional)');
    
    console.log('\n🔗 Quick Links:');
    console.log('- Vercel Dashboard: https://vercel.com/dashboard');
    console.log('- Render Dashboard: https://dashboard.render.com');
    console.log('- MongoDB Atlas: https://cloud.mongodb.com');
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

// Run the deployment
main();