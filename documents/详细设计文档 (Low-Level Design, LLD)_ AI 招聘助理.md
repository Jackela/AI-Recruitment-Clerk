# **详细设计文档 (Low-Level Design, LLD): AI 招聘助理**

版本: 1.0  
发布日期: 2025-07-22  
关联文档: 概要设计文档 (HLD) v1.0

### **1\. 引言 (Introduction)**

本《详细设计文档》为“AI 招聘助理”项目的具体实现提供了详细的技术规格。它基于 HLD v1.0 的架构蓝图，对每个模块的接口、数据模型、核心算法和内部逻辑进行了深入定义，旨在指导开发团队进行编码和实现。

### **2\. 数据库设计 (Database Schema \- MongoDB)**

#### **2.1. jobs 集合**

* **描述**: 存储招聘岗位（Job）的核心信息。  
* **Schema**:  
  {  
    \_id: ObjectId,          // 岗位唯一ID  
    title: string,          // 岗位名称, e.g., "高级 Python 工程师"  
    jdText: string,         // 原始的 JD 纯文本  
    jdDto: JdDTO,           // 解析后的结构化 JD 数据  
    status: "processing" | "completed", // JD 解析状态  
    createdAt: Date,  
    updatedAt: Date  
  }

#### **2.2. resumes 集合**

* **描述**: 存储每份简历的核心信息和分析结果。  
* **Schema**:  
  {  
    \_id: ObjectId,          // 简历唯一ID  
    jobId: ObjectId,        // 关联的岗位ID (FK to jobs.\_id)  
    originalFilename: string, // 上传时的原始文件名  
    gridFsId: ObjectId,     // 在 GridFS 中的文件ID (FK to fs.files)  
    status: "pending" | "parsing" | "scoring" | "completed" | "failed",  
    errorMessage?: string,    // 如果处理失败，记录错误信息  
    resumeDto: ResumeDTO,   // 解析后的结构化简历数据  
    scoreDto: ScoreDTO,     // 匹配得分详情  
    reportGridFsId?: ObjectId, // 生成的报告在 GridFS 中的文件ID  
    createdAt: Date,  
    updatedAt: Date  
  }

#### **2.3. GridFS 文件存储**

* **fs.files & fs.chunks**: 由 MongoDB 自动管理。  
* **用途**:  
  1. 存储用户上传的原始简历 PDF 文件。  
  2. 存储由 report-generator-svc 生成的最终 Markdown 格式分析报告。

### **3\. 数据传输对象 (DTO) / 事件负载定义**

以下是微服务间通过 NATS 传递的核心数据结构，将使用 io-ts 或 zod 进行定义和校验。

#### **3.1. JdDTO**

* **描述**: 结构化的岗位要求。  
* **Schema**:  
  interface JdDTO {  
    requiredSkills: { name: string, weight: number }\[\]; // e.g., { name: 'Python', weight: 1.0 }  
    experienceYears: { min: number, max: number }; // e.g., { min: 3, max: 5 }  
    educationLevel: "bachelor" | "master" | "phd" | "any";  
    softSkills: string\[\]; // e.g., \['teamwork', 'communication'\]  
  }

#### **3.2. ResumeDTO**

* **描述**: 结构化的简历信息。  
* **Schema**:  
  interface WorkExperience {  
    company: string;  
    position: string;  
    startDate: Date;  
    endDate: Date | "present";  
    summary: string;  
  }

  interface ResumeDTO {  
    contactInfo: { name: string, email: string, phone: string };  
    skills: string\[\];  
    workExperience: WorkExperience\[\];  
    education: { school: string, degree: string, major: string }\[\];  
  }

#### **3.3. ScoreDTO**

* **描述**: 详细的匹配得分。  
* **Schema**:  
  interface ScoreComponent {  
    score: number; // 0-1 scale  
    details: string;  
  }

  interface ScoreDTO {  
    overallScore: number; // Weighted average, 0-100 scale  
    skillScore: ScoreComponent;  
    experienceScore: ScoreComponent;  
    educationScore: ScoreComponent;  
  }

### **4\. API 详细规格 (app-gateway)**

使用 OpenAPI 3.0 规范进行定义。

#### **POST /jobs**

* **Summary**: 创建一个新岗位。  
* **Request Body**:  
  * Content-Type: application/json  
  * **Schema**: { "jobTitle": "string", "jdText": "string" }  
* **Responses**:  
  * 202 Accepted: { "jobId": "string", "message": "Job received..." }  
  * 400 Bad Request: 请求体验证失败。

#### **POST /jobs/{jobId}/resumes**

* **Summary**: 为岗位批量上传简历。  
* **Path Parameter**: jobId: string  
* **Request Body**:  
  * Content-Type: multipart/form-data  
  * **Form Data**: files: Binary\[\] (多文件上传)  
* **Responses**:  
  * 202 Accepted: { "jobId": "string", "submittedResumes": number, ... }  
  * 404 Not Found: jobId 不存在。

### **5\. 关键模块内部逻辑设计**

#### **5.1. scoring-engine-svc 核心算法伪代码**

// Function to calculate the final score for a resume against a JD  
function calculateMatchScore(jdDto: JdDTO, resumeDto: ResumeDTO): ScoreDTO {  
    
  // 1\. Calculate Skill Score  
  const jdSkills \= new Set(jdDto.requiredSkills.map(s \=\> s.name.toLowerCase()));  
  const resumeSkills \= new Set(resumeDto.skills.map(s \=\> s.toLowerCase()));  
  const intersection \= new Set(\[...jdSkills\].filter(s \=\> resumeSkills.has(s)));  
  const skillScoreValue \= jdSkills.size \> 0 ? intersection.size / jdSkills.size : 0;

  // 2\. Calculate Experience Score  
  const totalResumeExperience \= calculateTotalExperience(resumeDto.workExperience); // in years  
  let experienceScoreValue \= 0;  
  if (totalResumeExperience \>= jdDto.experienceYears.min) {  
    experienceScoreValue \= 1.0;  
  } else {  
    experienceScoreValue \= totalResumeExperience / jdDto.experienceYears.min;  
  }

  // 3\. Calculate Education Score  
  // (Simplified logic: assumes numerical mapping for degrees)  
  const educationScoreValue \= compareEducation(jdDto.educationLevel, resumeDto.education);

  // 4\. Aggregate with weights  
  const weights \= { skill: 0.5, experience: 0.3, education: 0.2 };  
  const overallScore \= (skillScoreValue \* weights.skill \+  
                       experienceScoreValue \* weights.experience \+  
                       educationScoreValue \* weights.education) \* 100;

  // 5\. Construct and return ScoreDTO  
  return {  
    overallScore: Math.round(overallScore),  
    skillScore: { score: skillScoreValue, details: \`${intersection.size} of ${jdSkills.size} skills matched.\` },  
    // ... other scores  
  };  
}  
