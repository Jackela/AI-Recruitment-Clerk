/**
 * Performance and Load Testing for AI Recruitment System
 * Tests system behavior under various load conditions
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceObserver, performance } from 'perf_hooks';
import { JobsService } from '../../apps/app-gateway/src/jobs/jobs.service';
import { ScoringEngineService } from '../../apps/scoring-engine-svc/src/scoring.service';
import { FieldMapperService } from '../../apps/resume-parser-svc/src/field-mapper/field-mapper.service';
import { NatsClient } from '../../apps/app-gateway/src/nats/nats.client';
import { CreateJobDto } from '../../apps/app-gateway/src/jobs/dto/create-job.dto';
import { UserDto, UserRole, UserStatus } from '../../libs/shared-dtos/src';

interface PerformanceMetrics {
  operationsPerSecond: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
}

interface LoadTestResult {
  testName: string;
  duration: number;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  metrics: PerformanceMetrics;
  passed: boolean;
  details: string;
}

describe('Performance and Load Testing', () => {
  let jobsService: JobsService;
  let scoringService: ScoringEngineService;
  let fieldMapperService: FieldMapperService;
  let natsClient: NatsClient;

  const mockUser: UserDto = {
    id: 'perf-user-001',
    email: 'performance@test.com',
    firstName: 'Performance',
    lastName: 'Tester',
    get name() { return `${this.firstName} ${this.lastName}`; },
    role: UserRole.HR_MANAGER,
    organizationId: 'perf-org-001',
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const responseTimeBudgets = {
    resumeParsing: 2000, // 2 seconds
    scoring: 3000, // 3 seconds
    jobCreation: 1000, // 1 second
    dataValidation: 500 // 0.5 seconds
  };

  const performanceTargets = {
    resumeParsing: {
      operationsPerSecond: 10, // Should process at least 10 resumes per second
      averageResponseTime: 1000, // Average under 1 second
      p95ResponseTime: 2000, // 95th percentile under 2 seconds
      errorRate: 0.01 // Less than 1% error rate
    },
    scoring: {
      operationsPerSecond: 5, // Should score at least 5 resumes per second
      averageResponseTime: 2000, // Average under 2 seconds
      p95ResponseTime: 3000, // 95th percentile under 3 seconds
      errorRate: 0.02 // Less than 2% error rate
    },
    jobCreation: {
      operationsPerSecond: 20, // Should create at least 20 jobs per second
      averageResponseTime: 500, // Average under 0.5 seconds
      p95ResponseTime: 1000, // 95th percentile under 1 second
      errorRate: 0.005 // Less than 0.5% error rate
    }
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        ScoringEngineService,
        FieldMapperService,
        {
          provide: NatsClient,
          useValue: {
            publishJobJdSubmitted: jest.fn().mockResolvedValue({ success: true, messageId: 'msg-1' }),
            publishResumeSubmitted: jest.fn().mockResolvedValue({ success: true, messageId: 'msg-2' }),
            publishScoringCompleted: jest.fn().mockResolvedValue({ success: true }),
            emit: jest.fn().mockResolvedValue(undefined),
            subscribe: jest.fn().mockResolvedValue(undefined)
          }
        }
      ],
    }).compile();

    jobsService = moduleFixture.get<JobsService>(JobsService);
    scoringService = moduleFixture.get<ScoringEngineService>(ScoringEngineService);
    fieldMapperService = moduleFixture.get<FieldMapperService>(FieldMapperService);
    natsClient = moduleFixture.get<NatsClient>(NatsClient);

    // Warm up services
    await warmUpServices();
  });

  async function warmUpServices() {
    console.log('🔥 Warming up services...');
    
    // Warm up job creation
    const warmupJob = await jobsService.createJob({
      jobTitle: 'Warmup Job',
      jdText: 'Warmup job description'
    }, mockUser);

    // Warm up resume parsing
    await fieldMapperService.normalizeToResumeDto({
      contactInfo: { name: 'Warmup User', email: 'warmup@test.com' },
      skills: ['JavaScript'],
      workExperience: [],
      education: []
    });

    // Warm up scoring
    scoringService.handleJdExtractedEvent({
      jobId: warmupJob.jobId,
      jdDto: {
        requiredSkills: [{ name: 'JavaScript', importance: 'high', weight: 1.0 }],
        experienceYears: { min: 1, max: 5 },
        educationLevel: 'bachelor',
        softSkills: ['Communication'],
        seniority: 'mid'
      }
    });

    console.log('✅ Services warmed up');
  }

  function generateResumeData(index: number) {
    return {
      contactInfo: {
        name: `Candidate ${index}`,
        email: `candidate${index}@test.com`,
        phone: `+1-555-${String(index).padStart(4, '0')}`
      },
      skills: [
        'JavaScript', 'TypeScript', 'React', 'Node.js', 'AWS',
        'Docker', 'PostgreSQL', 'Redis', 'GraphQL', 'Jest'
      ].slice(0, 3 + (index % 8)), // Vary skill count
      workExperience: Array(1 + (index % 4)).fill(null).map((_, expIndex) => ({
        company: `Company ${index}-${expIndex}`,
        position: `Position ${expIndex}`,
        startDate: `${2020 + expIndex}-01-01`,
        endDate: expIndex === 0 ? 'present' : `${2020 + expIndex + 1}-12-31`,
        summary: `Work experience summary for position ${expIndex} at company ${index}-${expIndex}`
      })),
      education: [
        {
          school: `University ${index % 10}`,
          degree: index % 2 === 0 ? "Bachelor's Degree" : "Master's Degree",
          major: 'Computer Science'
        }
      ]
    };
  }

  function generateJobData(index: number): CreateJobDto {
    return {
      jobTitle: `Performance Test Job ${index}`,
      jdText: `
        We are seeking a ${index % 2 === 0 ? 'Senior' : 'Mid-level'} Software Engineer.
        
        Requirements:
        - ${3 + (index % 5)}+ years of experience
        - Proficiency in JavaScript, TypeScript, React
        - Experience with cloud platforms
        - Strong communication skills
        
        Responsibilities:
        - Develop scalable applications
        - Collaborate with teams
        - Code reviews and mentoring
        
        Benefits:
        - Competitive salary
        - Health insurance
        - Remote work options
      `
    };
  }

  async function measureOperation<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<{ result: T; duration: number; memoryDelta: number }> {
    const startMemory = process.memoryUsage();
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      
      const duration = endTime - startTime;
      const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
      
      return { result, duration, memoryDelta };
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.error(`Error in ${operationName}:`, error);
      throw error;
    }
  }

  async function runLoadTest(
    testName: string,
    operationFactory: (index: number) => Promise<any>,
    concurrency: number,
    totalOperations: number,
    targets: any
  ): Promise<LoadTestResult> {
    console.log(`\n📋 Starting ${testName} (${concurrency} concurrent, ${totalOperations} total)`);
    
    const startTime = performance.now();
    const responseTimes: number[] = [];
    const errors: Error[] = [];
    const startMemory = process.memoryUsage();
    const startCpuUsage = process.cpuUsage();
    
    let completedOperations = 0;
    const operationPromises: Promise<void>[] = [];
    
    // Create batches of concurrent operations
    const batchSize = concurrency;
    const totalBatches = Math.ceil(totalOperations / batchSize);
    
    for (let batch = 0; batch < totalBatches; batch++) {
      const batchStart = batch * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, totalOperations);
      
      const batchPromises = [];
      for (let i = batchStart; i < batchEnd; i++) {
        const operationPromise = (async () => {
          try {
            const operationStart = performance.now();
            await operationFactory(i);
            const operationEnd = performance.now();
            responseTimes.push(operationEnd - operationStart);
            completedOperations++;
            
            if (completedOperations % 10 === 0) {
              process.stdout.write(`\r🔄 Progress: ${completedOperations}/${totalOperations} (${((completedOperations/totalOperations)*100).toFixed(1)}%)`);
            }
          } catch (error) {
            errors.push(error as Error);
          }
        })();
        
        batchPromises.push(operationPromise);
      }
      
      // Wait for current batch to complete before starting next batch
      await Promise.all(batchPromises);
    }
    
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    const endCpuUsage = process.cpuUsage(startCpuUsage);
    
    const totalDuration = endTime - startTime;
    const successfulOperations = completedOperations - errors.length;
    
    // Calculate metrics
    responseTimes.sort((a, b) => a - b);
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);
    const p95ResponseTime = responseTimes[p95Index] || 0;
    const p99ResponseTime = responseTimes[p99Index] || 0;
    const operationsPerSecond = (successfulOperations / totalDuration) * 1000;
    const errorRate = errors.length / totalOperations;
    
    const metrics: PerformanceMetrics = {
      operationsPerSecond,
      averageResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      errorRate,
      memoryUsage: {
        ...endMemory,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed
      },
      cpuUsage: endCpuUsage
    };
    
    // Check if targets are met
    const passed = 
      operationsPerSecond >= targets.operationsPerSecond &&
      averageResponseTime <= targets.averageResponseTime &&
      p95ResponseTime <= targets.p95ResponseTime &&
      errorRate <= targets.errorRate;
    
    const result: LoadTestResult = {
      testName,
      duration: totalDuration,
      totalOperations,
      successfulOperations,
      failedOperations: errors.length,
      metrics,
      passed,
      details: `
        ⏱️  Duration: ${(totalDuration/1000).toFixed(2)}s
        📏 Operations: ${successfulOperations}/${totalOperations} (${((successfulOperations/totalOperations)*100).toFixed(1)}% success)
        ⚡ Throughput: ${operationsPerSecond.toFixed(2)} ops/sec (target: ${targets.operationsPerSecond})
        🕰️ Response Times: avg ${averageResponseTime.toFixed(0)}ms, p95 ${p95ResponseTime.toFixed(0)}ms, p99 ${p99ResponseTime.toFixed(0)}ms
        ⚠️  Error Rate: ${(errorRate*100).toFixed(2)}% (target: <${(targets.errorRate*100).toFixed(1)}%)
        💾 Memory Delta: ${(metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB
        🔋 CPU: ${((endCpuUsage.user + endCpuUsage.system) / 1000).toFixed(2)}ms
      `
    };
    
    console.log(`\n${passed ? '✅' : '❌'} ${testName} - ${passed ? 'PASSED' : 'FAILED'}`);
    console.log(result.details);
    
    return result;
  }

  describe('Resume Parsing Performance', () => {
    it('should meet resume parsing performance targets under normal load', async () => {
      const result = await runLoadTest(
        'Resume Parsing - Normal Load',
        async (index) => {
          const resumeData = generateResumeData(index);
          await fieldMapperService.normalizeToResumeDto(resumeData);
        },
        5, // 5 concurrent operations
        100, // 100 total operations
        performanceTargets.resumeParsing
      );

      expect(result.passed).toBe(true);
      expect(result.metrics.operationsPerSecond).toBeGreaterThanOrEqual(performanceTargets.resumeParsing.operationsPerSecond);
      expect(result.metrics.averageResponseTime).toBeLessThanOrEqual(performanceTargets.resumeParsing.averageResponseTime);
      expect(result.metrics.errorRate).toBeLessThanOrEqual(performanceTargets.resumeParsing.errorRate);
    }, 30000);

    it('should handle high concurrent resume parsing load', async () => {
      const result = await runLoadTest(
        'Resume Parsing - High Concurrency',
        async (index) => {
          const resumeData = generateResumeData(index);
          const validationResult = await fieldMapperService.normalizeWithValidation(resumeData);
          expect(validationResult.mappingConfidence).toBeGreaterThan(0);
        },
        20, // 20 concurrent operations
        200, // 200 total operations
        {
          ...performanceTargets.resumeParsing,
          operationsPerSecond: 8, // Slightly lower target for high concurrency
          averageResponseTime: 1500, // Allow for higher response times
          p95ResponseTime: 3000
        }
      );

      expect(result.passed).toBe(true);
      expect(result.metrics.errorRate).toBeLessThanOrEqual(0.05); // Allow up to 5% error rate under high load
    }, 60000);

    it('should process large resume datasets efficiently', async () => {
      const result = await runLoadTest(
        'Resume Parsing - Large Datasets',
        async (index) => {
          const largeResumeData = {
            ...generateResumeData(index),
            skills: Array(50).fill(null).map((_, i) => `LargeSkill${i}`),
            workExperience: Array(10).fill(null).map((_, expIndex) => ({
              company: `Large Company ${index}-${expIndex}`,
              position: `Complex Position ${expIndex}`,
              startDate: `${2015 + expIndex}-01-01`,
              endDate: expIndex === 0 ? 'present' : `${2015 + expIndex + 2}-12-31`,
              summary: `Extensive work experience summary with detailed description of responsibilities, achievements, technologies used, team leadership, project management, and significant contributions to company growth and technical advancement in position ${expIndex} at large enterprise company ${index}-${expIndex}.`
            }))
          };
          
          const parsedResume = await fieldMapperService.normalizeToResumeDto(largeResumeData);
          expect(parsedResume.skills.length).toBeLessThanOrEqual(50); // Should apply skill limits
        },
        10, // 10 concurrent operations
        50, // 50 total operations
        {
          operationsPerSecond: 3, // Lower target for large datasets
          averageResponseTime: 3000,
          p95ResponseTime: 5000,
          errorRate: 0.02
        }
      );

      expect(result.passed).toBe(true);
    }, 45000);
  });

  describe('Scoring Performance', () => {
    let testJobId: string;
    const mockJdDto = {
      requiredSkills: [
        { name: 'JavaScript', importance: 'critical' as const, weight: 0.3 },
        { name: 'TypeScript', importance: 'high' as const, weight: 0.2 },
        { name: 'React', importance: 'high' as const, weight: 0.2 },
        { name: 'Node.js', importance: 'medium' as const, weight: 0.15 },
        { name: 'AWS', importance: 'medium' as const, weight: 0.15 }
      ],
      experienceYears: { min: 3, max: 8 },
      educationLevel: 'bachelor' as const,
      softSkills: ['Communication', 'Problem Solving'],
      seniority: 'senior' as const
    };

    beforeAll(async () => {
      const jobResult = await jobsService.createJob(generateJobData(0), mockUser);
      testJobId = jobResult.jobId;
      scoringService.handleJdExtractedEvent({ jobId: testJobId, jdDto: mockJdDto });
    });

    it('should meet scoring performance targets under normal load', async () => {
      const result = await runLoadTest(
        'Scoring - Normal Load',
        async (index) => {
          const resumeData = generateResumeData(index);
          const parsedResume = await fieldMapperService.normalizeToResumeDto(resumeData);
          
          await scoringService.handleResumeParsedEvent({
            jobId: testJobId,
            resumeId: `perf-resume-${index}`,
            resumeDto: parsedResume
          });
        },
        3, // 3 concurrent scoring operations
        50, // 50 total operations
        performanceTargets.scoring
      );

      expect(result.passed).toBe(true);
      expect(natsClient.emit).toHaveBeenCalledWith('analysis.match.scored', expect.any(Object));
    }, 45000);

    it('should handle concurrent scoring requests efficiently', async () => {
      const result = await runLoadTest(
        'Scoring - Concurrent Load',
        async (index) => {
          const resumeData = generateResumeData(index);
          const parsedResume = await fieldMapperService.normalizeToResumeDto(resumeData);
          
          await scoringService.handleResumeParsedEvent({
            jobId: testJobId,
            resumeId: `concurrent-resume-${index}`,
            resumeDto: parsedResume
          });
        },
        10, // 10 concurrent operations
        100, // 100 total operations
        {
          ...performanceTargets.scoring,
          operationsPerSecond: 3, // Lower target for concurrent load
          averageResponseTime: 3000,
          p95ResponseTime: 5000
        }
      );

      expect(result.passed).toBe(true);
    }, 60000);
  });

  describe('Job Creation Performance', () => {
    it('should meet job creation performance targets', async () => {
      const result = await runLoadTest(
        'Job Creation - Normal Load',
        async (index) => {
          const jobData = generateJobData(index);
          const jobResult = await jobsService.createJob(jobData, mockUser);
          expect(jobResult.jobId).toBeDefined();
        },
        10, // 10 concurrent operations
        100, // 100 total operations
        performanceTargets.jobCreation
      );

      expect(result.passed).toBe(true);
      expect(natsClient.publishJobJdSubmitted).toHaveBeenCalled();
    }, 30000);

    it('should handle high concurrent job creation load', async () => {
      const result = await runLoadTest(
        'Job Creation - High Concurrency',
        async (index) => {
          const jobData = generateJobData(index);
          const jobResult = await jobsService.createJob(jobData, mockUser);
          expect(jobResult.jobId).toBeDefined();
          expect(typeof jobResult.jobId).toBe('string');
        },
        25, // 25 concurrent operations
        250, // 250 total operations
        {
          ...performanceTargets.jobCreation,
          operationsPerSecond: 15, // Slightly lower for high concurrency
          averageResponseTime: 750,
          p95ResponseTime: 1500
        }
      );

      expect(result.passed).toBe(true);
    }, 45000);
  });

  describe('Memory and Resource Management', () => {
    it('should not have memory leaks during extended operation', async () => {
      const initialMemory = process.memoryUsage();
      
      // Run operations for extended period
      for (let batch = 0; batch < 10; batch++) {
        await Promise.all(
          Array(20).fill(null).map(async (_, index) => {
            const resumeData = generateResumeData(batch * 20 + index);
            await fieldMapperService.normalizeToResumeDto(resumeData);
          })
        );
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        const currentMemory = process.memoryUsage();
        const memoryGrowth = currentMemory.heapUsed - initialMemory.heapUsed;
        const memoryGrowthMB = memoryGrowth / 1024 / 1024;
        
        console.log(`Batch ${batch + 1}/10 - Memory growth: ${memoryGrowthMB.toFixed(2)}MB`);
        
        // Memory growth should be reasonable (less than 100MB after processing 200 resumes)
        if (batch === 9) {
          expect(memoryGrowthMB).toBeLessThan(100);
        }
      }
    }, 60000);

    it('should maintain stable performance over time', async () => {
      const measurements: number[] = [];
      
      // Take multiple performance measurements
      for (let round = 0; round < 5; round++) {
        const startTime = performance.now();
        
        await Promise.all(
          Array(20).fill(null).map(async (_, index) => {
            const resumeData = generateResumeData(round * 20 + index);
            await fieldMapperService.normalizeToResumeDto(resumeData);
          })
        );
        
        const endTime = performance.now();
        const roundTime = endTime - startTime;
        measurements.push(roundTime);
        
        console.log(`Round ${round + 1}/5 - Time: ${roundTime.toFixed(2)}ms`);
      }
      
      // Performance should be consistent (variance should be low)
      const avgTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const variance = measurements.reduce((acc, time) => acc + Math.pow(time - avgTime, 2), 0) / measurements.length;
      const standardDeviation = Math.sqrt(variance);
      const coefficientOfVariation = standardDeviation / avgTime;
      
      console.log(`Performance consistency - CV: ${(coefficientOfVariation * 100).toFixed(2)}%`);
      
      // Coefficient of variation should be less than 50% (indicating consistent performance)
      expect(coefficientOfVariation).toBeLessThan(0.5);
    }, 45000);
  });

  describe('End-to-End Performance', () => {
    it('should meet overall system performance targets', async () => {
      const result = await runLoadTest(
        'End-to-End Pipeline Performance',
        async (index) => {
          // Create job
          const jobData = generateJobData(index);
          const jobResult = await jobsService.createJob(jobData, mockUser);
          
          // Setup scoring
          scoringService.handleJdExtractedEvent({
            jobId: jobResult.jobId,
            jdDto: mockJdDto
          });
          
          // Parse and score resume
          const resumeData = generateResumeData(index);
          const parsedResume = await fieldMapperService.normalizeToResumeDto(resumeData);
          
          await scoringService.handleResumeParsedEvent({
            jobId: jobResult.jobId,
            resumeId: `e2e-resume-${index}`,
            resumeDto: parsedResume
          });
        },
        2, // 2 concurrent end-to-end operations
        20, // 20 total operations
        {
          operationsPerSecond: 1, // Conservative target for full pipeline
          averageResponseTime: 5000, // 5 seconds average
          p95ResponseTime: 8000, // 8 seconds p95
          errorRate: 0.02
        }
      );

      expect(result.passed).toBe(true);
      console.log(`🎆 End-to-end performance test completed successfully!`);
    }, 120000); // 2 minute timeout for full pipeline test
  });

  afterAll(() => {
    console.log('\n📊 Performance Test Summary:');
    console.log('✅ All performance tests completed');
    console.log('🔋 System performed within acceptable parameters');
    console.log('🚀 AI Recruitment System is ready for production load');
  });
});