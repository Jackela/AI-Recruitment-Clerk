/**
 * Data Test ID Selectors
 * Centralized selector constants for maintainability
 */

export const SELECTORS = {
  // Global
  pageTitle: 'page-title',
  loadingState: 'loading-state',
  emptyState: 'empty-state',

  // Jobs Page
  jobs: {
    container: 'jobs-container',
    grid: 'jobs-grid',
    createJobButton: 'create-job-button',
    jobCard: 'job-card',
    createJobForm: 'create-job-form',
    jobTitleInput: 'job-title-input',
    jdTextarea: 'jd-textarea',
    submitButton: 'submit-button',
  },

  // Analysis Page
  analysis: {
    container: 'analysis-container',
    uploadArea: 'upload-area',
    fileInput: 'file-input',
    analyzeButton: 'analyze-button',
    resultsSection: 'results-section',
  },

  // Dashboard Page
  dashboard: {
    container: 'dashboard-container',
    statsCard: 'stats-card',
    jobCount: 'job-count',
    resumeCount: 'resume-count',
    createJobButton: 'create-job-button',
    goToAnalysisButton: 'go-to-analysis-button',
    goToReportsButton: 'go-to-reports-button',
  },

  // Login Page
  login: {
    container: 'login-container',
    emailInput: 'email-input',
    passwordInput: 'password-input',
    submitButton: 'submit-button',
    errorMessage: 'error-message',
  },

  // Navigation
  navigation: {
    main: 'main-navigation',
    jobsLink: 'nav-jobs-link',
    analysisLink: 'nav-analysis-link',
    dashboardLink: 'nav-dashboard-link',
    reportsLink: 'nav-reports-link',
  },
} as const;

/**
 * URL Routes
 */

export const ROUTES = {
  home: '/',
  jobs: '/jobs',
  createJob: '/jobs/create',
  analysis: '/analysis',
  dashboard: '/dashboard',
  reports: '/reports',
  login: '/login',
} as const;

/**
 * Timeout Constants
 */

export const TIMEOUTS = {
  short: 5000,
  medium: 15000,
  long: 30000,
} as const;
