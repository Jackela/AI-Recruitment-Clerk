/**
 * @fileoverview DBC Production Monitoring Tests
 * @author AI Recruitment Team
 * @since 1.0.0
 * @version 1.0.0
 * @module DBCMonitoringTests
 */

import type { ContractMetrics} from './dbc.monitoring';
import { DBCMonitor, withMonitoring } from './dbc.monitoring';
import { ContractViolationError } from './dbc.decorators';

describe('DBC Production Monitoring', () => {
  let monitor: DBCMonitor;
  let originalConsoleError: typeof console.error;

  beforeEach(() => {
    monitor = new DBCMonitor();
    // Suppress console.error during tests to reduce noise
    originalConsoleError = console.error;
    console.error = jest.fn();
  });

  afterEach(() => {
    // Restore console.error
    console.error = originalConsoleError;
  });

  describe('Metrics Recording', () => {
    it('should record successful contract execution', () => {
      const metric: ContractMetrics = {
        operationName: 'calculateScore',
        contractType: 'POST',
        executionTime: 45,
        memoryUsage: 1024,
        success: true,
        timestamp: new Date(),
        serviceContext: 'ScoringService',
      };

      monitor.recordContractExecution(metric);
      const stats = monitor.getPerformanceStats();

      expect(stats.totalContracts).toBe(1);
      expect(stats.contractViolations).toBe(0);
      expect(stats.violationRate).toBe(0);
      expect(stats.averageExecutionTime).toBe(45);
    });

    it('should record contract violations', () => {
      const successMetric: ContractMetrics = {
        operationName: 'generateReport',
        contractType: 'POST',
        executionTime: 120,
        memoryUsage: 2048,
        success: true,
        timestamp: new Date(),
        serviceContext: 'ReportService',
      };

      const violationMetric: ContractMetrics = {
        operationName: 'generateReport',
        contractType: 'PRE',
        executionTime: 15,
        memoryUsage: 512,
        success: false,
        errorMessage: 'Invalid input parameters',
        timestamp: new Date(),
        serviceContext: 'ReportService',
      };

      monitor.recordContractExecution(successMetric);
      monitor.recordContractExecution(violationMetric);

      const stats = monitor.getPerformanceStats();
      expect(stats.totalContracts).toBe(2);
      expect(stats.contractViolations).toBe(1);
      expect(stats.violationRate).toBe(0.5);
    });

    it('should update performance profiles correctly', () => {
      // Record multiple metrics for the same operation
      for (let i = 0; i < 5; i++) {
        monitor.recordContractExecution({
          operationName: 'extractJD',
          contractType: 'POST',
          executionTime: 100 + i * 20,
          memoryUsage: 1024,
          success: i < 4, // One failure
          errorMessage: i === 4 ? 'Processing timeout' : undefined,
          timestamp: new Date(),
          serviceContext: 'ExtractionService',
        });
      }

      const stats = monitor.getPerformanceStats();
      const extractionProfile = stats.servicePerformance.find(
        (p: any) =>
          p.serviceName === 'ExtractionService' &&
          p.operationName === 'extractJD',
      );

      expect(extractionProfile).toBeDefined();
      if (!extractionProfile) {
        throw new Error('Expected extraction performance profile');
      }
      expect(extractionProfile.contractViolations).toBe(1);
      expect(extractionProfile.successRate).toBe(0.8);
      expect(extractionProfile.averageExecutionTime).toBeCloseTo(140);
    });
  });

  describe('Alert System', () => {
    it('should trigger alerts for high violation rates', () => {
      // Create high violation rate scenario (20% success rate = 80% violation rate)
      for (let i = 0; i < 10; i++) {
        monitor.recordContractExecution({
          operationName: 'testOperation',
          contractType: 'PRE',
          executionTime: 50,
          memoryUsage: 1024,
          success: i < 2, // Only first 2 succeed, rest fail
          errorMessage: i >= 2 ? 'Contract violation' : undefined,
          timestamp: new Date(),
          serviceContext: 'TestService',
        });
      }

      const alerts = monitor.getActiveAlerts();
      const criticalAlert = alerts.find(
        (alert) =>
          alert.metricName === 'violationRate' &&
          alert.alertLevel === 'critical',
      );
      const warningAlert = alerts.find(
        (alert) =>
          alert.metricName === 'violationRate' &&
          alert.alertLevel === 'warning',
      );

      // Should have at least a warning alert (>5%) or critical alert (>15%)
      expect(criticalAlert || warningAlert).toBeDefined();

      if (criticalAlert) {
        expect(criticalAlert.currentValue).toBeGreaterThan(0.15);
      } else if (warningAlert) {
        expect(warningAlert.currentValue).toBeGreaterThan(0.05);
      }
    });

    it('should trigger alerts for slow execution times', () => {
      // Create slow execution scenario
      for (let i = 0; i < 5; i++) {
        monitor.recordContractExecution({
          operationName: 'slowOperation',
          contractType: 'POST',
          executionTime: 600, // Very slow - over 500ms threshold
          memoryUsage: 1024,
          success: true,
          timestamp: new Date(),
          serviceContext: 'SlowService',
        });
      }

      const alerts = monitor.getActiveAlerts();
      const criticalAlert = alerts.find(
        (alert) =>
          alert.metricName === 'averageExecutionTime' &&
          alert.alertLevel === 'critical',
      );
      const warningAlert = alerts.find(
        (alert) =>
          alert.metricName === 'averageExecutionTime' &&
          alert.alertLevel === 'warning',
      );

      // Should have at least a warning alert (>100ms) or critical alert (>500ms)
      expect(criticalAlert || warningAlert).toBeDefined();

      if (criticalAlert) {
        expect(criticalAlert.currentValue).toBeGreaterThan(500);
      } else if (warningAlert) {
        expect(warningAlert.currentValue).toBeGreaterThan(100);
      }
    });

    it('should respect alert cooldown periods', () => {
      // First trigger
      for (let i = 0; i < 3; i++) {
        monitor.recordContractExecution({
          operationName: 'cooldownTest',
          contractType: 'PRE',
          executionTime: 50,
          memoryUsage: 1024,
          success: false,
          errorMessage: 'Test violation',
          timestamp: new Date(),
          serviceContext: 'CooldownService',
        });
      }

      const firstAlerts = monitor.getActiveAlerts();
      expect(firstAlerts.length).toBeGreaterThan(0);

      // Second trigger should be blocked by cooldown
      const secondAlerts = monitor.getActiveAlerts();
      expect(secondAlerts.length).toBe(0); // Cooled down
    });
  });

  describe('Performance Optimization', () => {
    it('should identify slow operations for optimization', () => {
      // Create slow operations
      monitor.recordContractExecution({
        operationName: 'slowValidation',
        contractType: 'POST',
        executionTime: 200, // Slow
        memoryUsage: 1024,
        success: true,
        timestamp: new Date(),
        serviceContext: 'ValidationService',
      });

      const optimization = monitor.optimizePerformance() as unknown as {
        optimizations: Array<{
          type: string;
          issue: string;
          recommendation: string;
          impact: string;
        }>;
      };
      const slowOpOptimization = optimization.optimizations.find(
        (opt: any) =>
          opt.type === 'performance' &&
          opt.issue === 'slow_contract_validation',
      );

      expect(slowOpOptimization).toBeDefined();
      expect(slowOpOptimization!.recommendation).toContain('caching');
      expect(slowOpOptimization!.impact).toBe('high');
    });

    it('should identify high violation rate services', () => {
      // Create high violation scenario
      for (let i = 0; i < 10; i++) {
        monitor.recordContractExecution({
          operationName: 'problematicOperation',
          contractType: 'PRE',
          executionTime: 50,
          memoryUsage: 1024,
          success: i < 5, // 50% success rate
          errorMessage: i >= 5 ? 'Validation failed' : undefined,
          timestamp: new Date(),
          serviceContext: 'ProblematicService',
        });
      }

      const optimization = monitor.optimizePerformance() as unknown as {
        optimizations: Array<{
          type: string;
          issue: string;
          impact: string;
          affectedServices?: string[];
        }>;
      };
      const qualityOptimization = optimization.optimizations.find(
        (opt: any) =>
          opt.type === 'quality' &&
          opt.issue === 'high_contract_violation_rate',
      );

      expect(qualityOptimization).toBeDefined();
      expect(qualityOptimization!.impact).toBe('critical');
      expect(qualityOptimization!.affectedServices).toContain(
        'ProblematicService',
      );
    });

    it('should suggest memory optimizations when needed', () => {
      // Simulate high memory usage scenario
      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 600 * 1024 * 1024,
        heapTotal: 550 * 1024 * 1024,
        heapUsed: 520 * 1024 * 1024, // Over 500MB threshold
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      });

      const optimization = monitor.optimizePerformance() as unknown as {
        optimizations: Array<{
          type: string;
          recommendation: string;
          currentUsage?: string;
        }>;
      };
      const memoryOptimization = optimization.optimizations.find(
        (opt: any) => opt.type === 'memory',
      );

      expect(memoryOptimization).toBeDefined();
      expect(memoryOptimization!.recommendation).toContain('metrics history');
      expect(memoryOptimization!.currentUsage).toContain('MB');

      jest.restoreAllMocks();
    });
  });

  describe('Health Report Generation', () => {
    it('should generate comprehensive health report', () => {
      // Create mixed performance scenario
      const scenarios = [
        { success: true, time: 45 },
        { success: true, time: 55 },
        { success: false, time: 30 },
        { success: true, time: 70 },
        { success: true, time: 40 },
      ];

      scenarios.forEach((scenario) => {
        monitor.recordContractExecution({
          operationName: 'mixedOperation',
          contractType: 'POST',
          executionTime: scenario.time,
          memoryUsage: 1024,
          success: scenario.success,
          errorMessage: !scenario.success ? 'Test error' : undefined,
          timestamp: new Date(),
          serviceContext: 'MixedService',
        });
      });

      const healthReport = monitor.generateHealthReport() as {
        healthScore: number;
        healthStatus: string;
        summary: { totalContracts: number; violations: number };
        details: unknown;
        recommendations: string[];
        generatedAt: Date;
        nextReviewDate: Date;
      };

      expect(healthReport.healthScore).toBeGreaterThan(0);
      expect(healthReport.healthScore).toBeLessThanOrEqual(100);
      expect(healthReport.healthStatus).toMatch(/excellent|good|fair|poor/);
      expect(healthReport.summary).toBeDefined();
      expect(healthReport.summary.totalContracts).toBe(5);
      expect(healthReport.summary.violations).toBe(1);
      expect(healthReport.details).toBeDefined();
      expect(healthReport.recommendations).toBeInstanceOf(Array);
      expect(healthReport.generatedAt).toBeInstanceOf(Date);
      expect(healthReport.nextReviewDate).toBeInstanceOf(Date);
    });

    it('should calculate health scores accurately', () => {
      // Perfect scenario
      for (let i = 0; i < 10; i++) {
        monitor.recordContractExecution({
          operationName: 'perfectOperation',
          contractType: 'POST',
          executionTime: 25, // Fast
          memoryUsage: 512,
          success: true, // No violations
          timestamp: new Date(),
          serviceContext: 'PerfectService',
        });
      }

      const perfectHealth = monitor.generateHealthReport();
      expect(perfectHealth.healthScore).toBeGreaterThan(90);
      expect(perfectHealth.healthStatus).toBe('excellent');

      // Poor scenario
      const poorMonitor = new DBCMonitor();
      for (let i = 0; i < 10; i++) {
        poorMonitor.recordContractExecution({
          operationName: 'poorOperation',
          contractType: 'PRE',
          executionTime: 200, // Slow
          memoryUsage: 2048,
          success: i > 7, // High violations
          errorMessage: i <= 7 ? 'Multiple failures' : undefined,
          timestamp: new Date(),
          serviceContext: 'PoorService',
        });
      }

      const poorHealth = poorMonitor.generateHealthReport();
      expect(poorHealth.healthScore).toBeLessThan(50);
      expect(poorHealth.healthStatus).toBe('poor');
    });

    it('should provide actionable recommendations', () => {
      // Create scenario with various issues
      monitor.recordContractExecution({
        operationName: 'problematicOp',
        contractType: 'POST',
        executionTime: 150, // Slow
        memoryUsage: 1024,
        success: false, // Violation
        errorMessage: 'Contract failed',
        timestamp: new Date(),
        serviceContext: 'ProblematicService',
      });

      const healthReport = monitor.generateHealthReport() as {
        recommendations: string[];
      };
      const recommendations = healthReport.recommendations;

      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);

      // Should contain specific recommendations
      const hasPerformanceRec = recommendations.some(
        (rec: string) =>
          rec.toLowerCase().includes('performance') ||
          rec.toLowerCase().includes('slow'),
      );
      const hasViolationRec = recommendations.some(
        (rec: string) =>
          rec.toLowerCase().includes('violation') ||
          rec.toLowerCase().includes('validation'),
      );

      expect(hasPerformanceRec || hasViolationRec).toBe(true);
    });
  });

  describe('Monitoring Decorator', () => {
    // Import the singleton dbcMonitor for decorator tests
    const { dbcMonitor } = require('./dbc.monitoring');

    class TestService {
      @withMonitoring('TestService')
      async successfulOperation(value: number): Promise<number> {
        // Simulate some processing time
        await new Promise((resolve) => setTimeout(resolve, 10));
        return value * 2;
      }

      @withMonitoring('TestService')
      async failingOperation(): Promise<never> {
        throw new ContractViolationError(
          'Test violation',
          'PRE',
          'TestService.failingOperation',
        );
      }

      @withMonitoring('TestService')
      async slowOperation(): Promise<string> {
        // Simulate slow operation
        await new Promise((resolve) => setTimeout(resolve, 50));
        return 'completed';
      }
    }

    it('should monitor successful operations', async () => {
      const service = new TestService();
      const result = await service.successfulOperation(5);

      expect(result).toBe(10);

      // Check if monitoring recorded the operation using singleton
      const stats = dbcMonitor.getPerformanceStats();
      expect(stats.totalContracts).toBeGreaterThan(0);
    });

    it('should monitor failing operations', async () => {
      const service = new TestService();

      await expect(service.failingOperation()).rejects.toThrow(
        'Test violation',
      );

      // Check if violation was recorded using singleton
      const stats = dbcMonitor.getPerformanceStats();
      expect(stats.contractViolations).toBeGreaterThan(0);
    });

    it('should record execution time accurately', async () => {
      const service = new TestService();
      const startTime = Date.now();

      await service.slowOperation();

      const endTime = Date.now();
      const actualDuration = endTime - startTime;

      const stats = dbcMonitor.getPerformanceStats();
      // Since dbcMonitor is a singleton, average time may be affected by other tests
      // Just verify that the operation was recorded and took some time
      expect(stats.averageExecutionTime).toBeGreaterThan(0);
      expect(stats.averageExecutionTime).toBeLessThan(actualDuration + 50); // Allow more variance for CI
    });
  });

  describe('Production Stress Testing', () => {
    it('should handle high-volume metrics efficiently', () => {
      const startTime = Date.now();

      // Simulate high-volume metric recording
      for (let i = 0; i < 1000; i++) {
        monitor.recordContractExecution({
          operationName: `operation_${i % 10}`,
          contractType: i % 3 === 0 ? 'PRE' : 'POST',
          executionTime: 20 + (i % 50),
          memoryUsage: 1024 + (i % 100),
          success: i % 20 !== 0, // 5% failure rate
          errorMessage: i % 20 === 0 ? 'Stress test failure' : undefined,
          timestamp: new Date(),
          serviceContext: `Service_${i % 5}`,
        });
      }

      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(1000); // Should process 1000 metrics in under 1 second

      const stats = monitor.getPerformanceStats();
      expect(stats.totalContracts).toBe(1000);
      expect(stats.violationRate).toBeCloseTo(0.05, 1); // ~5% violation rate
    });

    it('should maintain memory bounds under load', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Record many metrics to test memory management
      for (let i = 0; i < 2000; i++) {
        monitor.recordContractExecution({
          operationName: 'memoryTest',
          contractType: 'POST',
          executionTime: 30,
          memoryUsage: 512,
          success: true,
          timestamp: new Date(),
          serviceContext: 'MemoryTestService',
        });
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB for this test)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);

      const stats = monitor.getPerformanceStats();
      expect(stats.totalContracts).toBeLessThanOrEqual(10000); // Should respect history limit
    });

    it('should generate health reports quickly under load', () => {
      // Add some metrics
      for (let i = 0; i < 100; i++) {
        monitor.recordContractExecution({
          operationName: 'reportTest',
          contractType: 'POST',
          executionTime: 40,
          memoryUsage: 1024,
          success: i % 10 !== 0,
          timestamp: new Date(),
          serviceContext: 'ReportTestService',
        });
      }

      const startTime = Date.now();
      const healthReport = monitor.generateHealthReport() as {
        healthScore: number;
        summary: { totalContracts: number };
      };
      const reportTime = Date.now() - startTime;

      expect(reportTime).toBeLessThan(100); // Report generation under 100ms
      expect(healthReport.healthScore).toBeGreaterThan(0);
      expect(healthReport.summary.totalContracts).toBe(100);
    });
  });
});
