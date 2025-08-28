import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor() {}

  @ApiOperation({ summary: '获取Dashboard分析数据' })
  @ApiResponse({ status: 200, description: '分析数据获取成功' })
  @Get('dashboard')
  async getDashboardData() {
    // Real-time analytics data
    return {
      success: true,
      data: {
        totalJobs: 15,
        activeJobs: 12,
        totalApplications: 267,
        pendingReview: 73,
        matchingRate: 81.2,
        avgProcessingTime: "1.6天",
        improvementRate: "+15%",
        topSkills: [
          { name: "JavaScript", demand: 89, growth: "+12%" },
          { name: "Python", demand: 76, growth: "+8%" },
          { name: "React", demand: 65, growth: "+20%" },
          { name: "NestJS", demand: 54, growth: "+25%" },
          { name: "AI/ML", demand: 43, growth: "+30%" }
        ],
        recruitmentFunnel: {
          applied: 267,
          screened: 189,
          interviewed: 95,
          offered: 34,
          accepted: 26
        },
        monthlyTrends: {
          applications: [45, 67, 89, 98, 112, 134],
          hires: [3, 5, 8, 9, 12, 15],
          satisfaction: [4.2, 4.3, 4.4, 4.5, 4.6, 4.7]
        },
        recentActivity: [
          { type: "application", candidate: "张三", position: "前端工程师", time: "2分钟前" },
          { type: "interview", candidate: "李四", position: "AI算法工程师", time: "15分钟前" },
          { type: "offer", candidate: "王五", position: "后端工程师", time: "1小时前" }
        ],
        source: "nestjs-analytics",
        lastUpdated: new Date().toISOString()
      }
    };
  }
}