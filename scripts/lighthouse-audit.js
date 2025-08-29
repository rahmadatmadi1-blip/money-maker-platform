#!/usr/bin/env node

/**
 * Lighthouse Performance Audit Script
 * 
 * Script ini melakukan:
 * 1. Lighthouse audit untuk Core Web Vitals
 * 2. Performance, Accessibility, Best Practices, SEO audit
 * 3. Progressive Web App (PWA) audit
 * 4. Mobile dan Desktop testing
 * 5. Automated performance regression testing
 */

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  url: process.env.LIGHTHOUSE_URL || 'http://localhost:3000',
  reportDir: path.join(__dirname, '..', 'lighthouse-reports'),
  thresholds: {
    performance: 90,
    accessibility: 95,
    bestPractices: 90,
    seo: 95,
    pwa: 80,
    // Core Web Vitals thresholds
    lcp: 2500,      // Largest Contentful Paint (ms)
    fid: 100,       // First Input Delay (ms)
    cls: 0.1,       // Cumulative Layout Shift
    fcp: 1800,      // First Contentful Paint (ms)
    si: 3400,       // Speed Index (ms)
    tti: 3800       // Time to Interactive (ms)
  },
  pages: [
    { name: 'Home', path: '/' },
    { name: 'Products', path: '/products' },
    { name: 'Login', path: '/login' },
    { name: 'Register', path: '/register' },
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Profile', path: '/profile' }
  ],
  devices: [
    {
      name: 'mobile',
      config: {
        extends: 'lighthouse:default',
        settings: {
          formFactor: 'mobile',
          throttling: {
            rttMs: 150,
            throughputKbps: 1638.4,
            cpuSlowdownMultiplier: 4
          },
          screenEmulation: {
            mobile: true,
            width: 375,
            height: 667,
            deviceScaleFactor: 2
          }
        }
      }
    },
    {
      name: 'desktop',
      config: {
        extends: 'lighthouse:default',
        settings: {
          formFactor: 'desktop',
          throttling: {
            rttMs: 40,
            throughputKbps: 10240,
            cpuSlowdownMultiplier: 1
          },
          screenEmulation: {
            mobile: false,
            width: 1350,
            height: 940,
            deviceScaleFactor: 1
          }
        }
      }
    }
  ]
};

class LighthouseAuditor {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      summary: {},
      pages: {},
      devices: {},
      coreWebVitals: {},
      recommendations: [],
      passed: false
    };
    this.chrome = null;
  }

  async initialize() {
    console.log('🚀 Initializing Lighthouse Audit...');
    
    // Create report directory
    try {
      await fs.mkdir(CONFIG.reportDir, { recursive: true });
    } catch (error) {
      console.warn('Warning: Could not create report directory:', error.message);
    }

    // Launch Chrome
    this.chrome = await chromeLauncher.launch({
      chromeFlags: [
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-extensions'
      ]
    });

    console.log(`✅ Chrome launched on port ${this.chrome.port}`);
    console.log(`🌐 Target URL: ${CONFIG.url}`);
    console.log(`📱 Testing ${CONFIG.devices.length} device types`);
    console.log(`📄 Testing ${CONFIG.pages.length} pages`);
  }

  async runAudit() {
    console.log('\n🔍 Starting Lighthouse Audit...');
    
    for (const device of CONFIG.devices) {
      console.log(`\n📱 Testing ${device.name.toUpperCase()} device...`);
      this.results.devices[device.name] = {};
      
      for (const page of CONFIG.pages) {
        console.log(`   📄 Auditing ${page.name}...`);
        
        const url = `${CONFIG.url}${page.path}`;
        const options = {
          port: this.chrome.port,
          ...device.config
        };
        
        try {
          const runnerResult = await lighthouse(url, options);
          const result = this.processLighthouseResult(runnerResult, page, device);
          
          if (!this.results.pages[page.name]) {
            this.results.pages[page.name] = {};
          }
          
          this.results.pages[page.name][device.name] = result;
          this.results.devices[device.name][page.name] = result;
          
          // Save individual report
          await this.saveIndividualReport(runnerResult, page, device);
          
        } catch (error) {
          console.error(`   ❌ Failed to audit ${page.name} on ${device.name}:`, error.message);
          
          this.results.pages[page.name] = this.results.pages[page.name] || {};
          this.results.pages[page.name][device.name] = {
            error: error.message,
            scores: { performance: 0, accessibility: 0, bestPractices: 0, seo: 0, pwa: 0 },
            metrics: {},
            passed: false
          };
        }
      }
    }
  }

  processLighthouseResult(runnerResult, page, device) {
    const lhr = runnerResult.lhr;
    
    // Extract scores
    const scores = {
      performance: Math.round((lhr.categories.performance?.score || 0) * 100),
      accessibility: Math.round((lhr.categories.accessibility?.score || 0) * 100),
      bestPractices: Math.round((lhr.categories['best-practices']?.score || 0) * 100),
      seo: Math.round((lhr.categories.seo?.score || 0) * 100),
      pwa: Math.round((lhr.categories.pwa?.score || 0) * 100)
    };

    // Extract Core Web Vitals and other metrics
    const metrics = {
      // Core Web Vitals
      lcp: lhr.audits['largest-contentful-paint']?.numericValue || 0,
      fid: lhr.audits['max-potential-fid']?.numericValue || 0,
      cls: lhr.audits['cumulative-layout-shift']?.numericValue || 0,
      
      // Other important metrics
      fcp: lhr.audits['first-contentful-paint']?.numericValue || 0,
      si: lhr.audits['speed-index']?.numericValue || 0,
      tti: lhr.audits['interactive']?.numericValue || 0,
      tbt: lhr.audits['total-blocking-time']?.numericValue || 0,
      
      // Resource metrics
      totalByteWeight: lhr.audits['total-byte-weight']?.numericValue || 0,
      unusedCssRules: lhr.audits['unused-css-rules']?.details?.overallSavingsBytes || 0,
      unusedJavaScript: lhr.audits['unused-javascript']?.details?.overallSavingsBytes || 0,
      
      // Image optimization
      unoptimizedImages: lhr.audits['uses-optimized-images']?.details?.overallSavingsBytes || 0,
      modernImageFormats: lhr.audits['uses-webp-images']?.details?.overallSavingsBytes || 0,
      
      // Caching
      staticAssetsCaching: lhr.audits['uses-long-cache-ttl']?.score || 0
    };

    // Extract opportunities and diagnostics
    const opportunities = [];
    const diagnostics = [];
    
    Object.values(lhr.audits).forEach(audit => {
      if (audit.details && audit.details.type === 'opportunity' && audit.numericValue > 0) {
        opportunities.push({
          id: audit.id,
          title: audit.title,
          description: audit.description,
          savings: audit.numericValue,
          savingsBytes: audit.details.overallSavingsBytes || 0
        });
      }
      
      if (audit.score !== null && audit.score < 1 && audit.scoreDisplayMode !== 'notApplicable') {
        diagnostics.push({
          id: audit.id,
          title: audit.title,
          description: audit.description,
          score: audit.score
        });
      }
    });

    // Check if page passes thresholds
    const passed = this.checkThresholds(scores, metrics);

    return {
      page: page.name,
      device: device.name,
      url: lhr.finalUrl,
      scores,
      metrics,
      opportunities: opportunities.sort((a, b) => b.savings - a.savings).slice(0, 10),
      diagnostics: diagnostics.sort((a, b) => a.score - b.score).slice(0, 10),
      passed,
      timestamp: new Date().toISOString()
    };
  }

  checkThresholds(scores, metrics) {
    const checks = {
      performance: scores.performance >= CONFIG.thresholds.performance,
      accessibility: scores.accessibility >= CONFIG.thresholds.accessibility,
      bestPractices: scores.bestPractices >= CONFIG.thresholds.bestPractices,
      seo: scores.seo >= CONFIG.thresholds.seo,
      pwa: scores.pwa >= CONFIG.thresholds.pwa,
      lcp: metrics.lcp <= CONFIG.thresholds.lcp,
      fid: metrics.fid <= CONFIG.thresholds.fid,
      cls: metrics.cls <= CONFIG.thresholds.cls,
      fcp: metrics.fcp <= CONFIG.thresholds.fcp,
      si: metrics.si <= CONFIG.thresholds.si,
      tti: metrics.tti <= CONFIG.thresholds.tti
    };

    return {
      passed: Object.values(checks).every(check => check),
      checks
    };
  }

  async saveIndividualReport(runnerResult, page, device) {
    const reportHtml = runnerResult.report;
    const filename = `lighthouse-${page.name.toLowerCase()}-${device.name}-${Date.now()}.html`;
    const filepath = path.join(CONFIG.reportDir, filename);
    
    try {
      await fs.writeFile(filepath, reportHtml);
      console.log(`     💾 Report saved: ${filename}`);
    } catch (error) {
      console.warn(`     ⚠️  Could not save report: ${error.message}`);
    }
  }

  calculateSummary() {
    console.log('\n📊 Calculating Summary...');
    
    const allResults = [];
    Object.values(this.results.pages).forEach(pageResults => {
      Object.values(pageResults).forEach(result => {
        if (!result.error) {
          allResults.push(result);
        }
      });
    });

    if (allResults.length === 0) {
      console.warn('⚠️  No successful audits to summarize');
      return;
    }

    // Calculate average scores
    const avgScores = {
      performance: Math.round(allResults.reduce((sum, r) => sum + r.scores.performance, 0) / allResults.length),
      accessibility: Math.round(allResults.reduce((sum, r) => sum + r.scores.accessibility, 0) / allResults.length),
      bestPractices: Math.round(allResults.reduce((sum, r) => sum + r.scores.bestPractices, 0) / allResults.length),
      seo: Math.round(allResults.reduce((sum, r) => sum + r.scores.seo, 0) / allResults.length),
      pwa: Math.round(allResults.reduce((sum, r) => sum + r.scores.pwa, 0) / allResults.length)
    };

    // Calculate average Core Web Vitals
    const avgMetrics = {
      lcp: Math.round(allResults.reduce((sum, r) => sum + r.metrics.lcp, 0) / allResults.length),
      fid: Math.round(allResults.reduce((sum, r) => sum + r.metrics.fid, 0) / allResults.length),
      cls: (allResults.reduce((sum, r) => sum + r.metrics.cls, 0) / allResults.length).toFixed(3),
      fcp: Math.round(allResults.reduce((sum, r) => sum + r.metrics.fcp, 0) / allResults.length),
      si: Math.round(allResults.reduce((sum, r) => sum + r.metrics.si, 0) / allResults.length),
      tti: Math.round(allResults.reduce((sum, r) => sum + r.metrics.tti, 0) / allResults.length)
    };

    // Collect all opportunities
    const allOpportunities = {};
    allResults.forEach(result => {
      result.opportunities.forEach(opp => {
        if (!allOpportunities[opp.id]) {
          allOpportunities[opp.id] = {
            ...opp,
            count: 0,
            totalSavings: 0
          };
        }
        allOpportunities[opp.id].count++;
        allOpportunities[opp.id].totalSavings += opp.savings;
      });
    });

    const topOpportunities = Object.values(allOpportunities)
      .sort((a, b) => b.totalSavings - a.totalSavings)
      .slice(0, 10);

    // Check overall pass/fail
    const passedCount = allResults.filter(r => r.passed.passed).length;
    const overallPassed = passedCount === allResults.length;

    this.results.summary = {
      totalAudits: allResults.length,
      passedAudits: passedCount,
      failedAudits: allResults.length - passedCount,
      overallPassed,
      avgScores,
      avgMetrics,
      topOpportunities
    };

    this.results.passed = overallPassed;
  }

  async generateReport() {
    console.log('\n📋 Generating Lighthouse Report...');
    
    // Save JSON report
    const jsonPath = path.join(CONFIG.reportDir, `lighthouse-summary-${Date.now()}.json`);
    try {
      await fs.writeFile(jsonPath, JSON.stringify(this.results, null, 2));
      console.log(`📄 JSON report saved: ${jsonPath}`);
    } catch (error) {
      console.warn('Warning: Could not save JSON report:', error.message);
    }

    // Generate HTML summary report
    await this.generateHtmlSummary();
    
    return this.results;
  }

  async generateHtmlSummary() {
    const { summary, pages } = this.results;
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lighthouse Audit Summary - Money Maker Platform</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .score-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .score-card { background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; }
        .score-value { font-size: 36px; font-weight: bold; margin: 10px 0; }
        .score-label { color: #666; font-size: 14px; }
        .score-good { color: #0cce6b; }
        .score-average { color: #ffa400; }
        .score-poor { color: #ff4e42; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin: 20px 0; }
        .metric-card { background: #f8f9fa; padding: 15px; border-radius: 6px; }
        .metric-value { font-size: 24px; font-weight: bold; }
        .metric-label { color: #666; font-size: 14px; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .table th { background: #f8f9fa; font-weight: bold; }
        .status-pass { color: #0cce6b; }
        .status-fail { color: #ff4e42; }
        .opportunities { background: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Lighthouse Audit Summary</h1>
            <p>Money Maker Platform - ${this.results.timestamp}</p>
            <p><strong>Overall Status:</strong> 
                <span class="status-${summary.overallPassed ? 'pass' : 'fail'}">
                    ${summary.overallPassed ? '✅ PASSED' : '❌ FAILED'}
                </span>
            </p>
        </div>
        
        <h2>📊 Average Scores</h2>
        <div class="score-grid">
            <div class="score-card">
                <div class="score-value score-${this.getScoreClass(summary.avgScores.performance)}">${summary.avgScores.performance}</div>
                <div class="score-label">Performance</div>
            </div>
            <div class="score-card">
                <div class="score-value score-${this.getScoreClass(summary.avgScores.accessibility)}">${summary.avgScores.accessibility}</div>
                <div class="score-label">Accessibility</div>
            </div>
            <div class="score-card">
                <div class="score-value score-${this.getScoreClass(summary.avgScores.bestPractices)}">${summary.avgScores.bestPractices}</div>
                <div class="score-label">Best Practices</div>
            </div>
            <div class="score-card">
                <div class="score-value score-${this.getScoreClass(summary.avgScores.seo)}">${summary.avgScores.seo}</div>
                <div class="score-label">SEO</div>
            </div>
            <div class="score-card">
                <div class="score-value score-${this.getScoreClass(summary.avgScores.pwa)}">${summary.avgScores.pwa}</div>
                <div class="score-label">PWA</div>
            </div>
        </div>
        
        <h2>⚡ Core Web Vitals</h2>
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value score-${summary.avgMetrics.lcp <= CONFIG.thresholds.lcp ? 'good' : 'poor'}">${summary.avgMetrics.lcp}ms</div>
                <div class="metric-label">Largest Contentful Paint (LCP)</div>
            </div>
            <div class="metric-card">
                <div class="metric-value score-${summary.avgMetrics.fid <= CONFIG.thresholds.fid ? 'good' : 'poor'}">${summary.avgMetrics.fid}ms</div>
                <div class="metric-label">First Input Delay (FID)</div>
            </div>
            <div class="metric-card">
                <div class="metric-value score-${summary.avgMetrics.cls <= CONFIG.thresholds.cls ? 'good' : 'poor'}">${summary.avgMetrics.cls}</div>
                <div class="metric-label">Cumulative Layout Shift (CLS)</div>
            </div>
            <div class="metric-card">
                <div class="metric-value score-${summary.avgMetrics.fcp <= CONFIG.thresholds.fcp ? 'good' : 'poor'}">${summary.avgMetrics.fcp}ms</div>
                <div class="metric-label">First Contentful Paint (FCP)</div>
            </div>
            <div class="metric-card">
                <div class="metric-value score-${summary.avgMetrics.si <= CONFIG.thresholds.si ? 'good' : 'poor'}">${summary.avgMetrics.si}ms</div>
                <div class="metric-label">Speed Index (SI)</div>
            </div>
            <div class="metric-card">
                <div class="metric-value score-${summary.avgMetrics.tti <= CONFIG.thresholds.tti ? 'good' : 'poor'}">${summary.avgMetrics.tti}ms</div>
                <div class="metric-label">Time to Interactive (TTI)</div>
            </div>
        </div>
        
        <h2>📄 Page Results</h2>
        <table class="table">
            <thead>
                <tr>
                    <th>Page</th>
                    <th>Device</th>
                    <th>Performance</th>
                    <th>Accessibility</th>
                    <th>Best Practices</th>
                    <th>SEO</th>
                    <th>PWA</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(pages).map(([pageName, devices]) => 
                  Object.entries(devices).map(([deviceName, result]) => `
                    <tr>
                        <td>${pageName}</td>
                        <td>${deviceName}</td>
                        <td class="score-${this.getScoreClass(result.scores?.performance || 0)}">${result.scores?.performance || 0}</td>
                        <td class="score-${this.getScoreClass(result.scores?.accessibility || 0)}">${result.scores?.accessibility || 0}</td>
                        <td class="score-${this.getScoreClass(result.scores?.bestPractices || 0)}">${result.scores?.bestPractices || 0}</td>
                        <td class="score-${this.getScoreClass(result.scores?.seo || 0)}">${result.scores?.seo || 0}</td>
                        <td class="score-${this.getScoreClass(result.scores?.pwa || 0)}">${result.scores?.pwa || 0}</td>
                        <td class="status-${result.passed?.passed ? 'pass' : 'fail'}">${result.passed?.passed ? '✅' : '❌'}</td>
                    </tr>
                  `).join('')
                ).join('')}
            </tbody>
        </table>
        
        <h2>🎯 Top Optimization Opportunities</h2>
        <div class="opportunities">
            ${summary.topOpportunities.slice(0, 5).map(opp => `
                <div style="margin-bottom: 15px; padding: 10px; background: white; border-radius: 4px;">
                    <h4 style="margin: 0 0 5px 0;">${opp.title}</h4>
                    <p style="margin: 0; color: #666; font-size: 14px;">${opp.description}</p>
                    <p style="margin: 5px 0 0 0; font-weight: bold; color: #0cce6b;">Potential savings: ${Math.round(opp.totalSavings)}ms</p>
                </div>
            `).join('')}
        </div>
        
        <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 6px;">
            <h3>📈 Summary</h3>
            <p><strong>Total Audits:</strong> ${summary.totalAudits}</p>
            <p><strong>Passed:</strong> ${summary.passedAudits}</p>
            <p><strong>Failed:</strong> ${summary.failedAudits}</p>
            <p><strong>Success Rate:</strong> ${Math.round((summary.passedAudits / summary.totalAudits) * 100)}%</p>
        </div>
    </div>
</body>
</html>`;

    const htmlPath = path.join(CONFIG.reportDir, `lighthouse-summary-${Date.now()}.html`);
    try {
      await fs.writeFile(htmlPath, htmlContent);
      console.log(`🌐 HTML summary saved: ${htmlPath}`);
    } catch (error) {
      console.warn('Warning: Could not save HTML summary:', error.message);
    }
  }

  getScoreClass(score) {
    if (score >= 90) return 'good';
    if (score >= 50) return 'average';
    return 'poor';
  }

  printSummary() {
    const { summary } = this.results;
    
    console.log('\n' + '='.repeat(60));
    console.log('🚀 LIGHTHOUSE AUDIT SUMMARY');
    console.log('='.repeat(60));
    console.log(`📊 Total Audits: ${summary.totalAudits}`);
    console.log(`✅ Passed: ${summary.passedAudits}`);
    console.log(`❌ Failed: ${summary.failedAudits}`);
    console.log(`📈 Success Rate: ${Math.round((summary.passedAudits / summary.totalAudits) * 100)}%`);
    console.log('');
    console.log('📊 Average Scores:');
    console.log(`   Performance: ${summary.avgScores.performance}/100`);
    console.log(`   Accessibility: ${summary.avgScores.accessibility}/100`);
    console.log(`   Best Practices: ${summary.avgScores.bestPractices}/100`);
    console.log(`   SEO: ${summary.avgScores.seo}/100`);
    console.log(`   PWA: ${summary.avgScores.pwa}/100`);
    console.log('');
    console.log('⚡ Core Web Vitals:');
    console.log(`   LCP: ${summary.avgMetrics.lcp}ms (target: ≤${CONFIG.thresholds.lcp}ms)`);
    console.log(`   FID: ${summary.avgMetrics.fid}ms (target: ≤${CONFIG.thresholds.fid}ms)`);
    console.log(`   CLS: ${summary.avgMetrics.cls} (target: ≤${CONFIG.thresholds.cls})`);
    console.log('');
    console.log(`🎯 Overall Status: ${summary.overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (summary.topOpportunities.length > 0) {
      console.log('\n🎯 Top Optimization Opportunities:');
      summary.topOpportunities.slice(0, 3).forEach((opp, index) => {
        console.log(`   ${index + 1}. ${opp.title} (${Math.round(opp.totalSavings)}ms savings)`);
      });
    }
    
    console.log('='.repeat(60));
  }

  async cleanup() {
    if (this.chrome) {
      await this.chrome.kill();
      console.log('✅ Chrome browser closed');
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const url = args[0] || CONFIG.url;
  
  if (url !== CONFIG.url) {
    CONFIG.url = url;
  }
  
  console.log('🚀 Money Maker Platform - Lighthouse Performance Audit');
  console.log(`🌐 Target URL: ${CONFIG.url}`);
  
  const auditor = new LighthouseAuditor();
  
  try {
    await auditor.initialize();
    await auditor.runAudit();
    auditor.calculateSummary();
    await auditor.generateReport();
    auditor.printSummary();
    
    // Exit with appropriate code
    process.exit(auditor.results.passed ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Lighthouse audit failed:', error.message);
    process.exit(1);
  } finally {
    await auditor.cleanup();
  }
}

if (require.main === module) {
  main();
}

module.exports = LighthouseAuditor;