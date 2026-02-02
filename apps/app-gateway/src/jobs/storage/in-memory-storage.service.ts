import { Injectable } from '@nestjs/common';
import { JobDetailDto } from '../dto/job-response.dto';
import { ResumeDetailDto } from '../dto/resume-response.dto';
import { AnalysisReportDto } from '../dto/report-response.dto';

/**
 * Provides in memory storage functionality.
 */
@Injectable()
export class InMemoryStorageService {
  private jobs = new Map<string, JobDetailDto>();
  private resumes = new Map<string, ResumeDetailDto>();
  private reports = new Map<string, AnalysisReportDto>();

  // Job operations
  /**
   * Creates job.
   * @param job - The job.
   */
  public createJob(job: JobDetailDto): void {
    this.jobs.set(job.id, job);
  }

  /**
   * Retrieves job.
   * @param jobId - The job id.
   * @returns The JobDetailDto | undefined.
   */
  public getJob(jobId: string): JobDetailDto | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Retrieves all jobs.
   * @returns The an array of JobDetailDto.
   */
  public getAllJobs(): JobDetailDto[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  /**
   * Updates job resume count.
   * @param jobId - The job id.
   */
  public updateJobResumeCount(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      const resumeCount = Array.from(this.resumes.values()).filter(
        (resume) => resume.jobId === jobId,
      ).length;
      job.resumeCount = resumeCount;
    }
  }

  // Resume operations
  /**
   * Creates resume.
   * @param resume - The resume.
   */
  public createResume(resume: ResumeDetailDto): void {
    this.resumes.set(resume.id, resume);
    this.updateJobResumeCount(resume.jobId);
  }

  /**
   * Retrieves resume.
   * @param resumeId - The resume id.
   * @returns The ResumeDetailDto | undefined.
   */
  public getResume(resumeId: string): ResumeDetailDto | undefined {
    return this.resumes.get(resumeId);
  }

  /**
   * Retrieves resumes by job id.
   * @param jobId - The job id.
   * @returns The an array of ResumeDetailDto.
   */
  public getResumesByJobId(jobId: string): ResumeDetailDto[] {
    return Array.from(this.resumes.values())
      .filter((resume) => resume.jobId === jobId)
      .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
  }

  /**
   * Updates resume with report.
   * @param resumeId - The resume id.
   * @param matchScore - The match score.
   * @param reportId - The report id.
   */
  public updateResumeWithReport(
    resumeId: string,
    matchScore: number,
    reportId: string,
  ): void {
    const resume = this.resumes.get(resumeId);
    if (resume) {
      resume.matchScore = matchScore;
      resume.reportId = reportId;
      resume.status = 'completed';
    }
  }

  // Report operations
  /**
   * Creates report.
   * @param report - The report.
   */
  public createReport(report: AnalysisReportDto): void {
    this.reports.set(report.id, report);
    // Update the related resume with the report info
    this.updateResumeWithReport(report.resumeId, report.matchScore, report.id);
  }

  /**
   * Retrieves report.
   * @param reportId - The report id.
   * @returns The AnalysisReportDto | undefined.
   */
  public getReport(reportId: string): AnalysisReportDto | undefined {
    return this.reports.get(reportId);
  }

  /**
   * Retrieves reports by job id.
   * @param jobId - The job id.
   * @returns The an array of AnalysisReportDto.
   */
  public getReportsByJobId(jobId: string): AnalysisReportDto[] {
    return Array.from(this.reports.values())
      .filter((report) => report.jobId === jobId)
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  // Utility method to seed with mock data
  /**
   * Performs the seed mock data operation.
   */
  public seedMockData(): void {
    // Create a sample job
    const sampleJob = new JobDetailDto(
      'job-1',
      '高级 Python 工程师',
      '我们正在寻找一位经验丰富的Python工程师...',
      'completed',
      new Date('2024-01-15'),
      2,
    );
    this.createJob(sampleJob);

    // Create sample resumes
    const resume1 = new ResumeDetailDto(
      'resume-1',
      'job-1',
      '张三_简历.pdf',
      'completed',
      new Date('2024-01-16'),
      '张三',
      { name: '张三', email: 'zhangsan@email.com', phone: '13800138000' },
      ['Python', 'Django', 'FastAPI', 'PostgreSQL'],
      [
        {
          company: '科技公司A',
          position: 'Python开发工程师',
          startDate: '2022-03-01',
          endDate: 'present',
          summary: '负责后端API开发和数据库设计',
        },
      ],
      [
        {
          school: '北京大学',
          degree: '学士',
          major: '计算机科学与技术',
        },
      ],
      85,
      'report-1',
    );

    const resume2 = new ResumeDetailDto(
      'resume-2',
      'job-1',
      '李四_简历.pdf',
      'completed',
      new Date('2024-01-17'),
      '李四',
      { name: '李四', email: 'lisi@email.com', phone: '13900139000' },
      ['Python', 'Flask', 'MySQL', 'Redis'],
      [
        {
          company: '互联网公司B',
          position: 'Web开发实习生',
          startDate: '2023-06-01',
          endDate: '2023-12-31',
          summary: '参与Web应用开发和维护',
        },
      ],
      [
        {
          school: '清华大学',
          degree: '学士',
          major: '软件工程',
        },
      ],
      72,
      'report-2',
    );

    this.createResume(resume1);
    this.createResume(resume2);

    // Create sample reports
    const report1 = new AnalysisReportDto(
      'report-1',
      'resume-1',
      'job-1',
      '张三',
      85,
      '具有丰富Python开发经验的资深工程师，技能匹配度高，是理想的候选人。',
      [
        '具有扎实的Python开发经验',
        '掌握主流Web框架Django和FastAPI',
        '有数据库设计和优化经验',
        '目前仍在相关岗位工作，经验连续',
      ],
      ['缺少大型项目架构经验的具体描述', '未明确展示团队协作和领导能力'],
      [],
      [
        '请详细介绍您在当前公司负责的最复杂的项目架构？',
        '您如何处理高并发场景下的性能优化？',
        '描述一次您带领团队解决技术难题的经历。',
      ],
    );

    const report2 = new AnalysisReportDto(
      'report-2',
      'resume-2',
      'job-1',
      '李四',
      72,
      '年轻有潜力的开发者，基础技能扎实，但缺乏实际工作经验。',
      [
        'Python基础扎实，掌握Flask框架',
        '有数据库操作经验',
        '学历背景优秀，学习能力强',
      ],
      [
        '工作经验较少，仅有实习经历',
        '缺少大型项目开发经验',
        '高级框架使用经验不足',
      ],
      ['工作经验相对较少，需要更多培养时间'],
      [
        '请介绍您在实习期间遇到的最大技术挑战？',
        '您如何快速学习新技术栈？',
        '对于高级Python开发工程师这个岗位，您认为自己还需要在哪些方面提升？',
      ],
    );

    this.createReport(report1);
    this.createReport(report2);
  }
}
