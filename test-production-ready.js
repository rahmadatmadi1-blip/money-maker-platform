#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Production Readiness - Money Maker Platform');
console.log('=' .repeat(60));

// Test configurations
const tests = {
  build: {
    name: '📦 Build Files',
    checks: [
      { name: 'React build exists', path: 'client/build/index.html' },
      { name: 'Static assets exist', path: 'client/build/static' },
      { name: 'Manifest file exists', path: 'client/build/manifest.json' }
    ]
  },
  config: {
    name: '🔧 Configuration Files',
    checks: [
      { name: 'Production env file', path: '.env.production' },
      { name: 'Package.json exists', path: 'package.json' },
      { name: 'Server entry point', path: 'server.js' }
    ]
  },
  backend: {
    name: '🚀 Backend Components',
    checks: [
      { name: 'Payment routes', path: 'server/routes/payments.js' },
      { name: 'Payment validation', path: 'server/utils/paymentValidation.js' },
      { name: 'Database config', path: 'server/config/database.js' },
      { name: 'Auth middleware', path: 'server/middleware/auth.js' }
    ]
  },
  frontend: {
    name: '🌐 Frontend Components',
    checks: [
      { name: 'Payment selector', path: 'client/src/components/PaymentMethodSelector.js' },
      { name: 'Payment CSS', path: 'client/src/components/PaymentMethodSelector.css' },
      { name: 'App component', path: 'client/src/App.js' }
    ]
  },
  deployment: {
    name: '📋 Deployment Files',
    checks: [
      { name: 'Manual deployment guide', path: 'MANUAL_DEPLOYMENT_GUIDE.md' },
      { name: 'Deployment checklist', path: 'DEPLOYMENT_CHECKLIST.md' },
      { name: 'Vercel environment', path: 'vercel-env.txt' },
      { name: 'Render environment', path: 'render-env.txt' }
    ]
  }
};

// Payment methods to verify
const paymentMethods = {
  'Bank Transfer BRI': {
    account: '109901076653502',
    name: 'RAHMAD AFRIYANTO'
  },
  'Bank Transfer Jago': {
    account: '101206706732',
    name: 'RAHMAD AFRIYANTO'
  },
  'E-wallet DANA': {
    phone: '0895326914463',
    name: 'RAHMAD AFRIYANTO'
  },
  'E-wallet OVO': {
    phone: '0895326914463',
    name: 'RAHMAD AFRIYANTO'
  },
  'Credit Card General': {
    validation: 'Standard credit card validation'
  },
  'Credit Card Jago': {
    prefix: '4532',
    validation: 'Jago-specific validation'
  }
};

// Run file existence tests
function runFileTests() {
  console.log('\n🔍 Running File Existence Tests...');
  let totalTests = 0;
  let passedTests = 0;
  
  Object.entries(tests).forEach(([category, config]) => {
    console.log(`\n${config.name}:`);
    
    config.checks.forEach(check => {
      totalTests++;
      const filePath = path.join(__dirname, check.path);
      const exists = fs.existsSync(filePath);
      
      if (exists) {
        console.log(`   ✅ ${check.name}`);
        passedTests++;
      } else {
        console.log(`   ❌ ${check.name} - Missing: ${check.path}`);
      }
    });
  });
  
  return { totalTests, passedTests };
}

// Check environment variables
function checkEnvironmentVars() {
  console.log('\n🔧 Checking Environment Variables...');
  
  const envFile = path.join(__dirname, '.env.production');
  if (!fs.existsSync(envFile)) {
    console.log('   ❌ .env.production file missing');
    return false;
  }
  
  const envContent = fs.readFileSync(envFile, 'utf8');
  const requiredVars = ['MONGODB_URI', 'JWT_SECRET', 'CLIENT_URL'];
  let allPresent = true;
  
  requiredVars.forEach(varName => {
    const regex = new RegExp(`^${varName}=.+`, 'm');
    if (regex.test(envContent)) {
      console.log(`   ✅ ${varName}`);
    } else {
      console.log(`   ❌ ${varName} - Missing or empty`);
      allPresent = false;
    }
  });
  
  return allPresent;
}

// Verify payment methods configuration
function verifyPaymentMethods() {
  console.log('\n💳 Verifying Payment Methods Configuration...');
  
  try {
    const paymentValidationPath = path.join(__dirname, 'server/utils/paymentValidation.js');
    const paymentRoutesPath = path.join(__dirname, 'server/routes/payments.js');
    
    if (!fs.existsSync(paymentValidationPath) || !fs.existsSync(paymentRoutesPath)) {
      console.log('   ❌ Payment files missing');
      return false;
    }
    
    const validationContent = fs.readFileSync(paymentValidationPath, 'utf8');
    const routesContent = fs.readFileSync(paymentRoutesPath, 'utf8');
    
    // Check for payment method support
    const supportedMethods = [
      'bri_transfer',
      'jago_transfer', 
      'dana',
      'ovo',
      'credit_card',
      'jago_credit_card'
    ];
    
    let allSupported = true;
    supportedMethods.forEach(method => {
      if (validationContent.includes(method) && routesContent.includes(method)) {
        console.log(`   ✅ ${method}`);
      } else {
        console.log(`   ❌ ${method} - Not properly configured`);
        allSupported = false;
      }
    });
    
    return allSupported;
    
  } catch (error) {
    console.log(`   ❌ Error checking payment methods: ${error.message}`);
    return false;
  }
}

// Check build optimization
function checkBuildOptimization() {
  console.log('\n⚡ Checking Build Optimization...');
  
  const buildPath = path.join(__dirname, 'client/build');
  if (!fs.existsSync(buildPath)) {
    console.log('   ❌ Build directory missing');
    return false;
  }
  
  try {
    const staticPath = path.join(buildPath, 'static');
    const jsPath = path.join(staticPath, 'js');
    const cssPath = path.join(staticPath, 'css');
    
    const checks = [
      { name: 'JavaScript files minified', path: jsPath, ext: '.js' },
      { name: 'CSS files minified', path: cssPath, ext: '.css' },
      { name: 'Asset manifest exists', path: path.join(buildPath, 'asset-manifest.json') }
    ];
    
    let allOptimized = true;
    checks.forEach(check => {
      if (check.ext) {
        if (fs.existsSync(check.path)) {
          const files = fs.readdirSync(check.path);
          const hasMinified = files.some(file => file.includes('.chunk.') || file.includes('.min.'));
          if (hasMinified) {
            console.log(`   ✅ ${check.name}`);
          } else {
            console.log(`   ⚠️ ${check.name} - May not be optimized`);
          }
        } else {
          console.log(`   ❌ ${check.name} - Directory missing`);
          allOptimized = false;
        }
      } else {
        if (fs.existsSync(check.path)) {
          console.log(`   ✅ ${check.name}`);
        } else {
          console.log(`   ❌ ${check.name}`);
          allOptimized = false;
        }
      }
    });
    
    return allOptimized;
    
  } catch (error) {
    console.log(`   ❌ Error checking build optimization: ${error.message}`);
    return false;
  }
}

// Generate production test report
function generateTestReport(results) {
  const report = `# 🧪 Production Readiness Test Report

**Generated:** ${new Date().toISOString()}
**Platform:** Money Maker Platform
**Version:** 1.0.0

## 📊 Test Summary

- **File Tests:** ${results.fileTests.passedTests}/${results.fileTests.totalTests} passed
- **Environment Variables:** ${results.envVars ? '✅ Configured' : '❌ Missing'}
- **Payment Methods:** ${results.paymentMethods ? '✅ All supported' : '❌ Issues found'}
- **Build Optimization:** ${results.buildOptimization ? '✅ Optimized' : '❌ Not optimized'}

## 💳 Payment Methods Ready

${Object.entries(paymentMethods).map(([method, details]) => {
  return `### ${method}
${Object.entries(details).map(([key, value]) => `- **${key}:** ${value}`).join('\n')}`;
}).join('\n\n')}

## 🚀 Deployment Status

- [${results.fileTests.passedTests === results.fileTests.totalTests ? 'x' : ' '}] All required files present
- [${results.envVars ? 'x' : ' '}] Environment variables configured
- [${results.paymentMethods ? 'x' : ' '}] Payment methods implemented
- [${results.buildOptimization ? 'x' : ' '}] Build optimized for production

## 📋 Next Steps

${results.allPassed ? 
  '✅ **Ready for Production Deployment!**\n\n1. Follow MANUAL_DEPLOYMENT_GUIDE.md\n2. Deploy to Vercel (frontend) and Render (backend)\n3. Test all features in production\n4. Monitor application performance' :
  '⚠️ **Issues Found - Fix Before Deployment**\n\n1. Address failed tests above\n2. Re-run production readiness test\n3. Proceed with deployment only after all tests pass'
}

---
*Generated by Money Maker Platform production test suite*
`;
  
  fs.writeFileSync(path.join(__dirname, 'PRODUCTION_TEST_REPORT.md'), report);
  console.log('\n📄 Test report saved: PRODUCTION_TEST_REPORT.md');
}

// Main test function
function main() {
  try {
    const fileTestResults = runFileTests();
    const envVarsOk = checkEnvironmentVars();
    const paymentMethodsOk = verifyPaymentMethods();
    const buildOptimizationOk = checkBuildOptimization();
    
    const results = {
      fileTests: fileTestResults,
      envVars: envVarsOk,
      paymentMethods: paymentMethodsOk,
      buildOptimization: buildOptimizationOk,
      allPassed: fileTestResults.passedTests === fileTestResults.totalTests && 
                envVarsOk && paymentMethodsOk && buildOptimizationOk
    };
    
    generateTestReport(results);
    
    console.log('\n🎯 Production Readiness Summary:');
    console.log('=' .repeat(60));
    console.log(`📁 Files: ${fileTestResults.passedTests}/${fileTestResults.totalTests} ✅`);
    console.log(`🔧 Environment: ${envVarsOk ? '✅' : '❌'}`);
    console.log(`💳 Payments: ${paymentMethodsOk ? '✅' : '❌'}`);
    console.log(`⚡ Build: ${buildOptimizationOk ? '✅' : '❌'}`);
    
    if (results.allPassed) {
      console.log('\n🎉 All tests passed! Ready for production deployment!');
      console.log('📖 Follow MANUAL_DEPLOYMENT_GUIDE.md for next steps');
    } else {
      console.log('\n⚠️ Some tests failed. Please fix issues before deployment.');
      console.log('📄 Check PRODUCTION_TEST_REPORT.md for details');
    }
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run tests
main();