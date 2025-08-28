# BDD 特性文件
Feature: 简历提交与处理
  作为一名HR，我希望能为岗位批量上传简历，以便系统能自动进行分析。

  Scenario: 成功上传多份简历
    Given 招聘岗位 "高级Python工程师" (ID: "job-123") 已存在
    When 我向 "/jobs/job-123/resumes" 端点上传了 3 份有效的PDF简历
    Then 响应状态码应为 202
    And 响应体中的 "submittedResumes" 字段值应为 3
    And 系统应为这 3 份简历分别发布 "job.resume.submitted" 事件
