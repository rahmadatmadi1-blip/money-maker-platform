#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 MONEY MAKER PLATFORM - AUTO DEPLOYMENT SCRIPT');
console.log('=' .repeat(60));

// Check if git is initialized
try {
    execSync('git status', { stdio: 'ignore' });
    console.log('✅ Git repository detected');
} catch (error) {
    console.log('❌ Git not initialized. Initializing...');
    execSync('git init');
    execSync('git add .');
    execSync('git commit -m "Initial commit for deployment"');
    console.log('✅ Git initialized');
}

// Check if remote origin exists
try {
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    console.log(`✅ Remote origin: ${remoteUrl}`);
} catch (error) {
    console.log('❌ No remote origin found.');
    console.log('📝 Please add your GitHub repository as origin:');
    console.log('   git remote add origin https://github.com/username/money-maker-platform.git');
    process.exit(1);
}

// Push latest changes
console.log('\n📤 Pushing latest changes to GitHub...');
try {
    execSync('git add .', { stdio: 'inherit' });
    execSync('git commit -m "Prepare for Render deployment"', { stdio: 'inherit' });
    execSync('git push origin main', { stdio: 'inherit' });
    console.log('✅ Code pushed to GitHub successfully');
} catch (error) {
    console.log('⚠️  Push failed or no changes to commit');
}

// Display deployment instructions
console.log('\n' + '=' .repeat(60));
console.log('🎯 DEPLOYMENT READY!');
console.log('=' .repeat(60));

console.log('\n📋 NEXT STEPS:');
console.log('\n1. 🗄️  Setup MongoDB Atlas:');
console.log('   → Go to: https://www.mongodb.com/cloud/atlas');
console.log('   → Create free M0 cluster');
console.log('   → Get connection string');

console.log('\n2. 🚀 Deploy to Render:');
console.log('   → Go to: https://dashboard.render.com');
console.log('   → Create New Web Service');
console.log('   → Connect your GitHub repository');
console.log('   → Use these settings:');
console.log('     • Root Directory: . (dot)');
console.log('     • Build Command: npm install');
console.log('     • Start Command: npm start');

console.log('\n3. 🔧 Environment Variables (copy from render-env-config.txt):');
if (fs.existsSync('./render-env-config.txt')) {
    const envConfig = fs.readFileSync('./render-env-config.txt', 'utf8');
    const envVars = envConfig.match(/^[A-Z_]+=.+$/gm);
    if (envVars) {
        envVars.forEach(env => {
            if (!env.startsWith('#')) {
                console.log(`     • ${env}`);
            }
        });
    }
}

console.log('\n4. 🌐 Update Frontend URL:');
console.log('   → After backend deploys, update Vercel env:');
console.log('   → REACT_APP_API_URL=https://your-backend-url.onrender.com/api');

console.log('\n📖 Detailed instructions: deployment-instructions.md');
console.log('\n🎉 Happy Deploying!');