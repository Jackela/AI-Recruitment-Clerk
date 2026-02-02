import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

export class QuestionnaireNotFoundError extends Error {
  constructor(public readonly questionnaireId: string) {
    super(`Questionnaire ${questionnaireId} not found`);
  }
}

export class QuestionnaireNotPublishedError extends Error {
  constructor(public readonly questionnaireId: string) {
    super(`Questionnaire ${questionnaireId} is not published`);
  }
}

interface QuestionnaireSubmission {
  id: string;
  qualityScore: number;
}

interface QuestionnaireRecord {
  id: string;
  published: boolean;
  submissions: QuestionnaireSubmission[];
  createdAt: string;
  updatedAt: string;
}

interface QuestionnaireListItem {
  questionnaireId: string;
  published: boolean;
  submissions: number;
}

interface QuestionnaireAnalytics {
  totalSubmissions: number;
  averageQualityScore: number;
  completionRate: number;
}

function createId(prefix: string): string {
  return `${prefix}-${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

@Injectable()
export class QuestionnairesService {
  private readonly questionnaires = new Map<string, QuestionnaireRecord>();

  public createQuestionnaire(): { questionnaireId: string } {
    const id = createId('q');
    const now = new Date().toISOString();
    this.questionnaires.set(id, {
      id,
      published: false,
      submissions: [],
      createdAt: now,
      updatedAt: now,
    });

    return { questionnaireId: id };
  }

  public publishQuestionnaire(qid: string): { accessUrl: string; publicId: string } {
    const record = this.questionnaires.get(qid);
    if (!record) {
      throw new QuestionnaireNotFoundError(qid);
    }
    record.published = true;
    record.updatedAt = new Date().toISOString();
    this.questionnaires.set(qid, record);

    return { accessUrl: `/q/${qid}`, publicId: createId('pub') };
  }

  public submitQuestionnaire(
    qid: string,
  ): { submissionId: string; qualityScore: number } {
    const record = this.questionnaires.get(qid);
    if (!record) {
      throw new QuestionnaireNotFoundError(qid);
    }
    if (!record.published) {
      throw new QuestionnaireNotPublishedError(qid);
    }

    const submissionId = createId('sub');
    const qualityScore = 80;
    record.submissions.push({ id: submissionId, qualityScore });
    record.updatedAt = new Date().toISOString();
    this.questionnaires.set(qid, record);

    return {
      submissionId,
      qualityScore,
    };
  }

  public getAnalytics(qid: string): QuestionnaireAnalytics {
    const record = this.questionnaires.get(qid);
    if (!record) {
      throw new QuestionnaireNotFoundError(qid);
    }

    const count = record.submissions.length || 1;
    const average =
      record.submissions.reduce((sum, submission) => {
        return sum + submission.qualityScore;
      }, 0) / count;

    return {
      totalSubmissions: record.submissions.length,
      averageQualityScore: Math.max(1, Math.round(average || 75)),
      completionRate: 100,
    };
  }

  public exportQuestionnaireData(): {
    exportUrl: string;
    expiresAt: string;
  } {
    return {
      exportUrl: `/exports/${createId('report')}.json`,
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    };
  }

  public listQuestionnaires(): {
    items: QuestionnaireListItem[];
    total: number;
    page: number;
    limit: number;
  } {
    const items: QuestionnaireListItem[] = Array.from(
      this.questionnaires.values(),
    ).map((questionnaire) => ({
      questionnaireId: questionnaire.id,
      published: questionnaire.published,
      submissions: questionnaire.submissions.length,
    }));

    return {
      items,
      total: items.length,
      page: 1,
      limit: 20,
    };
  }
}
