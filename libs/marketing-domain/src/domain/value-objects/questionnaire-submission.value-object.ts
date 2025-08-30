import { ValueObject } from './base/value-object.js';
import { UserProfile } from './user-profile.value-object.js';
import { UserExperience } from './user-experience.value-object.js';
import { BusinessValue } from './business-value.value-object.js';
import { FeatureNeeds } from './feature-needs.value-object.js';
import { OptionalInfo } from './optional-info.value-object.js';
import { SubmissionSummary } from './submission-summary.value-object.js';
import { Answer } from './answer.value-object.js';
import { RawSubmissionData } from '../../application/dtos/questionnaire.dto.js';

export class QuestionnaireSubmission extends ValueObject<{
  userProfile: UserProfile;
  userExperience: UserExperience;
  businessValue: BusinessValue;
  featureNeeds: FeatureNeeds;
  optional: OptionalInfo;
  submittedAt: Date;
}> {
  static fromRawData(data: RawSubmissionData): QuestionnaireSubmission {
    return new QuestionnaireSubmission({
      userProfile: new UserProfile({
        role: data.userProfile?.role || 'other',
        industry: data.userProfile?.industry || '',
        companySize: data.userProfile?.companySize || 'unknown',
        location: data.userProfile?.location || ''
      }),
      userExperience: new UserExperience({
        overallSatisfaction: data.userExperience?.overallSatisfaction || 1,
        accuracyRating: data.userExperience?.accuracyRating || 1,
        speedRating: data.userExperience?.speedRating || 1,
        uiRating: data.userExperience?.uiRating || 1,
        mostUsefulFeature: data.userExperience?.mostUsefulFeature || '',
        mainPainPoint: data.userExperience?.mainPainPoint,
        improvementSuggestion: data.userExperience?.improvementSuggestion
      }),
      businessValue: new BusinessValue({
        currentScreeningMethod: data.businessValue?.currentScreeningMethod || 'manual',
        timeSpentPerResume: data.businessValue?.timeSpentPerResume || 0,
        resumesPerWeek: data.businessValue?.resumesPerWeek || 0,
        timeSavingPercentage: data.businessValue?.timeSavingPercentage || 0,
        willingnessToPayMonthly: data.businessValue?.willingnessToPayMonthly || 0,
        recommendLikelihood: data.businessValue?.recommendLikelihood || 1
      }),
      featureNeeds: new FeatureNeeds({
        priorityFeatures: data.featureNeeds?.priorityFeatures || [],
        integrationNeeds: data.featureNeeds?.integrationNeeds || []
      }),
      optional: new OptionalInfo({
        additionalFeedback: data.optional?.additionalFeedback,
        contactPreference: data.optional?.contactPreference
      }),
      submittedAt: new Date()
    });
  }
  
  static restore(data: any): QuestionnaireSubmission {
    return new QuestionnaireSubmission({
      ...data,
      submittedAt: new Date(data.submittedAt)
    });
  }
  
  getUserProfile(): UserProfile {
    return this.props.userProfile;
  }
  
  getUserExperience(): UserExperience {
    return this.props.userExperience;
  }
  
  getBusinessValue(): BusinessValue {
    return this.props.businessValue;
  }
  
  getOptionalInfo(): OptionalInfo {
    return this.props.optional;
  }
  
  getSummary(): SubmissionSummary {
    return new SubmissionSummary({
      role: this.props.userProfile.role,
      industry: this.props.userProfile.industry,
      overallSatisfaction: this.props.userExperience.overallSatisfaction,
      willingnessToPayMonthly: this.props.businessValue.willingnessToPayMonthly,
      textLength: this.calculateTotalTextLength(),
      completionRate: this.calculateCompletionRate()
    });
  }
  
  getAnswer(questionId: string): Answer | null {
    // 简化实现，实际应该有更复杂的映射
    const answers = {
      role: this.props.userProfile.role,
      industry: this.props.userProfile.industry,
      overallSatisfaction: this.props.userExperience.overallSatisfaction.toString(),
      mostUsefulFeature: this.props.userExperience.mostUsefulFeature
    };
    
    const value = answers[questionId as keyof typeof answers];
    return value ? new Answer({ questionId, value: value.toString() }) : null;
  }
  
  private calculateTotalTextLength(): number {
    const textFields = [
      this.props.userProfile.industry,
      this.props.userProfile.location,
      this.props.userExperience.mostUsefulFeature,
      this.props.userExperience.mainPainPoint || '',
      this.props.userExperience.improvementSuggestion || '',
      this.props.optional.additionalFeedback || ''
    ];
    
    return textFields.join(' ').length;
  }
  
  private calculateCompletionRate(): number {
    const requiredFields = 5; // role, industry, satisfaction, screening method, willingness to pay
    const completedFields = [
      this.props.userProfile.role,
      this.props.userProfile.industry,
      this.props.userExperience.overallSatisfaction,
      this.props.businessValue.currentScreeningMethod,
      this.props.businessValue.willingnessToPayMonthly
    ].filter(field => field && field !== 0).length;
    
    return completedFields / requiredFields;
  }
}
