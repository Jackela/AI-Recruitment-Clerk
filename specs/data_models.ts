// 核心数据模型与模式 (TypeScript Interfaces)

/**
 * @description 从简历中解析出的结构化数据
 */
export interface ResumeDTO {
  contactInfo: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  skills: string[];
  workExperience: {
    company: string;
    position: string;
    startDate: string; // ISO 8601 Date
    endDate: string;   // ISO 8601 Date or "present"
    summary: string;
  }[];
  education: {
    school: string;
    degree: string;
    major: string | null;
  }[];
}

/**
 * @description NATS 事件: job.resume.submitted
 */
export interface ResumeSubmittedEvent {
  jobId: string;
  resumeId: string;
  originalFilename: string;
  tempGridFsUrl: string; // 用于内部服务访问的临时URL
}
