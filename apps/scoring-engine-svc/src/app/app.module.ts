import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScoringEventsController } from './scoring-events.controller';
import { ScoringEngineService } from '../scoring.service';
import { NatsClient } from '../nats/nats.client';
import { EnhancedSkillMatcherService } from '../services/enhanced-skill-matcher.service';
import { ExperienceAnalyzerService } from '../services/experience-analyzer.service';
import { CulturalFitAnalyzerService } from '../services/cultural-fit-analyzer.service';
import { ScoringConfidenceService } from '../services/scoring-confidence.service';
import { GeminiClient } from '../../../../libs/shared-dtos/src/gemini/gemini.client';

@Module({
  imports: [],
  controllers: [AppController, ScoringEventsController],
  providers: [
    AppService,
    ScoringEngineService,
    NatsClient,
    EnhancedSkillMatcherService,
    ExperienceAnalyzerService,
    CulturalFitAnalyzerService,
    ScoringConfidenceService,
    {
      provide: GeminiClient,
      useFactory: () => {
        return new GeminiClient({
          apiKey: process.env.GEMINI_API_KEY || 'your_gemini_api_key_here',
          model: 'gemini-1.5-flash',
          temperature: 0.3,
          maxOutputTokens: 8192,
        });
      },
    },
  ],
})
export class AppModule {}
