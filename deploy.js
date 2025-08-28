#!/usr/bin/env node

/**
 * Money Maker Platform - Automated Deployment Script
 * Total Cost: $0/month
 * 
 * Usage: node deploy.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.cyan}${colors.bright}🚀 ${msg}${colors.reset}\n`)
};

function checkPrerequisites() {
  log.title('Checking Prerequisites');
  
  // Check if we're in the right directory
  if (!fs.existsSync('package.json')) {
    log.error('package.json not found. Please run this script from the project root.');
    process.exit(1);
  }
  
  // Check if client directory exists
  if (!fs.existsSync('client')) {
    log.error('Client directory not found.');
    process.exit(1);
  }
  
  // Check if required config files exist
  const requiredFiles = [
    'client/vercel.json',
    'render.yaml',
    '.env.production',
    'client/.env.production'
  ];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      log.error(`Required file missing: ${file}`);
      process.exit(1);
    }
  }
  
  log.success('All prerequisites met!');
}

function buildProject() {
  log.title('Building Project');
  
  try {
    log.info('Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
    
    log.info('Installing client dependencies...');
    execSync('cd client && npm install', { stdio: 'inherit' });
    
    log.info('Building client for production...');
    execSync('cd client && npm run build', { stdio: 'inherit' });
    
    log.success('Build completed successfully!');
  } catch (error) {
    log.error('Build failed!');
    console.error(error.message);
    process.exit(1);
  }
}

function showDeploymentInfo() {
  log.title('Deployment Information');
  
  console.log(`${colors.bright}📋 Account Credentials:${colors.reset}`);
  console.log(`   Email: rahmadatmadi1@gmail.com`);
  console.log(`   Username: rahmat atmadi`);
  console.log(`   Password: r@03071976\n`);
  
  console.log(`${colors.bright}🌐 Deployment URLs:${colors.reset}`);
  console.log(`   Vercel: https://vercel.com/signup`);
  console.log(`   Render: https://render.com/register\n`);
  
  console.log(`${colors.bright}📁 Configuration Files Ready:${colors.reset}`);
  console.log(`   ✅ client/vercel.json - Vercel configuration`);
  console.log(`   ✅ render.yaml - Render configuration`);
  console.log(`   ✅ .env.production - Backend environment`);
  console.log(`   ✅ client/.env.production - Frontend environment\n`);
  
  console.log(`${colors.bright}📚 Deployment Guides:${colors.reset}`);
  console.log(`   📖 README_DEPLOYMENT.md - Quick guide`);
  console.log(`   📖 DEPLOYMENT_GUIDE.md - Detailed guide`);
  console.log(`   📖 FINAL_DEPLOYMENT_CHECKLIST.md - Complete checklist\n`);
}

function showNextSteps() {
  log.title('Next Steps');
  
  console.log(`${colors.bright}1. Frontend Deployment (Vercel):${colors.reset}`);
  console.log(`   • Open: https://vercel.com/signup`);
  console.log(`   • Sign up with GitHub using credentials above`);
  console.log(`   • Import FB repository`);
  console.log(`   • Set root directory to 'client'`);
  console.log(`   • Add environment variable: REACT_APP_API_URL\n`);
  
  console.log(`${colors.bright}2. Backend Deployment (Render):${colors.reset}`);
  console.log(`   • Open: https://render.com/register`);
  console.log(`   • Sign up with GitHub using same credentials`);
  console.log(`   • Create PostgreSQL database first`);
  console.log(`   • Create web service from FB repository`);
  console.log(`   • Add all environment variables from .env.production\n`);
  
  console.log(`${colors.bright}3. Update Cross-References:${colors.reset}`);
  console.log(`   • Update REACT_APP_API_URL in Vercel with Render backend URL`);
  console.log(`   • Update CLIENT_URL in Render with Vercel frontend URL`);
  console.log(`   • Redeploy both services\n`);
  
  console.log(`${colors.green}${colors.bright}🎉 Total Cost: $0/month - Ready to go live!${colors.reset}`);
}

function main() {
  console.log(`${colors.cyan}${colors.bright}`);
  console.log(`╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║                    MONEY MAKER PLATFORM                     ║`);
  console.log(`║                   Deployment Assistant                      ║`);
  console.log(`║                     Cost: $0/month                          ║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝`);
  console.log(`${colors.reset}\n`);
  
  try {
    checkPrerequisites();
    buildProject();
    showDeploymentInfo();
    showNextSteps();
    
    log.success('Deployment preparation completed successfully!');
    log.info('Follow the steps above to deploy your application.');
    
  } catch (error) {
    log.error('Deployment preparation failed!');
    console.error(error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, checkPrerequisites, buildProject };