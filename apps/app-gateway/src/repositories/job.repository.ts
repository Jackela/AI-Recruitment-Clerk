import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job, JobDocument } from '../schemas/job.schema';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class JobRepository {
  private readonly logger = new Logger(JobRepository.name);

  constructor(
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    private readonly cacheService: CacheService,
  ) {}

  async create(jobData: Partial<Job>): Promise<JobDocument> {
    try {
      const createdJob = new this.jobModel({
        ...jobData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const savedJob = await createdJob.save();
      this.logger.log(`Created job with ID: ${savedJob._id}`);
      
      // 清除相关缓存
      await this.invalidateJobCaches(savedJob);
      
      return savedJob;
    } catch (error) {
      this.logger.error('Error creating job:', error);
      throw error;
    }
  }

  async findById(id: string): Promise<JobDocument | null> {
    const cacheKey = this.cacheService.generateKey('db', 'job', 'id', id);
    
    return this.cacheService.wrap(
      cacheKey,
      async () => {
        try {
          const job = await this.jobModel.findById(id).exec();
          this.logger.debug(`Database query: findById ${id}, found: ${!!job}`);
          return job;
        } catch (error) {
          this.logger.error(`Error finding job by ID ${id}:`, error);
          throw error;
        }
      },
      { ttl: 300000 } // 5分钟缓存(300000毫秒)，职位数据变化不频繁
    );
  }

  async findAll(options: {
    status?: string;
    company?: string;
    employmentType?: string;
    limit?: number;
    skip?: number;
  } = {}): Promise<JobDocument[]> {
    // 生成基于查询参数的缓存键
    const { status, company, employmentType, limit = 100, skip = 0 } = options;
    const queryHash = Buffer.from(JSON.stringify({ status, company, employmentType, limit, skip }))
      .toString('base64')
      .substring(0, 12);
    const cacheKey = this.cacheService.generateKey('db', 'jobs', 'findAll', queryHash);
    
    return this.cacheService.wrap(
      cacheKey,
      async () => {
        try {
          const query: any = {};
          if (status) query.status = status;
          if (company) query.company = new RegExp(company, 'i');
          if (employmentType) query.employmentType = employmentType;

          const jobs = await this.jobModel
            .find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)
            .exec();
            
          this.logger.debug(`Database query: findAll with options ${JSON.stringify(options)}, found: ${jobs.length} jobs`);
          return jobs;
        } catch (error) {
          this.logger.error('Error finding jobs:', error);
          throw error;
        }
      },
      { ttl: 120000 } // 2分钟缓存(120000毫秒)，列表查询结果变化相对频繁
    );
  }

  async findByCompany(company: string, limit = 50): Promise<JobDocument[]> {
    const cacheKey = this.cacheService.generateKey('db', 'jobs', 'company', company.toLowerCase(), limit.toString());
    
    return this.cacheService.wrap(
      cacheKey,
      async () => {
        try {
          const jobs = await this.jobModel
            .find({ 
              company: new RegExp(company, 'i'),
              status: 'active'
            })
            .limit(limit)
            .sort({ createdAt: -1 })
            .exec();
            
          this.logger.debug(`Database query: findByCompany ${company}, found: ${jobs.length} jobs`);
          return jobs;
        } catch (error) {
          this.logger.error(`Error finding jobs by company ${company}:`, error);
          throw error;
        }
      },
      { ttl: 180000 } // 3分钟缓存(180000毫秒)，公司职位相对稳定
    );
  }

  async findByCreatedBy(createdBy: string, limit = 100): Promise<JobDocument[]> {
    try {
      return await this.jobModel
        .find({ createdBy })
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      this.logger.error(`Error finding jobs by creator ${createdBy}:`, error);
      throw error;
    }
  }

  async updateById(id: string, updateData: Partial<Job>): Promise<JobDocument | null> {
    try {
      const updatedJob = await this.jobModel.findByIdAndUpdate(
        id,
        { ...updateData, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).exec();
      
      if (updatedJob) {
        this.logger.log(`Updated job with ID: ${id}`);
        // 清除相关缓存
        await this.invalidateJobCaches(updatedJob);
      }
      
      return updatedJob;
    } catch (error) {
      this.logger.error(`Error updating job ${id}:`, error);
      throw error;
    }
  }

  async updateStatus(id: string, status: string): Promise<JobDocument | null> {
    try {
      return await this.updateById(id, { status });
    } catch (error) {
      this.logger.error(`Error updating job status ${id}:`, error);
      throw error;
    }
  }

  async updateJdAnalysis(
    id: string, 
    extractedKeywords: string[], 
    confidence: number
  ): Promise<JobDocument | null> {
    try {
      return await this.updateById(id, {
        extractedKeywords,
        jdExtractionConfidence: confidence,
        jdProcessedAt: new Date(),
      });
    } catch (error) {
      this.logger.error(`Error updating job JD analysis ${id}:`, error);
      throw error;
    }
  }

  async deleteById(id: string): Promise<boolean> {
    try {
      const result = await this.jobModel.findByIdAndDelete(id).exec();
      if (result) {
        this.logger.log(`Deleted job with ID: ${id}`);
        // 清除相关缓存
        await this.invalidateJobCaches(result);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Error deleting job ${id}:`, error);
      throw error;
    }
  }

  async searchByKeywords(keywords: string[], limit = 50): Promise<JobDocument[]> {
    try {
      const searchQuery = {
        $text: { $search: keywords.join(' ') },
        status: 'active'
      };

      return await this.jobModel
        .find(searchQuery)
        .limit(limit)
        .sort({ score: { $meta: 'textScore' } })
        .exec();
    } catch (error) {
      this.logger.error('Error searching jobs by keywords:', error);
      throw error;
    }
  }

  async findBySkills(skills: string[], limit = 50): Promise<JobDocument[]> {
    try {
      return await this.jobModel
        .find({ 
          skills: { $in: skills },
          status: 'active'
        })
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      this.logger.error('Error finding jobs by skills:', error);
      throw error;
    }
  }

  async countByStatus(): Promise<Record<string, number>> {
    const cacheKey = this.cacheService.generateKey('db', 'jobs', 'count', 'status');
    
    return this.cacheService.wrap(
      cacheKey,
      async () => {
        try {
          const counts = await this.jobModel.aggregate([
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 }
              }
            }
          ]).exec();

          const result: Record<string, number> = {};
          counts.forEach(item => {
            result[item._id] = item.count;
          });
          
          this.logger.debug(`Database query: countByStatus, found: ${Object.keys(result).length} statuses`);
          return result;
        } catch (error) {
          this.logger.error('Error counting jobs by status:', error);
          throw error;
        }
      },
      { ttl: 600000 } // 10分钟缓存(600000毫秒)，统计数据变化不频繁
    );
  }

  async countByCompany(): Promise<Array<{ company: string; count: number }>> {
    const cacheKey = this.cacheService.generateKey('db', 'jobs', 'count', 'company');
    
    return this.cacheService.wrap(
      cacheKey,
      async () => {
        try {
          const result = await this.jobModel.aggregate([
            { $match: { status: 'active' } },
            {
              $group: {
                _id: '$company',
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 10 },
            {
              $project: {
                company: '$_id',
                count: 1,
                _id: 0
              }
            }
          ]).exec();
          
          this.logger.debug(`Database query: countByCompany, found: ${result.length} companies`);
          return result;
        } catch (error) {
          this.logger.error('Error counting jobs by company:', error);
          throw error;
        }
      },
      { ttl: 900000 } // 15分钟缓存(900000毫秒)，公司统计数据变化很不频繁
    );
  }

  /**
   * Health check method for monitoring
   */
  async healthCheck(): Promise<{ status: string; count: number }> {
    const cacheKey = this.cacheService.generateKey('db', 'jobs', 'health');
    
    return this.cacheService.wrap(
      cacheKey,
      async () => {
        try {
          const count = await this.jobModel.countDocuments().exec();
          this.logger.debug(`Database query: healthCheck, count: ${count}`);
          return {
            status: 'healthy',
            count
          };
        } catch (error) {
          this.logger.error('Job repository health check failed:', error);
          return {
            status: 'unhealthy',
            count: -1
          };
        }
      },
      { ttl: 60000 } // 1分钟缓存(60000毫秒)，健康检查需要相对实时
    );
  }

  /**
   * Seed method for initial data
   */
  async seedSampleData(): Promise<void> {
    try {
      const existingJobs = await this.jobModel.countDocuments().exec();
      if (existingJobs > 0) {
        this.logger.log('Sample data already exists, skipping seed');
        return;
      }

      const sampleJob = {
        title: '高级 Python 工程师',
        description: '我们正在寻找一位经验丰富的Python工程师，负责后端系统开发和维护。要求具备Python、Django/FastAPI框架经验，熟悉数据库设计和性能优化。',
        requirements: [
          { skill: 'Python', level: 'required', importance: 10 },
          { skill: 'Django', level: 'required', importance: 8 },
          { skill: 'FastAPI', level: 'preferred', importance: 7 },
          { skill: 'PostgreSQL', level: 'required', importance: 7 },
          { skill: 'Redis', level: 'preferred', importance: 6 }
        ],
        skills: ['Python', 'Django', 'FastAPI', 'PostgreSQL', 'Redis'],
        company: '科技创新公司',
        location: '北京',
        employmentType: 'full-time',
        salaryMin: 25000,
        salaryMax: 40000,
        salaryCurrency: 'CNY',
        status: 'active',
        extractedKeywords: ['Python', 'Django', 'FastAPI', '后端开发', '数据库设计'],
        jdExtractionConfidence: 0.95,
        jdProcessedAt: new Date(),
        createdBy: 'admin'
      };

      await this.create(sampleJob);
      this.logger.log('Sample job data seeded successfully');
    } catch (error) {
      this.logger.error('Error seeding sample job data:', error);
      throw error;
    }
  }

  /**
   * 缓存失效辅助方法
   */
  private async invalidateJobCaches(job?: JobDocument): Promise<void> {
    try {
      // 清除列表缓存（影响 findAll 查询）
      const listKeys = [
        'db:jobs:findAll:*', // 通配符模式，需要遍历删除
      ];

      // 清除统计缓存
      await this.cacheService.del(this.cacheService.generateKey('db', 'jobs', 'count', 'status'));
      await this.cacheService.del(this.cacheService.generateKey('db', 'jobs', 'count', 'company'));
      await this.cacheService.del(this.cacheService.generateKey('db', 'jobs', 'health'));

      if (job) {
        // 清除特定职位的缓存
        await this.cacheService.del(this.cacheService.generateKey('db', 'job', 'id', job._id.toString()));
        
        // 清除公司相关缓存
        if (job.company) {
          await this.cacheService.del(this.cacheService.generateKey('db', 'jobs', 'company', job.company.toLowerCase(), '50'));
        }
      }

      this.logger.debug('Job caches invalidated successfully');
    } catch (error) {
      this.logger.warn('Error invalidating job caches:', error);
    }
  }

  /**
   * 手动清除所有职位相关缓存
   */
  async clearAllJobCaches(): Promise<void> {
    await this.invalidateJobCaches();
  }
}