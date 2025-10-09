import type { ProgressFeedbackService } from './services/feedback/progress-feedback.service';

interface WelcomeOptions {
  progressFeedback: ProgressFeedbackService;
  config: typeof import('../config').APP_CONFIG;
  getText: (key: string) => string;
}

export function scheduleWelcomeMessage({
  progressFeedback,
  config,
  getText,
}: WelcomeOptions): void {
  const isFirstVisit = !localStorage.getItem('app_visited');

  if (!isFirstVisit) {
    return;
  }

  localStorage.setItem('app_visited', 'true');

  setTimeout(() => {
    progressFeedback.showSuccess(
      getText('APP.welcome.title'),
      getText('APP.welcome.message'),
      config.UI.TIMING.WELCOME_DELAY,
    );
  }, config.UI.TIMING.INITIAL_DELAY);
}

