export class JobDetailDto {
  id: string;
  title: string;
  jdText: string;
  status: 'processing' | 'completed';
  createdAt: Date;
  resumeCount: number;

  constructor(
    id: string,
    title: string,
    jdText: string,
    status: 'processing' | 'completed',
    createdAt: Date,
    resumeCount = 0,
  ) {
    this.id = id;
    this.title = title;
    this.jdText = jdText;
    this.status = status;
    this.createdAt = createdAt;
    this.resumeCount = resumeCount;
  }
}

export class JobListDto {
  id: string;
  title: string;
  status: 'processing' | 'completed';
  createdAt: Date;
  resumeCount: number;

  constructor(
    id: string,
    title: string,
    status: 'processing' | 'completed',
    createdAt: Date,
    resumeCount = 0,
  ) {
    this.id = id;
    this.title = title;
    this.status = status;
    this.createdAt = createdAt;
    this.resumeCount = resumeCount;
  }
}
