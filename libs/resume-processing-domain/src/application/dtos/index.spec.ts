import type { ResumeDTO, ResumeDto } from '@ai-recruitment-clerk/resume-dto';

describe('Application DTOs Index', () => {
  it('should export ResumeDTO type', () => {
    const dto: ResumeDTO = {
      contactInfo: { name: 'Test', email: 'test@example.com', phone: null },
      skills: [],
      workExperience: [],
      education: [],
    };
    expect(dto.contactInfo.name).toBe('Test');
  });

  it('should export ResumeDto type alias', () => {
    const dto: ResumeDto = {
      contactInfo: { name: 'Test', email: 'test@example.com', phone: null },
      skills: [],
      workExperience: [],
      education: [],
    };
    expect(dto.contactInfo.email).toBe('test@example.com');
  });
});
