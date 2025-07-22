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