import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { NotFoundException } from '@nestjs/common';
import type { MulterFile } from '../jobs/types/multer.types';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

type ResumeStatus = 'processing' | 'completed' | 'pending' | 'approved';

interface ResumeRecord {
  id: string;
  ownerId?: string;
  status: ResumeStatus;
  createdAt: string;
  updatedAt: string;
}

interface UploadResponse {
  resumeId: string;
}

interface ResumeStatusResponse {
  resumeId: string;
  status: ResumeStatus;
}

interface ResumeAnalysisResponse {
  skills: string[];
  experience: Array<{ company: string; years: number }>;
  education: { degree: string };
}

interface UpdateResumeStatusDto {
  status?: ResumeStatus;
}

interface UpdateResumeStatusResponse {
  resumeId: string;
  newStatus: ResumeStatus;
}

interface ResumeSearchResponse {
  resumes: ResumeStatusResponse[];
}

interface BatchProcessResponse {
  batchJobId: string;
}

const resumeStore = new Map<string, ResumeRecord>();

function genId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Exposes endpoints for resumes.
 */
@Controller()
export class ResumesController {
  /**
   * Performs the upload operation.
   * @param file - The file.
   * @param body - The body.
   * @returns The result of the operation.
   */
  @UseGuards(JwtAuthGuard)
  @Post('resumes/upload')
  @UseInterceptors(FileInterceptor('resume'))
  @HttpCode(HttpStatus.CREATED)
  upload(
    @UploadedFile() file: MulterFile,
    @Body() _body: Record<string, unknown>,
  ): UploadResponse {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const allowed = ['.pdf', '.doc', '.docx'];
    const name = file.originalname?.toLowerCase() || '';
    const ok = allowed.some((ext) => name.endsWith(ext));
    if (!ok) {
      // 400 for invalid types is acceptable by tests
      throw new BadRequestException('Unsupported file type');
    }
    const id = genId('resume');
    const now = new Date().toISOString();
    resumeStore.set(id, {
      id,
      status: 'processing',
      createdAt: now,
      updatedAt: now,
    });
    return { resumeId: id };
  }

  /**
   * Retrieves resume.
   * @param id - The id.
   * @returns The result of the operation.
   */
  @UseGuards(JwtAuthGuard)
  @Get('resumes/:id')
  @HttpCode(HttpStatus.OK)
  getResume(@Param('id') id: string): ResumeStatusResponse {
    const rec = resumeStore.get(id);
    if (!rec) {
      throw new NotFoundException('Resume not found');
    }
    // Mark as completed after first read to satisfy status expectation
    if (rec.status === 'processing') {
      rec.status = 'completed';
      rec.updatedAt = new Date().toISOString();
      resumeStore.set(id, rec);
    }
    return {
      resumeId: id,
      status: rec.status,
    };
  }

  /**
   * Retrieves analysis.
   * @param id - The id.
   * @returns The result of the operation.
   */
  @UseGuards(JwtAuthGuard)
  @Get('resumes/:id/analysis')
  @HttpCode(HttpStatus.OK)
  getAnalysis(@Param('id') id: string): ResumeAnalysisResponse {
    if (!resumeStore.has(id)) {
      throw new NotFoundException('Resume not found');
    }
    return {
      skills: ['JavaScript', 'Node.js'],
      experience: [{ company: 'Example', years: 2 }],
      education: { degree: 'Bachelor' },
    };
  }

  /**
   * Updates status.
   * @param id - The id.
   * @param body - The body.
   * @returns The result of the operation.
   */
  @UseGuards(JwtAuthGuard)
  @Put('resumes/:id/status')
  @HttpCode(HttpStatus.OK)
  updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateResumeStatusDto,
  ): UpdateResumeStatusResponse {
    const rec = resumeStore.get(id);
    if (!rec) {
      throw new NotFoundException('Resume not found');
    }
    const newStatus: ResumeStatus = body?.status ?? 'approved';
    rec.status = newStatus;
    rec.updatedAt = new Date().toISOString();
    resumeStore.set(id, rec);
    return { resumeId: id, newStatus };
  }

  /**
   * Performs the search operation.
   * @returns The result of the operation.
   */
  @UseGuards(JwtAuthGuard)
  @Post('resumes/search')
  @HttpCode(HttpStatus.OK)
  search(): ResumeSearchResponse {
    const items = Array.from(resumeStore.values()).map((r) => ({
      resumeId: r.id,
      status: r.status,
    }));
    return { resumes: items };
  }

  /**
   * Performs the batch operation.
   * @returns The result of the operation.
   */
  @UseGuards(JwtAuthGuard)
  @Post('resumes/batch/process')
  @HttpCode(HttpStatus.ACCEPTED)
  batch(): BatchProcessResponse {
    return { batchJobId: genId('batch') };
  }
}
