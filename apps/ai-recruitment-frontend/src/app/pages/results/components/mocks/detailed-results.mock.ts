import {
  ExperienceDetail,
  EducationDetails,
  DetailedAnalysisResult,
} from '../../../interfaces/detailed-analysis.interface';

/**
 * Mock analysis result for development/testing.
 */
export const getMockAnalysisResult = (
  sessionId: string,
): DetailedAnalysisResult =>
  ({
    sessionId,
    candidateName: '张三',
    candidateEmail: 'zhangsan@example.com',
    targetPosition: '前端开发工程师',
    analysisTime: '2024-01-15T10:30:00Z',
    score: 85,
    summary: '该候选人具有优秀的前端开发技能',
    keySkills: ['JavaScript', 'TypeScript', 'Angular', 'React', 'Vue.js'],
    experience: '5年前端开发经验',
    education: '计算机科学学士学位',
    recommendations: [
      '技术栈匹配度高，适合高级前端开发岗位',
      '建议进行技术面试验证实际能力',
      '可以考虑架构设计相关的技术考察',
    ],
    skillAnalysis: {
      technical: 90,
      communication: 75,
      problemSolving: 88,
      teamwork: 82,
      leadership: 70,
    },
    experienceDetails: [
      {
        company: 'ABC科技公司',
        position: '高级前端工程师',
        duration: '2021-2024',
        description: '负责企业级Web应用开发',
      },
      {
        company: 'XYZ创业公司',
        position: '前端工程师',
        duration: '2019-2021',
        description: '参与产品从0到1的开发过程',
      },
    ],
    educationDetails: {
      degree: '学士',
      major: '计算机科学与技术',
      university: '清华大学',
      graduationYear: '2019',
    },
    strengths: [
      '技术栈覆盖面广，掌握多种前端框架',
      '有丰富的项目实战经验',
      '学习能力强，能快速适应新技术',
    ],
    improvements: [
      '可以加强团队领导能力的培养',
      '建议深入学习后端技术，成为全栈开发者',
      '可以参与开源项目，提升技术影响力',
    ],
    reportUrl: `http://localhost:3000/api/reports/${sessionId}`,
  }) as DetailedAnalysisResult;
