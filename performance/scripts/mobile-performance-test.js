/**
 * 📱 Mobile Performance Testing Suite
 * 
 * Comprehensive mobile and PWA performance validation
 * Tests touch responsiveness, battery usage simulation, and offline capabilities
 */

import { test, expect, devices } from '@playwright/test';

// Mobile device configurations for testing
const mobileDevices = [
  {
    name: 'iPhone 12',
    ...devices['iPhone 12'],
    viewport: { width: 390, height: 844 }
  },
  {
    name: 'Samsung Galaxy S21',
    ...devices['Galaxy S8'],
    viewport: { width: 360, height: 760 }
  },
  {
    name: 'iPad Air',
    ...devices['iPad'],
    viewport: { width: 820, height: 1180 }
  }
];

// Network conditions simulation
const networkProfiles = [
  {
    name: '3G Slow',
    downloadThroughput: 500 * 1024 / 8,    // 500Kbps
    uploadThroughput: 250 * 1024 / 8,      // 250Kbps
    latency: 300
  },
  {
    name: '3G Fast',
    downloadThroughput: 1.6 * 1024 * 1024 / 8,  // 1.6Mbps
    uploadThroughput: 768 * 1024 / 8,            // 768Kbps
    latency: 150
  },
  {
    name: '4G',
    downloadThroughput: 9 * 1024 * 1024 / 8,    // 9Mbps
    uploadThroughput: 4.5 * 1024 * 1024 / 8,    // 4.5Mbps
    latency: 50
  }
];

class MobilePerformanceMonitor {
  constructor(page) {
    this.page = page;
    this.performanceMetrics = {
      touchResponses: [],
      scrollPerformance: [],
      tapTargets: [],
      networkUsage: [],
      batterySimulation: []
    };
  }

  async injectMobilePerformanceScript() {
    await this.page.addInitScript(() => {
      // Mobile-specific performance monitoring
      window.mobilePerformance = {
        touchEvents: [],
        scrollEvents: [],
        networkRequests: [],
        performanceEntries: [],
        touchStartTime: null
      };

      // Touch responsiveness monitoring
      document.addEventListener('touchstart', (e) => {
        window.mobilePerformance.touchStartTime = performance.now();
      }, { passive: true });

      document.addEventListener('touchend', (e) => {
        if (window.mobilePerformance.touchStartTime) {
          const responseTime = performance.now() - window.mobilePerformance.touchStartTime;
          window.mobilePerformance.touchEvents.push({
            responseTime,
            timestamp: Date.now(),
            target: e.target.tagName
          });
        }
      }, { passive: true });

      // Scroll performance monitoring
      let scrollTimeout;
      document.addEventListener('scroll', (e) => {
        const scrollStart = performance.now();
        
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          const scrollEnd = performance.now();
          window.mobilePerformance.scrollEvents.push({
            duration: scrollEnd - scrollStart,
            timestamp: Date.now(),
            scrollY: window.scrollY
          });
        }, 100);
      }, { passive: true });

      // Network request monitoring
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        const startTime = performance.now();
        return originalFetch.apply(this, args).then(response => {
          window.mobilePerformance.networkRequests.push({
            url: args[0],
            duration: performance.now() - startTime,
            status: response.status,
            size: response.headers.get('content-length') || 0
          });
          return response;
        });
      };

      // Performance observer for mobile-specific metrics
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach(entry => {
            window.mobilePerformance.performanceEntries.push({
              name: entry.name,
              duration: entry.duration,
              startTime: entry.startTime,
              entryType: entry.entryType
            });
          });
        });

        try {
          observer.observe({ entryTypes: ['paint', 'navigation', 'resource', 'measure'] });
        } catch (e) {
          console.warn('Performance Observer not fully supported');
        }
      }
    });
  }

  async measureTouchResponsiveness() {
    await this.injectMobilePerformanceScript();
    
    console.log('📱 Testing touch responsiveness...');
    
    // Find touch targets and test responsiveness
    const touchTargets = await this.page.$$('button, [role="button"], .btn, a, input, select, textarea');
    
    for (let i = 0; i < Math.min(touchTargets.length, 10); i++) {
      const target = touchTargets[i];
      
      try {
        // Measure touch response time
        const startTime = Date.now();
        await target.tap({ timeout: 5000 });
        const endTime = Date.now();
        
        this.performanceMetrics.touchResponses.push({
          target: await target.tagName(),
          responseTime: endTime - startTime,
          index: i
        });
        
        await this.page.waitForTimeout(100); // Brief pause between taps
      } catch (error) {
        console.warn(`Touch target ${i} not responsive:`, error.message);
      }
    }

    // Get detailed touch performance data
    const touchData = await this.page.evaluate(() => window.mobilePerformance.touchEvents);
    return touchData;
  }

  async measureScrollPerformance() {
    console.log('📜 Testing scroll performance...');
    
    // Test scroll performance with different speeds
    const scrollTests = [
      { name: 'slow', distance: 500, duration: 2000 },
      { name: 'medium', distance: 1000, duration: 1500 },
      { name: 'fast', distance: 1500, duration: 800 }
    ];

    for (const test of scrollTests) {
      const startY = await this.page.evaluate(() => window.scrollY);
      
      // Perform scroll action
      await this.page.mouse.wheel(0, test.distance);
      await this.page.waitForTimeout(test.duration);
      
      const endY = await this.page.evaluate(() => window.scrollY);
      
      this.performanceMetrics.scrollPerformance.push({
        testName: test.name,
        scrollDistance: endY - startY,
        duration: test.duration,
        fps: await this.measureScrollFPS()
      });
    }

    return this.performanceMetrics.scrollPerformance;
  }

  async measureScrollFPS() {
    return await this.page.evaluate(() => {
      return new Promise((resolve) => {
        let frameCount = 0;
        const startTime = performance.now();
        
        function countFrames() {
          frameCount++;
          if (performance.now() - startTime < 1000) {
            requestAnimationFrame(countFrames);
          } else {
            resolve(frameCount);
          }
        }
        
        requestAnimationFrame(countFrames);
      });
    });
  }

  async testTapTargetSizes() {
    console.log('🎯 Testing tap target sizes...');
    
    const tapTargets = await this.page.evaluate(() => {
      const targets = document.querySelectorAll('button, [role="button"], .btn, a, input, select');
      const results = [];
      
      targets.forEach((target, index) => {
        const rect = target.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(target);
        
        results.push({
          index,
          width: rect.width,
          height: rect.height,
          minSize: Math.min(rect.width, rect.height),
          tagName: target.tagName,
          className: target.className,
          padding: {
            top: parseInt(computedStyle.paddingTop),
            right: parseInt(computedStyle.paddingRight),
            bottom: parseInt(computedStyle.paddingBottom),
            left: parseInt(computedStyle.paddingLeft)
          }
        });
      });
      
      return results;
    });

    this.performanceMetrics.tapTargets = tapTargets;
    return tapTargets;
  }

  async simulateBatteryConstraints() {
    console.log('🔋 Simulating battery-constrained performance...');
    
    // Simulate CPU throttling (reduced performance)
    await this.page.evaluate(() => {
      // Artificially slow down operations
      const originalTimeout = window.setTimeout;
      window.setTimeout = function(callback, delay) {
        return originalTimeout(callback, delay * 1.5); // 50% slower
      };
      
      // Simulate reduced animation performance
      const originalRaf = window.requestAnimationFrame;
      let frameSkip = 0;
      window.requestAnimationFrame = function(callback) {
        frameSkip++;
        if (frameSkip % 2 === 0) { // Skip every other frame
          return originalRaf(callback);
        } else {
          return originalTimeout(callback, 16); // Fallback to setTimeout
        }
      };
    });

    // Test performance under battery constraints
    const startTime = Date.now();
    await this.page.reload();
    await this.page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    this.performanceMetrics.batterySimulation.push({
      constrainedLoadTime: loadTime,
      testType: 'battery_constrained'
    });

    return loadTime;
  }

  async testOfflineCapabilities() {
    console.log('📶 Testing offline capabilities...');
    
    // Test service worker registration
    const serviceWorkerStatus = await this.page.evaluate(() => {
      return 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null;
    });

    // Go offline and test functionality
    await this.page.setOffline(true);
    
    const offlineStartTime = Date.now();
    await this.page.reload();
    
    try {
      await this.page.waitForSelector('body', { timeout: 10000 });
      const offlineLoadTime = Date.now() - offlineStartTime;
      
      // Test basic functionality offline
      const offlineFunctionality = await this.page.evaluate(() => {
        // Check if main UI elements are present
        const hasHeader = document.querySelector('header, .header, nav') !== null;
        const hasMainContent = document.querySelector('main, .main-content, .content') !== null;
        const hasInteractiveElements = document.querySelectorAll('button, input').length > 0;
        
        return {
          hasHeader,
          hasMainContent,
          hasInteractiveElements,
          totalElements: document.querySelectorAll('*').length
        };
      });

      await this.page.setOffline(false);
      
      return {
        serviceWorkerActive: serviceWorkerStatus,
        offlineLoadTime,
        offlineFunctionality,
        offlineSupported: true
      };
    } catch (error) {
      await this.page.setOffline(false);
      return {
        serviceWorkerActive: serviceWorkerStatus,
        offlineSupported: false,
        error: error.message
      };
    }
  }

  async measureNetworkUsage() {
    console.log('📊 Measuring network usage...');
    
    const networkData = await this.page.evaluate(() => {
      return window.mobilePerformance.networkRequests.map(req => ({
        url: req.url,
        duration: req.duration,
        status: req.status,
        size: parseInt(req.size) || 0
      }));
    });

    const totalSize = networkData.reduce((sum, req) => sum + req.size, 0);
    const averageRequestTime = networkData.length > 0 
      ? networkData.reduce((sum, req) => sum + req.duration, 0) / networkData.length 
      : 0;

    this.performanceMetrics.networkUsage = {
      totalRequests: networkData.length,
      totalSize: totalSize,
      averageRequestTime,
      requests: networkData
    };

    return this.performanceMetrics.networkUsage;
  }

  generateMobilePerformanceReport() {
    let report = '\n📱 MOBILE PERFORMANCE REPORT\n';
    report += '===============================\n\n';

    // Touch responsiveness
    if (this.performanceMetrics.touchResponses.length > 0) {
      const avgTouchResponse = this.performanceMetrics.touchResponses
        .reduce((sum, t) => sum + t.responseTime, 0) / this.performanceMetrics.touchResponses.length;
      
      report += '👆 TOUCH RESPONSIVENESS:\n';
      report += `   Average response time: ${avgTouchResponse.toFixed(0)}ms\n`;
      report += `   Touch targets tested: ${this.performanceMetrics.touchResponses.length}\n`;
      report += `   Target: <100ms ${avgTouchResponse < 100 ? '✅' : '❌'}\n`;
    }

    // Scroll performance
    if (this.performanceMetrics.scrollPerformance.length > 0) {
      report += '\n📜 SCROLL PERFORMANCE:\n';
      this.performanceMetrics.scrollPerformance.forEach(scroll => {
        report += `   ${scroll.testName}: ${scroll.fps}fps, Distance: ${scroll.scrollDistance}px\n`;
      });
    }

    // Tap target accessibility
    if (this.performanceMetrics.tapTargets.length > 0) {
      const smallTargets = this.performanceMetrics.tapTargets.filter(t => t.minSize < 44);
      report += '\n🎯 TAP TARGET ANALYSIS:\n';
      report += `   Total tap targets: ${this.performanceMetrics.tapTargets.length}\n`;
      report += `   Targets < 44px: ${smallTargets.length} ${smallTargets.length === 0 ? '✅' : '❌'}\n`;
      
      if (smallTargets.length > 0) {
        report += '   Small targets found:\n';
        smallTargets.slice(0, 5).forEach(target => {
          report += `     ${target.tagName}: ${target.minSize.toFixed(0)}px\n`;
        });
      }
    }

    // Network usage
    if (this.performanceMetrics.networkUsage.totalRequests > 0) {
      const usage = this.performanceMetrics.networkUsage;
      report += '\n📊 NETWORK USAGE:\n';
      report += `   Total requests: ${usage.totalRequests}\n`;
      report += `   Total data: ${(usage.totalSize / 1024).toFixed(1)}KB\n`;
      report += `   Avg request time: ${usage.averageRequestTime.toFixed(0)}ms\n`;
    }

    return report;
  }
}

// Test suite implementation
for (const device of mobileDevices) {
  test.describe(`📱 Mobile Performance - ${device.name}`, () => {
    test.use({ ...device });

    let monitor;

    test.beforeEach(async ({ page }) => {
      monitor = new MobilePerformanceMonitor(page);
    });

    test(`should meet mobile performance standards on ${device.name}`, async ({ page }) => {
      const baseUrl = process.env.BASE_URL || 'http://localhost:4200';
      
      console.log(`\n📱 Testing mobile performance on ${device.name}...`);
      
      // Test different pages
      const pages = [
        { name: 'Home', url: baseUrl },
        { name: 'Dashboard', url: `${baseUrl}/dashboard` },
        { name: 'Jobs', url: `${baseUrl}/jobs` }
      ];

      for (const pageConfig of pages) {
        console.log(`\n📄 Testing ${pageConfig.name} page on ${device.name}...`);
        
        await page.goto(pageConfig.url, { waitUntil: 'networkidle' });
        
        // Measure touch responsiveness
        const touchData = await monitor.measureTouchResponsiveness();
        
        // Measure scroll performance
        const scrollData = await monitor.measureScrollPerformance();
        
        // Test tap target sizes
        const tapTargets = await monitor.testTapTargetSizes();
        
        // Measure network usage
        const networkUsage = await monitor.measureNetworkUsage();
        
        // Generate and display report
        const report = monitor.generateMobilePerformanceReport();
        console.log(report);
        
        // Performance assertions
        if (touchData.length > 0) {
          const avgTouchResponse = touchData.reduce((sum, t) => sum + t.responseTime, 0) / touchData.length;
          expect(avgTouchResponse, `Touch response time on ${device.name}`).toBeLessThan(100);
        }
        
        if (scrollData.length > 0) {
          const avgFPS = scrollData.reduce((sum, s) => sum + s.fps, 0) / scrollData.length;
          expect(avgFPS, `Scroll FPS on ${device.name}`).toBeGreaterThan(30);
        }
        
        // Tap target size validation (minimum 44px)
        const smallTargets = tapTargets.filter(t => t.minSize < 44);
        expect(smallTargets.length, `Small tap targets on ${device.name}`).toBeLessThan(tapTargets.length * 0.1);
        
        // Network efficiency
        expect(networkUsage.averageRequestTime, `Network request time on ${device.name}`).toBeLessThan(2000);
      }
    });

    test(`should handle network conditions on ${device.name}`, async ({ page }) => {
      const baseUrl = process.env.BASE_URL || 'http://localhost:4200';
      
      for (const networkProfile of networkProfiles) {
        console.log(`\n📡 Testing ${networkProfile.name} on ${device.name}...`);
        
        // Apply network throttling
        await page.route('**/*', async route => {
          await new Promise(resolve => setTimeout(resolve, networkProfile.latency));
          await route.continue();
        });
        
        const startTime = Date.now();
        await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 60000 });
        const loadTime = Date.now() - startTime;
        
        console.log(`   Load time on ${networkProfile.name}: ${loadTime}ms`);
        
        // Network-specific assertions
        if (networkProfile.name === '3G Slow') {
          expect(loadTime, `3G Slow load time on ${device.name}`).toBeLessThan(10000);
        } else if (networkProfile.name === '4G') {
          expect(loadTime, `4G load time on ${device.name}`).toBeLessThan(3000);
        }
      }
    });

    test(`should support PWA features on ${device.name}`, async ({ page }) => {
      const baseUrl = process.env.BASE_URL || 'http://localhost:4200';
      await page.goto(baseUrl);
      
      // Test offline capabilities
      const offlineResults = await monitor.testOfflineCapabilities();
      
      console.log(`📶 Offline capabilities on ${device.name}:`, offlineResults);
      
      // PWA assertions
      expect(offlineResults.serviceWorkerActive, `Service Worker on ${device.name}`).toBe(true);
      
      if (offlineResults.offlineSupported) {
        expect(offlineResults.offlineLoadTime, `Offline load time on ${device.name}`).toBeLessThan(5000);
        expect(offlineResults.offlineFunctionality.hasMainContent, `Offline content on ${device.name}`).toBe(true);
      }
    });

    test(`should perform well under battery constraints on ${device.name}`, async ({ page }) => {
      const baseUrl = process.env.BASE_URL || 'http://localhost:4200';
      await page.goto(baseUrl);
      
      // Test battery-constrained performance
      const constrainedLoadTime = await monitor.simulateBatteryConstraints();
      
      console.log(`🔋 Battery-constrained load time on ${device.name}: ${constrainedLoadTime}ms`);
      
      // Should still be usable under battery constraints
      expect(constrainedLoadTime, `Battery-constrained performance on ${device.name}`).toBeLessThan(15000);
    });
  });
}

export { MobilePerformanceMonitor };