import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Resume, ResumeDocument } from '../schemas/resume.schema';

@Injectable()
export class ResumeRepository {
  private readonly logger = new Logger(ResumeRepository.name);

  constructor(
    @InjectModel(Resume.name, 'resume-parser') private resumeModel: Model<ResumeDocument>,
  ) {}

  async create(resumeData: Partial<Resume>): Promise<ResumeDocument> {
    try {
      const createdResume = new this.resumeModel(resumeData);
      const savedResume = await createdResume.save();
      this.logger.log(`Created resume with ID: ${savedResume._id}`);
      return savedResume;
    } catch (error) {
      this.logger.error('Error creating resume:', error);
      throw error;
    }
  }

  async findById(id: string): Promise<ResumeDocument | null> {
    try {
      return await this.resumeModel.findById(id).exec();
    } catch (error) {
      this.logger.error(`Error finding resume by ID ${id}:`, error);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<ResumeDocument[]> {
    try {
      return await this.resumeModel.find({ 'contactInfo.email': email }).exec();
    } catch (error) {
      this.logger.error(`Error finding resumes by email ${email}:`, error);
      throw error;
    }
  }

  async findByGridFsUrl(gridFsUrl: string): Promise<ResumeDocument | null> {
    try {
      return await this.resumeModel.findOne({ gridFsUrl }).exec();
    } catch (error) {
      this.logger.error(`Error finding resume by GridFS URL ${gridFsUrl}:`, error);
      throw error;
    }
  }

  async updateById(id: string, updateData: Partial<Resume>): Promise<ResumeDocument | null> {
    try {
      const updatedResume = await this.resumeModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).exec();
      
      if (updatedResume) {
        this.logger.log(`Updated resume with ID: ${id}`);
      }
      
      return updatedResume;
    } catch (error) {
      this.logger.error(`Error updating resume ${id}:`, error);
      throw error;
    }
  }

  async updateStatus(id: string, status: string, errorMessage?: string): Promise<ResumeDocument | null> {
    try {
      const updateData: any = { status, processedAt: new Date() };
      if (errorMessage) {
        updateData.errorMessage = errorMessage;
      }
      
      return await this.updateById(id, updateData);
    } catch (error) {
      this.logger.error(`Error updating resume status ${id}:`, error);
      throw error;
    }
  }

  async deleteById(id: string): Promise<boolean> {
    try {
      const result = await this.resumeModel.findByIdAndDelete(id).exec();
      if (result) {
        this.logger.log(`Deleted resume with ID: ${id}`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Error deleting resume ${id}:`, error);
      throw error;
    }
  }

  async findByStatus(status: string, limit = 100): Promise<ResumeDocument[]> {
    try {
      return await this.resumeModel
        .find({ status })
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      this.logger.error(`Error finding resumes by status ${status}:`, error);
      throw error;
    }
  }

  async findPending(limit = 50): Promise<ResumeDocument[]> {
    return this.findByStatus('pending', limit);
  }

  async findCompleted(limit = 100): Promise<ResumeDocument[]> {
    return this.findByStatus('completed', limit);
  }

  async countByStatus(): Promise<Record<string, number>> {
    try {
      const counts = await this.resumeModel.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]).exec();

      const result: Record<string, number> = {};
      counts.forEach(item => {
        result[item._id] = item.count;
      });
      
      return result;
    } catch (error) {
      this.logger.error('Error counting resumes by status:', error);
      throw error;
    }
  }

  async findWithSkills(skills: string[], limit = 100): Promise<ResumeDocument[]> {
    try {
      return await this.resumeModel
        .find({ 
          skills: { $in: skills },
          status: 'completed'
        })
        .limit(limit)
        .sort({ processingConfidence: -1 })
        .exec();
    } catch (error) {
      this.logger.error(`Error finding resumes with skills:`, error);
      throw error;
    }
  }

  /**
   * Health check method for monitoring
   */
  async healthCheck(): Promise<{ status: string; count: number }> {
    try {
      const count = await this.resumeModel.countDocuments().exec();
      return {
        status: 'healthy',
        count
      };
    } catch (error) {
      this.logger.error('Resume repository health check failed:', error);
      return {
        status: 'unhealthy',
        count: -1
      };
    }
  }
}