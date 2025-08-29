#!/usr/bin/env node

/**
 * Custom Domain Setup Script
 * Automates the process of setting up custom domain for Money Maker Platform
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class CustomDomainSetup {
  constructor() {
    this.config = {
      domain: '',
      subdomain: 'www',
      useWwwRedirect: true,
      updateCors: true,
      updateAnalytics: false
    };
  }

  async run() {
    console.log('🌐 Money Maker Platform - Custom Domain Setup');
    console.log('='.repeat(50));
    
    try {
      await this.collectDomainInfo();
      await this.validateDomain();
      await this.updateConfiguration();
      await this.updateCorsSettings();
      await this.updateEnvironmentFiles();
      await this.generateDeploymentInstructions();
      
      console.log('\n✅ Custom domain setup completed successfully!');
      console.log('📋 Next steps:');
      console.log('1. Configure DNS records at your domain registrar');
      console.log('2. Add domain in Vercel dashboard');
      console.log('3. Update Railway environment variables');
      console.log('4. Deploy changes to production');
      
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      process.exit(1);
    } finally {
      rl.close();
    }
  }

  async collectDomainInfo() {
    console.log('\n📝 Domain Configuration');
    
    this.config.domain = await this.askQuestion('Enter your domain name (e.g., moneymakerplatform.com): ');
    
    const useWww = await this.askQuestion('Redirect www to non-www? (y/n) [y]: ');
    this.config.useWwwRedirect = useWww.toLowerCase() !== 'n';
    
    const updateAnalytics = await this.askQuestion('Update Google Analytics configuration? (y/n) [n]: ');
    this.config.updateAnalytics = updateAnalytics.toLowerCase() === 'y';
    
    if (this.config.updateAnalytics) {
      this.config.gaTrackingId = await this.askQuestion('Enter Google Analytics Tracking ID (GA-XXXXXXXXX): ');
    }
  }

  async validateDomain() {
    console.log('\n🔍 Validating domain...');
    
    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(this.config.domain)) {
      throw new Error('Invalid domain format');
    }
    
    console.log('✅ Domain format is valid');
  }

  async updateConfiguration() {
    console.log('\n⚙️ Updating configuration files...');
    
    // Update vercel.json
    await this.updateVercelConfig();
    
    // Update package.json homepage
    await this.updatePackageJson();
    
    // Update public/index.html meta tags
    await this.updateIndexHtml();
    
    console.log('✅ Configuration files updated');
  }

  async updateVercelConfig() {
    const vercelConfigPath = path.join(process.cwd(), 'vercel.json');
    
    if (!fs.existsSync(vercelConfigPath)) {
      console.log('⚠️ vercel.json not found, skipping...');
      return;
    }
    
    const config = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
    
    // Add custom domain redirects
    if (this.config.useWwwRedirect) {
      config.redirects = config.redirects || [];
      config.redirects.push({
        source: `https://www.${this.config.domain}/:path*`,
        destination: `https://${this.config.domain}/:path*`,
        permanent: true
      });
    }
    
    // Update CORS headers
    const apiHeaders = config.headers?.find(h => h.source === '/api/(.*)');
    if (apiHeaders) {
      const corsHeader = apiHeaders.headers.find(h => h.key === 'Access-Control-Allow-Origin');
      if (corsHeader) {
        corsHeader.value = `https://${this.config.domain}`;
      }
    }
    
    fs.writeFileSync(vercelConfigPath, JSON.stringify(config, null, 2));
    console.log('📝 Updated vercel.json');
  }

  async updatePackageJson() {
    const packageJsonPath = path.join(process.cwd(), 'client', 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      console.log('⚠️ client/package.json not found, skipping...');
      return;
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    packageJson.homepage = `https://${this.config.domain}`;
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('📝 Updated client/package.json');
  }

  async updateIndexHtml() {
    const indexHtmlPath = path.join(process.cwd(), 'client', 'public', 'index.html');
    
    if (!fs.existsSync(indexHtmlPath)) {
      console.log('⚠️ client/public/index.html not found, skipping...');
      return;
    }
    
    let html = fs.readFileSync(indexHtmlPath, 'utf8');
    
    // Update canonical URL
    html = html.replace(
      /<link rel="canonical" href="[^"]*" ?\/?>/,
      `<link rel="canonical" href="https://${this.config.domain}" />`
    );
    
    // Update Open Graph URL
    html = html.replace(
      /<meta property="og:url" content="[^"]*" ?\/?>/,
      `<meta property="og:url" content="https://${this.config.domain}" />`
    );
    
    // Add canonical link if not exists
    if (!html.includes('rel="canonical"')) {
      html = html.replace(
        '</head>',
        `  <link rel="canonical" href="https://${this.config.domain}" />\n  </head>`
      );
    }
    
    fs.writeFileSync(indexHtmlPath, html);
    console.log('📝 Updated client/public/index.html');
  }

  async updateCorsSettings() {
    console.log('\n🔒 Updating CORS settings...');
    
    const serverFiles = [
      path.join(process.cwd(), 'server', 'index.js'),
      path.join(process.cwd(), 'server', 'server.js'),
      path.join(process.cwd(), 'index.js')
    ];
    
    for (const serverFile of serverFiles) {
      if (fs.existsSync(serverFile)) {
        await this.updateServerCors(serverFile);
        break;
      }
    }
  }

  async updateServerCors(serverFilePath) {
    let content = fs.readFileSync(serverFilePath, 'utf8');
    
    // Find and update CORS origin array
    const corsOriginRegex = /origin:\s*\[(.*?)\]/s;
    const match = content.match(corsOriginRegex);
    
    if (match) {
      const currentOrigins = match[1];
      const newDomainEntry = `    'https://${this.config.domain}',\n    'https://www.${this.config.domain}'`;
      
      if (!currentOrigins.includes(this.config.domain)) {
        const updatedOrigins = currentOrigins.trim() + ',\n' + newDomainEntry;
        content = content.replace(corsOriginRegex, `origin: [\n${updatedOrigins}\n  ]`);
        
        fs.writeFileSync(serverFilePath, content);
        console.log(`📝 Updated CORS settings in ${path.basename(serverFilePath)}`);
      }
    }
  }

  async updateEnvironmentFiles() {
    console.log('\n🔧 Creating environment configuration...');
    
    const envConfig = {
      CLIENT_URL: `https://${this.config.domain}`,
      FRONTEND_URL: `https://${this.config.domain}`,
      ALLOWED_ORIGINS: `https://${this.config.domain},https://www.${this.config.domain}`
    };
    
    // Create .env.production file
    const envContent = Object.entries(envConfig)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    fs.writeFileSync('.env.production', envContent);
    console.log('📝 Created .env.production');
  }

  async generateDeploymentInstructions() {
    console.log('\n📋 Generating deployment instructions...');
    
    const instructions = `
# Custom Domain Deployment Instructions

## 1. DNS Configuration
Add these DNS records at your domain registrar:

### A Record (Root Domain)
\`\`\`
Type: A
Name: @
Value: 76.76.19.19
TTL: 3600
\`\`\`

### CNAME Record (WWW Subdomain)
\`\`\`
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
\`\`\`

## 2. Vercel Configuration
1. Go to Vercel Dashboard
2. Select your project
3. Go to Settings > Domains
4. Add domain: ${this.config.domain}
5. Add domain: www.${this.config.domain}

## 3. Railway Environment Variables
Update these environment variables in Railway:
\`\`\`
CLIENT_URL=https://${this.config.domain}
FRONTEND_URL=https://${this.config.domain}
ALLOWED_ORIGINS=https://${this.config.domain},https://www.${this.config.domain}
\`\`\`

## 4. Deploy Changes
\`\`\`bash
git add .
git commit -m "feat: configure custom domain ${this.config.domain}"
git push origin main
\`\`\`

## 5. Verification
- Wait 24-48 hours for DNS propagation
- Check SSL certificate status in Vercel
- Test application functionality on new domain

---
Generated on: ${new Date().toISOString()}
Domain: ${this.config.domain}
`;
    
    fs.writeFileSync('DEPLOYMENT_INSTRUCTIONS.md', instructions);
    console.log('📝 Created DEPLOYMENT_INSTRUCTIONS.md');
  }

  askQuestion(question) {
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }
}

// Run the setup if called directly
if (require.main === module) {
  const setup = new CustomDomainSetup();
  setup.run().catch(console.error);
}

module.exports = CustomDomainSetup;