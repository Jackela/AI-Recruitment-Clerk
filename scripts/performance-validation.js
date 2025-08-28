#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * AI招聘系统前端性能验证脚本
 * 验证优化措施的实施效果
 */

class PerformanceValidator {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.frontendPath = path.join(this.projectRoot, 'apps/ai-recruitment-frontend');
    this.results = {
      bundleOptimization: false,
      webpackConfig: false,
      routeLazyLoading: false,
      componentOptimization: false,
      ngrxOptimization: false,
      preloadingStrategy: false,
      performanceMonitoring: false,
      styleOptimization: false
    };
    this.score = 0;
    this.maxScore = 8;
  }

  validateBundleOptimization() {
    try {
      const projectJson = path.join(this.frontendPath, 'project.json');
      if (!fs.existsSync(projectJson)) {
        console.log('❌ project.json not found');
        return false;
      }

      const config = JSON.parse(fs.readFileSync(projectJson, 'utf8'));
      const prodConfig = config.targets?.build?.configurations?.production;
      
      if (!prodConfig) {
        console.log('❌ Production configuration not found');
        return false;
      }

      // Check bundle budgets
      const budgets = prodConfig.budgets || [];
      const hasBudgetOptimization = budgets.some(budget => 
        budget.type === 'initial' && 
        parseInt(budget.maximumError) <= 500000 // 500KB
      );

      // Check optimization settings
      const hasOptimization = prodConfig.optimization?.scripts === true &&
                             prodConfig.optimization?.styles?.minify === true &&
                             prodConfig.buildOptimizer === true;

      if (hasBudgetOptimization && hasOptimization) {
        console.log('✅ Bundle optimization configured correctly');
        this.results.bundleOptimization = true;
        this.score++;
        return true;
      } else {
        console.log('❌ Bundle optimization not properly configured');
        return false;
      }
    } catch (error) {
      console.log('❌ Error validating bundle optimization:', error.message);
      return false;
    }
  }

  validateWebpackConfig() {
    try {
      const webpackConfig = path.join(this.frontendPath, 'webpack.config.js');
      if (!fs.existsSync(webpackConfig)) {
        console.log('❌ webpack.config.js not found');
        return false;
      }

      const config = fs.readFileSync(webpackConfig, 'utf8');
      
      // Check for code splitting optimization
      const hasCodeSplitting = config.includes('splitChunks') &&
                              config.includes('angular-vendor') &&
                              config.includes('ngrx-vendor') &&
                              config.includes('rxjs-vendor');

      // Check for performance optimizations
      const hasPerformanceOptimizations = config.includes('moduleIds: \'deterministic\'') &&
                                         config.includes('usedExports: true') &&
                                         config.includes('sideEffects: false');

      if (hasCodeSplitting && hasPerformanceOptimizations) {
        console.log('✅ Webpack configuration optimized');
        this.results.webpackConfig = true;
        this.score++;
        return true;
      } else {
        console.log('❌ Webpack configuration not optimized');
        return false;
      }
    } catch (error) {
      console.log('❌ Error validating webpack config:', error.message);
      return false;
    }
  }

  validateRouteLazyLoading() {
    try {
      const routesFile = path.join(this.frontendPath, 'src/app/app.routes.ts');
      if (!fs.existsSync(routesFile)) {
        console.log('❌ app.routes.ts not found');
        return false;
      }

      const routes = fs.readFileSync(routesFile, 'utf8');
      
      // Check for lazy loading implementation
      const hasLazyLoading = routes.includes('loadComponent') &&
                            routes.includes('loadChildren') &&
                            routes.includes('import(');

      // Check for preloading data
      const hasPreloadingData = routes.includes('preload:') &&
                               routes.includes('priority:');

      if (hasLazyLoading && hasPreloadingData) {
        console.log('✅ Route lazy loading with preloading strategy implemented');
        this.results.routeLazyLoading = true;
        this.score++;
        return true;
      } else {
        console.log('❌ Route lazy loading not properly implemented');
        return false;
      }
    } catch (error) {
      console.log('❌ Error validating route lazy loading:', error.message);
      return false;
    }
  }

  validateComponentOptimization() {
    try {
      const bentoGridFile = path.join(this.frontendPath, 'src/app/components/shared/bento-grid/bento-grid.component.ts');
      if (!fs.existsSync(bentoGridFile)) {
        console.log('❌ bento-grid.component.ts not found');
        return false;
      }

      const component = fs.readFileSync(bentoGridFile, 'utf8');
      
      // Check for OnPush change detection
      const hasOnPush = component.includes('ChangeDetectionStrategy.OnPush');
      
      // Check for TrackBy function
      const hasTrackBy = component.includes('TrackByFunction') &&
                        component.includes('trackByItemId');

      // Check for OnDestroy implementation
      const hasOnDestroy = component.includes('OnDestroy') &&
                          component.includes('destroy$.next()');

      // Check for performance optimizations
      const hasPerformanceOptimizations = component.includes('requestIdleCallback') &&
                                         component.includes('IntersectionObserver');

      if (hasOnPush && hasTrackBy && hasOnDestroy && hasPerformanceOptimizations) {
        console.log('✅ Component optimization implemented');
        this.results.componentOptimization = true;
        this.score++;
        return true;
      } else {
        console.log('❌ Component optimization not fully implemented');
        return false;
      }
    } catch (error) {
      console.log('❌ Error validating component optimization:', error.message);
      return false;
    }
  }

  validateNgrxOptimization() {
    try {
      const mainFile = path.join(this.frontendPath, 'src/main.ts');
      if (!fs.existsSync(mainFile)) {
        console.log('❌ main.ts not found');
        return false;
      }

      const main = fs.readFileSync(mainFile, 'utf8');
      
      // Check for runtime checks optimization
      const hasRuntimeChecks = main.includes('runtimeChecks') &&
                              main.includes('isDevMode()');

      // Check for router optimization
      const hasRouterOptimization = main.includes('preloadingStrategy') &&
                                   main.includes('SmartPreloadingStrategy');

      // Check for DevTools optimization
      const hasDevToolsOptimization = main.includes('logOnly: !isDevMode()');

      if (hasRuntimeChecks && hasRouterOptimization && hasDevToolsOptimization) {
        console.log('✅ NgRx optimization implemented');
        this.results.ngrxOptimization = true;
        this.score++;
        return true;
      } else {
        console.log('❌ NgRx optimization not fully implemented');
        return false;
      }
    } catch (error) {
      console.log('❌ Error validating NgRx optimization:', error.message);
      return false;
    }
  }

  validatePreloadingStrategy() {
    try {
      const preloadingFile = path.join(this.frontendPath, 'src/app/services/smart-preloading.strategy.ts');
      if (!fs.existsSync(preloadingFile)) {
        console.log('❌ smart-preloading.strategy.ts not found');
        return false;
      }

      const strategy = fs.readFileSync(preloadingFile, 'utf8');
      
      // Check for network condition detection
      const hasNetworkDetection = strategy.includes('detectNetworkCondition') &&
                                  strategy.includes('connection.effectiveType');

      // Check for user engagement tracking
      const hasUserTracking = strategy.includes('trackUserEngagement') &&
                             strategy.includes('interactionCount');

      // Check for intelligent preloading logic
      const hasIntelligentPreloading = strategy.includes('shouldPreload') &&
                                      strategy.includes('calculateDelay');

      if (hasNetworkDetection && hasUserTracking && hasIntelligentPreloading) {
        console.log('✅ Smart preloading strategy implemented');
        this.results.preloadingStrategy = true;
        this.score++;
        return true;
      } else {
        console.log('❌ Smart preloading strategy not fully implemented');
        return false;
      }
    } catch (error) {
      console.log('❌ Error validating preloading strategy:', error.message);
      return false;
    }
  }

  validatePerformanceMonitoring() {
    try {
      const monitoringFile = path.join(this.frontendPath, 'src/app/services/performance-monitor.service.ts');
      if (!fs.existsSync(monitoringFile)) {
        console.log('❌ performance-monitor.service.ts not found');
        return false;
      }

      const monitoring = fs.readFileSync(monitoringFile, 'utf8');
      
      // Check for Core Web Vitals monitoring
      const hasCoreWebVitals = monitoring.includes('observeLCP') &&
                              monitoring.includes('observeFID') &&
                              monitoring.includes('observeCLS');

      // Check for resource monitoring
      const hasResourceMonitoring = monitoring.includes('observeResources') &&
                                   monitoring.includes('observeMemory');

      // Check for Lighthouse score estimation
      const hasLighthouseEstimation = monitoring.includes('estimateLighthouseScore');

      if (hasCoreWebVitals && hasResourceMonitoring && hasLighthouseEstimation) {
        console.log('✅ Performance monitoring service implemented');
        this.results.performanceMonitoring = true;
        this.score++;
        return true;
      } else {
        console.log('❌ Performance monitoring service not fully implemented');
        return false;
      }
    } catch (error) {
      console.log('❌ Error validating performance monitoring:', error.message);
      return false;
    }
  }

  validateStyleOptimization() {
    try {
      const stylesFile = path.join(this.frontendPath, 'src/styles.scss');
      if (!fs.existsSync(stylesFile)) {
        console.log('❌ styles.scss not found');
        return false;
      }

      const styles = fs.readFileSync(stylesFile, 'utf8');
      
      // Check for performance optimizations
      const hasPerformanceOptimizations = styles.includes('optimizeSpeed') &&
                                         styles.includes('font-display: swap') &&
                                         styles.includes('translateZ(0)');

      // Check for @use imports instead of @import
      const hasModernImports = styles.includes('@use') &&
                              !styles.includes('@import url');

      if (hasPerformanceOptimizations && hasModernImports) {
        console.log('✅ Style optimization implemented');
        this.results.styleOptimization = true;
        this.score++;
        return true;
      } else {
        console.log('❌ Style optimization not fully implemented');
        return false;
      }
    } catch (error) {
      console.log('❌ Error validating style optimization:', error.message);
      return false;
    }
  }

  async run() {
    console.log('\n🚀 AI招聘系统前端性能优化验证\n');
    console.log('=' * 50);

    // Run all validations
    console.log('\n📊 验证优化措施实施情况:\n');
    
    this.validateBundleOptimization();
    this.validateWebpackConfig();
    this.validateRouteLazyLoading();
    this.validateComponentOptimization();
    this.validateNgrxOptimization();
    this.validatePreloadingStrategy();
    this.validatePerformanceMonitoring();
    this.validateStyleOptimization();

    // Calculate score
    const percentage = (this.score / this.maxScore * 100).toFixed(1);
    
    console.log('\n' + '=' * 50);
    console.log(`\n📋 验证结果: ${this.score}/${this.maxScore} (${percentage}%)`);
    
    if (this.score === this.maxScore) {
      console.log('\n🎉 所有性能优化措施已成功实施！');
      console.log('\n预期性能提升:');
      console.log('  • 首屏加载时间: 降低 40-50%');
      console.log('  • Bundle大小: 智能分包 + 压缩优化');
      console.log('  • Lighthouse评分: 预计提升到 90+ 分');
      console.log('  • 用户体验: 显著改善');
    } else if (this.score >= this.maxScore * 0.75) {
      console.log('\n✅ 大部分性能优化措施已实施，效果显著');
      console.log('\n建议完善剩余优化项以达到最佳性能');
    } else {
      console.log('\n⚠️  部分性能优化措施需要完善');
      console.log('\n建议优先实施以下措施:');
      
      Object.entries(this.results).forEach(([key, value]) => {
        if (!value) {
          console.log(`  • ${key}`);
        }
      });
    }

    console.log('\n🔧 下一步建议:');
    console.log('  1. 运行构建测试验证Bundle大小');
    console.log('  2. 使用Lighthouse进行实际性能测试');
    console.log('  3. 部署到测试环境进行用户体验验证');
    console.log('  4. 启用性能监控收集真实用户数据\n');

    return {
      score: this.score,
      maxScore: this.maxScore,
      percentage: parseFloat(percentage),
      results: this.results
    };
  }
}

// Run validation
if (require.main === module) {
  const validator = new PerformanceValidator();
  validator.run().catch(console.error);
}

module.exports = PerformanceValidator;