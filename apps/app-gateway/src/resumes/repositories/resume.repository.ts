import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, ClientSession, AnyBulkWriteOperation } from 'mongoose';
import type { ResumeDocument } from '../schemas/resume.schema';
import { Resume } from '../schemas/resume.schema';

export interface FileMetadata {
  filePath: string;
  fileSize: number;
  mimeType: string;
  checksum: string;
  originalName?: string;
}

export interface ResumeCreateData {
  candidateId?: string;
  candidateEmail?: string;
  candidatePhone?: string;
  candidateName?: string;
  fileMetadata: FileMetadata;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  parsedData?: Record<string, unknown>;
}

export interface ResumeUpdateData {
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  parsingResult?: Record<string, unknown>;
  errorMessage?: string;
  fileMetadata?: Partial<FileMetadata>;
}

export interface CandidateSearchOptions {
  candidateId?: string;
  email?: string;
  phone?: string;
  name?: string;
  limit?: number;
  skip?: number;
}

/**
 * Manages persistence for resume documents with file metadata.
 */
@Injectable()
export class ResumeRepository {
  private readonly logger = new Logger(ResumeRepository.name);

  /**
   * Initializes a new instance of the Resume Repository.
   * @param resumeModel - The resume model.
   */
  constructor(
    @InjectModel(Resume.name) private resumeModel: Model<ResumeDocument>,
  ) {}

  /**
   * Creates a new resume with file metadata.
   * @param data - The resume creation data.
   * @returns A promise that resolves to ResumeDocument.
   */
  public async create(data: ResumeCreateData): Promise<ResumeDocument> {
    try {
      const resumeData = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: data.status || 'pending',
      };

      const createdResume = new this.resumeModel(resumeData);
      const savedResume = await createdResume.save();
      this.logger.log(`Created resume with ID: ${savedResume._id}`);
      return savedResume;
    } catch (error) {
      this.logger.error('Error creating resume:', error);
      throw error;
    }
  }

  /**
   * Finds a resume by ID with optional population of relations.
   * @param id - The resume ID.
   * @param populateRelations - Whether to populate related data.
   * @returns A promise that resolves to ResumeDocument | null.
   */
  public async findById(
    id: string,
    populateRelations = false,
  ): Promise<ResumeDocument | null> {
    try {
      let query = this.resumeModel.findById(id);

      if (populateRelations) {
        query = query.populate('candidateId');
      }

      const resume = await query.exec();
      return resume;
    } catch (error) {
      this.logger.error(`Error finding resume by ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Finds resumes by candidate ID.
   * @param candidateId - The candidate ID.
   * @param limit - Maximum results to return.
   * @returns A promise that resolves to an array of ResumeDocument.
   */
  public async findByCandidateId(
    candidateId: string,
    limit = 50,
  ): Promise<ResumeDocument[]> {
    try {
      return await this.resumeModel
        .find({ candidateId })
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      this.logger.error(
        `Error finding resumes by candidate ID ${candidateId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Finds resumes by candidate email.
   * @param email - The candidate email.
   * @param limit - Maximum results to return.
   * @returns A promise that resolves to an array of ResumeDocument.
   */
  public async findByEmail(
    email: string,
    limit = 50,
  ): Promise<ResumeDocument[]> {
    try {
      return await this.resumeModel
        .find({ candidateEmail: email })
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      this.logger.error(`Error finding resumes by email ${email}:`, error);
      throw error;
    }
  }

  /**
   * Finds resumes by candidate phone.
   * @param phone - The candidate phone.
   * @param limit - Maximum results to return.
   * @returns A promise that resolves to an array of ResumeDocument.
   */
  public async findByPhone(
    phone: string,
    limit = 50,
  ): Promise<ResumeDocument[]> {
    try {
      return await this.resumeModel
        .find({ candidatePhone: phone })
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      this.logger.error(`Error finding resumes by phone ${phone}:`, error);
      throw error;
    }
  }

  /**
   * Finds resumes by candidate name (partial match).
   * @param name - The candidate name.
   * @param limit - Maximum results to return.
   * @returns A promise that resolves to an array of ResumeDocument.
   */
  public async findByName(name: string, limit = 50): Promise<ResumeDocument[]> {
    try {
      return await this.resumeModel
        .find({
          candidateName: { $regex: name, $options: 'i' },
        })
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      this.logger.error(`Error finding resumes by name ${name}:`, error);
      throw error;
    }
  }

  /**
   * Performs advanced candidate search with multiple criteria.
   * @param options - Search options.
   * @returns A promise that resolves to an array of ResumeDocument.
   */
  public async searchByCandidate(
    options: CandidateSearchOptions,
  ): Promise<ResumeDocument[]> {
    try {
      const { candidateId, email, phone, name, limit = 50, skip = 0 } = options;
      const query: Record<string, unknown> = {};

      if (candidateId) {
        query.candidateId = candidateId;
      }
      if (email) {
        query.candidateEmail = email;
      }
      if (phone) {
        query.candidatePhone = phone;
      }
      if (name) {
        query.candidateName = { $regex: name, $options: 'i' };
      }

      return await this.resumeModel
        .find(query)
        .limit(limit)
        .skip(skip)
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      this.logger.error('Error searching resumes by candidate:', error);
      throw error;
    }
  }

  /**
   * Updates a resume by ID.
   * @param id - The resume ID.
   * @param updateData - The update data.
   * @returns A promise that resolves to ResumeDocument | null.
   */
  public async updateById(
    id: string,
    updateData: ResumeUpdateData,
  ): Promise<ResumeDocument | null> {
    try {
      const updatedResume = await this.resumeModel
        .findByIdAndUpdate(
          id,
          { ...updateData, updatedAt: new Date() },
          { new: true, runValidators: true },
        )
        .exec();

      if (updatedResume) {
        this.logger.log(`Updated resume with ID: ${id}`);
      }

      return updatedResume;
    } catch (error) {
      this.logger.error(`Error updating resume ${id}:`, error);
      throw error;
    }
  }

  /**
   * Updates the parsing status of a resume.
   * @param id - The resume ID.
   * @param status - The new status.
   * @param parsingResult - Optional parsing result data.
   * @param errorMessage - Optional error message.
   * @returns A promise that resolves to ResumeDocument | null.
   */
  public async updateParsingStatus(
    id: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    parsingResult?: Record<string, unknown>,
    errorMessage?: string,
  ): Promise<ResumeDocument | null> {
    try {
      const updateData: Record<string, unknown> = {
        status,
        updatedAt: new Date(),
      };

      if (parsingResult) {
        updateData.parsedData = parsingResult;
      }

      if (errorMessage) {
        updateData.errorMessage = errorMessage;
      }

      if (status === 'completed') {
        updateData.parsedAt = new Date();
      }

      return await this.updateById(id, updateData);
    } catch (error) {
      this.logger.error(
        `Error updating parsing status for resume ${id}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Performs a soft delete on a resume.
   * @param id - The resume ID.
   * @returns A promise that resolves to boolean indicating success.
   */
  public async softDelete(id: string): Promise<boolean> {
    try {
      const result = await this.resumeModel
        .findByIdAndUpdate(
          id,
          {
            deletedAt: new Date(),
            status: 'deleted',
            updatedAt: new Date(),
          },
          { new: true },
        )
        .exec();

      if (result) {
        this.logger.log(`Soft deleted resume with ID: ${id}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Error soft deleting resume ${id}:`, error);
      throw error;
    }
  }

  /**
   * Hard deletes a resume by ID.
   * @param id - The resume ID.
   * @returns A promise that resolves to boolean indicating success.
   */
  public async hardDelete(id: string): Promise<boolean> {
    try {
      const result = await this.resumeModel.findByIdAndDelete(id).exec();

      if (result) {
        this.logger.log(`Hard deleted resume with ID: ${id}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Error hard deleting resume ${id}:`, error);
      throw error;
    }
  }

  /**
   * Batch inserts multiple resumes.
   * @param resumes - Array of resume creation data.
   * @returns A promise that resolves to an array of ResumeDocument.
   */
  public async batchInsert(
    resumes: ResumeCreateData[],
  ): Promise<ResumeDocument[]> {
    try {
      const resumesWithTimestamps = resumes.map((resume) => ({
        ...resume,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: resume.status || 'pending',
      }));

      const createdResumes = await this.resumeModel.insertMany(
        resumesWithTimestamps,
      );
      this.logger.log(`Batch inserted ${createdResumes.length} resumes`);
      return createdResumes;
    } catch (error) {
      this.logger.error('Error batch inserting resumes:', error);
      throw error;
    }
  }

  /**
   * Batch updates multiple resumes.
   * @param updates - Array of objects containing id and update data.
   * @returns A promise that resolves to the number of updated documents.
   */
  public async batchUpdate(
    updates: Array<{ id: string; data: ResumeUpdateData }>,
  ): Promise<number> {
    try {
      const operations = updates.map(({ id, data }) => ({
        updateOne: {
          filter: { _id: id },
          update: {
            $set: {
              ...data,
              updatedAt: new Date(),
            },
          },
        },
      })) as AnyBulkWriteOperation<ResumeDocument>[];

      const result = await this.resumeModel.bulkWrite(operations);
      this.logger.log(`Batch updated ${result.modifiedCount} resumes`);
      return result.modifiedCount;
    } catch (error) {
      this.logger.error('Error batch updating resumes:', error);
      throw error;
    }
  }

  /**
   * Batch soft deletes multiple resumes.
   * @param ids - Array of resume IDs.
   * @returns A promise that resolves to the number of deleted documents.
   */
  public async batchSoftDelete(ids: string[]): Promise<number> {
    try {
      const result = await this.resumeModel.updateMany(
        { _id: { $in: ids } },
        {
          $set: {
            deletedAt: new Date(),
            status: 'deleted',
            updatedAt: new Date(),
          },
        },
      );

      this.logger.log(`Batch soft deleted ${result.modifiedCount} resumes`);
      return result.modifiedCount;
    } catch (error) {
      this.logger.error('Error batch soft deleting resumes:', error);
      throw error;
    }
  }

  /**
   * Executes operations within a transaction.
   * @param operations - Function that receives a session and executes operations.
   * @returns A promise that resolves to the result of the operations.
   */
  public async withTransaction<T>(
    operations: (session: ClientSession) => Promise<T>,
  ): Promise<T> {
    const session = await this.resumeModel.db.startSession();

    try {
      session.startTransaction();
      const result = await operations(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error('Transaction failed:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Validates file metadata.
   * @param metadata - The file metadata to validate.
   * @returns A promise that resolves to boolean indicating validity.
   */
  public async validateFileMetadata(metadata: FileMetadata): Promise<boolean> {
    const validMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    if (!metadata.mimeType || !validMimeTypes.includes(metadata.mimeType)) {
      return false;
    }

    if (!metadata.filePath || metadata.filePath.length === 0) {
      return false;
    }

    if (metadata.fileSize <= 0 || metadata.fileSize > 10 * 1024 * 1024) {
      return false;
    }

    if (!metadata.checksum || metadata.checksum.length < 32) {
      return false;
    }

    return true;
  }

  /**
   * Finds a resume by file checksum.
   * @param checksum - The file checksum.
   * @returns A promise that resolves to ResumeDocument | null.
   */
  public async findByChecksum(
    checksum: string,
  ): Promise<ResumeDocument | null> {
    try {
      return await this.resumeModel
        .findOne({ 'fileMetadata.checksum': checksum })
        .exec();
    } catch (error) {
      this.logger.error(`Error finding resume by checksum ${checksum}:`, error);
      throw error;
    }
  }

  /**
   * Finds resumes by file path.
   * @param filePath - The file path.
   * @returns A promise that resolves to an array of ResumeDocument.
   */
  public async findByFilePath(filePath: string): Promise<ResumeDocument[]> {
    try {
      return await this.resumeModel
        .find({ 'fileMetadata.filePath': filePath })
        .exec();
    } catch (error) {
      this.logger.error(
        `Error finding resumes by file path ${filePath}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Health check method for monitoring.
   * @returns A promise that resolves to health status.
   */
  public async healthCheck(): Promise<{ status: string; count: number }> {
    try {
      const count = await this.resumeModel.countDocuments().exec();
      return {
        status: 'healthy',
        count,
      };
    } catch (error) {
      this.logger.error('Resume repository health check failed:', error);
      return {
        status: 'unhealthy',
        count: -1,
      };
    }
  }
}
