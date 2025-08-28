import { test, expect, Page, BrowserContext } from '@playwright/test';
import { io, Socket } from 'socket.io-client';

/**
 * Real-time Features & WebSocket Communication E2E Tests
 * 
 * Tests:
 * - WebSocket connection establishment and maintenance
 * - Real-time resume processing updates
 * - Multi-user collaboration scenarios
 * - Connection resilience and reconnection
 * - Message queue processing
 * - Live notifications and status updates
 */

interface WebSocketTestClient {
  socket: Socket;
  userId: string;
  events: any[];
}

// WebSocket test utilities
class WebSocketTestHelper {
  private clients: Map<string, WebSocketTestClient> = new Map();
  
  async createClient(userId: string, baseUrl: string): Promise<WebSocketTestClient> {
    const socket = io(baseUrl, {
      auth: { userId },
      transports: ['websocket']
    });
    
    const client: WebSocketTestClient = {
      socket,
      userId,
      events: []
    };
    
    // Log all events for testing
    socket.onAny((eventName, ...args) => {
      client.events.push({ eventName, args, timestamp: Date.now() });
    });
    
    await new Promise((resolve) => {
      socket.on('connect', resolve);
    });
    
    this.clients.set(userId, client);
    return client;
  }
  
  async disconnectClient(userId: string) {
    const client = this.clients.get(userId);
    if (client) {
      client.socket.disconnect();
      this.clients.delete(userId);
    }
  }
  
  async disconnectAll() {
    for (const [userId] of this.clients) {
      await this.disconnectClient(userId);
    }
  }
  
  getClient(userId: string): WebSocketTestClient | undefined {
    return this.clients.get(userId);
  }
  
  async waitForEvent(userId: string, eventName: string, timeout = 10000): Promise<any> {
    const client = this.clients.get(userId);
    if (!client) throw new Error(`Client ${userId} not found`);
    
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Event ${eventName} not received within ${timeout}ms`));
      }, timeout);
      
      const checkEvents = () => {
        const event = client.events.find(e => e.eventName === eventName);
        if (event) {
          clearTimeout(timer);
          resolve(event);
        } else {
          setTimeout(checkEvents, 100);
        }
      };
      
      checkEvents();
    });
  }
}

// Page Objects for Real-time Features
class RealTimeDashboardPage {
  constructor(private page: Page) {}
  
  async navigateTo() {
    await this.page.goto('/dashboard/realtime');
    await this.page.waitForLoadState('networkidle');
  }
  
  async waitForWebSocketConnection() {
    // Wait for connection indicator
    await expect(this.page.locator('[data-testid=\"ws-status\"]')).toContainText('Connected');
    await expect(this.page.locator('[data-testid=\"ws-indicator\"]')).toHaveClass(/connected/);
  }
  
  async getConnectionStatus(): Promise<string> {
    return await this.page.locator('[data-testid=\"ws-status\"]').textContent() || '';
  }
  
  async getActiveUsers(): Promise<number> {
    const text = await this.page.locator('[data-testid=\"active-users-count\"]').textContent();
    return parseInt(text?.replace('Active Users: ', '') || '0');
  }
  
  async uploadResumeForRealTimeTracking(fileName: string) {
    await this.page.click('[data-testid=\"upload-resume-button\"]');
    
    const fileInput = this.page.locator('[data-testid=\"resume-file-input\"]');
    await fileInput.setInputFiles(`test-data/resumes/${fileName}`);
    
    await this.page.fill('[data-testid=\"candidate-name\"]', 'Test Candidate');
    await this.page.fill('[data-testid=\"candidate-email\"]', 'test@example.com');
    
    await this.page.click('[data-testid=\"submit-upload\"]');
    
    // Get the processing ID
    const processingId = await this.page.locator('[data-testid=\"processing-id\"]').textContent();
    return processingId?.replace('Processing ID: ', '');
  }
  
  async waitForProcessingStage(stage: string) {
    await expect(this.page.locator(`[data-testid=\"stage-${stage}\"]`)).toHaveClass(/active/);
  }
  
  async getProcessingProgress(): Promise<number> {
    const progressText = await this.page.locator('[data-testid=\"progress-percentage\"]').textContent();
    return parseInt(progressText?.replace('%', '') || '0');
  }
}

class CollaborativeReviewPage {
  constructor(private page: Page) {}
  
  async navigateTo(applicationId: string) {
    await this.page.goto(`/applications/${applicationId}/review`);
    await this.page.waitForLoadState('networkidle');
  }
  
  async addComment(comment: string) {
    await this.page.fill('[data-testid=\"comment-input\"]', comment);
    await this.page.click('[data-testid=\"add-comment-button\"]');
  }
  
  async getComments(): Promise<string[]> {
    const comments = await this.page.locator('[data-testid=\"comment-item\"]').allTextContents();
    return comments;
  }
  
  async setScore(category: string, score: number) {
    await this.page.fill(`[data-testid=\"score-${category}\"]`, score.toString());
    await this.page.keyboard.press('Tab'); // Trigger change event
  }
  
  async getCurrentScores(): Promise<Record<string, number>> {
    const categories = ['technical', 'communication', 'experience', 'culture'];
    const scores: Record<string, number> = {};
    
    for (const category of categories) {
      const value = await this.page.inputValue(`[data-testid=\"score-${category}\"]`);
      scores[category] = parseInt(value || '0');
    }
    
    return scores;
  }
  
  async getActiveReviewers(): Promise<string[]> {
    const reviewers = await this.page.locator('[data-testid=\"active-reviewer\"]').allTextContents();
    return reviewers;
  }
}

test.describe('Real-time Features & WebSocket Communication', () => {
  let wsHelper: WebSocketTestHelper;
  let realtimePage: RealTimeDashboardPage;
  let collaborativePage: CollaborativeReviewPage;
  
  test.beforeEach(async ({ page }) => {
    wsHelper = new WebSocketTestHelper();
    realtimePage = new RealTimeDashboardPage(page);
    collaborativePage = new CollaborativeReviewPage(page);
    
    // Login as HR Manager
    await page.goto('/login');
    await page.fill('[data-testid=\"email-input\"]', 'hr.manager@test.com');
    await page.fill('[data-testid=\"password-input\"]', 'TestPass123!');
    await page.click('[data-testid=\"login-button\"]');
    await page.waitForURL(/.*\\/dashboard/);
  });
  
  test.afterEach(async () => {
    await wsHelper.disconnectAll();
  });
  
  test.describe('WebSocket Connection Management', () => {
    test('should establish WebSocket connection on dashboard load', async ({ page }) => {
      await realtimePage.navigateTo();
      await realtimePage.waitForWebSocketConnection();
      
      const status = await realtimePage.getConnectionStatus();
      expect(status).toBe('Connected');
      
      // Verify connection in browser console
      const wsConnections = await page.evaluate(() => {
        // @ts-ignore
        return window.wsConnections || 0;
      });
      expect(wsConnections).toBeGreaterThan(0);
    });
    
    test('should handle connection loss and automatic reconnection', async ({ page }) => {
      await realtimePage.navigateTo();
      await realtimePage.waitForWebSocketConnection();
      
      // Simulate network disconnection
      await page.context().setOffline(true);
      
      // Should show disconnected status
      await expect(page.locator('[data-testid=\"ws-status\"]')).toContainText('Disconnected');
      await expect(page.locator('[data-testid=\"ws-indicator\"]')).toHaveClass(/disconnected/);
      
      // Restore connection
      await page.context().setOffline(false);
      
      // Should automatically reconnect
      await expect(page.locator('[data-testid=\"ws-status\"]')).toContainText('Connected', { timeout: 10000 });
      await expect(page.locator('[data-testid=\"ws-indicator\"]')).toHaveClass(/connected/);
    });
    
    test('should maintain connection across page navigation', async ({ page }) => {
      await realtimePage.navigateTo();
      await realtimePage.waitForWebSocketConnection();
      
      const initialStatus = await realtimePage.getConnectionStatus();
      expect(initialStatus).toBe('Connected');
      
      // Navigate to different page
      await page.goto('/jobs');
      await page.waitForTimeout(1000);
      
      // Navigate back
      await realtimePage.navigateTo();
      
      // Should still be connected
      const finalStatus = await realtimePage.getConnectionStatus();
      expect(finalStatus).toBe('Connected');
    });
  });
  
  test.describe('Real-time Resume Processing', () => {
    test('should show live progress updates during resume processing', async ({ page, baseURL }) => {
      // Create WebSocket client to monitor events
      const client = await wsHelper.createClient('hr-manager-1', baseURL || 'http://localhost:4200');
      
      await realtimePage.navigateTo();
      await realtimePage.waitForWebSocketConnection();
      
      // Upload resume for processing
      const processingId = await realtimePage.uploadResumeForRealTimeTracking('sample-resume.pdf');
      
      // Wait for processing stages
      const stages = ['parsing', 'extraction', 'analysis', 'scoring', 'completed'];
      
      for (const stage of stages) {
        await realtimePage.waitForProcessingStage(stage);
        
        // Verify WebSocket event was received
        const event = await wsHelper.waitForEvent('hr-manager-1', `processing.${stage}`);
        expect(event.args[0].processingId).toBe(processingId);
        
        // Check progress percentage increases
        const progress = await realtimePage.getProcessingProgress();
        expect(progress).toBeGreaterThan(0);
      }
      
      // Final progress should be 100%
      const finalProgress = await realtimePage.getProcessingProgress();
      expect(finalProgress).toBe(100);
    });
    
    test('should handle multiple concurrent resume processing', async ({ page, baseURL }) => {
      const client = await wsHelper.createClient('hr-manager-1', baseURL || 'http://localhost:4200');
      
      await realtimePage.navigateTo();
      await realtimePage.waitForWebSocketConnection();
      
      // Upload multiple resumes concurrently
      const processingIds: string[] = [];
      const resumes = ['resume1.pdf', 'resume2.pdf', 'resume3.pdf'];
      
      for (const resume of resumes) {
        const processingId = await realtimePage.uploadResumeForRealTimeTracking(resume);
        processingIds.push(processingId!);
        await page.waitForTimeout(500); // Small delay between uploads
      }
      
      // Verify all processing IDs are tracked
      for (const processingId of processingIds) {
        await expect(page.locator(`[data-testid=\"process-${processingId}\"]`)).toBeVisible();
      }
      
      // Wait for all to complete
      for (const processingId of processingIds) {
        await wsHelper.waitForEvent('hr-manager-1', 'processing.completed');
      }
      
      // Verify all show 100% completion
      for (const processingId of processingIds) {
        const element = page.locator(`[data-testid=\"progress-${processingId}\"]`);
        await expect(element).toContainText('100%');
      }
    });
    
    test('should handle processing errors gracefully', async ({ page, baseURL }) => {
      const client = await wsHelper.createClient('hr-manager-1', baseURL || 'http://localhost:4200');
      
      await realtimePage.navigateTo();
      await realtimePage.waitForWebSocketConnection();
      
      // Upload corrupted file
      const processingId = await realtimePage.uploadResumeForRealTimeTracking('corrupted-file.pdf');
      
      // Wait for error event
      const errorEvent = await wsHelper.waitForEvent('hr-manager-1', 'processing.error');
      expect(errorEvent.args[0].processingId).toBe(processingId);
      expect(errorEvent.args[0].error).toBeTruthy();
      
      // Should show error status in UI
      await expect(page.locator(`[data-testid=\"error-${processingId}\"]`)).toBeVisible();
      await expect(page.locator(`[data-testid=\"error-${processingId}\"]`)).toContainText('Processing failed');
    });
  });
  
  test.describe('Multi-user Collaboration', () => {
    test('should show active users in real-time', async ({ page, context }) => {
      // Create second browser context (simulate second user)
      const context2 = await context.browser()?.newContext();
      const page2 = await context2?.newPage();
      
      if (!page2) throw new Error('Failed to create second page');
      
      // Login second user
      await page2.goto('/login');
      await page2.fill('[data-testid=\"email-input\"]', 'recruiter@test.com');
      await page2.fill('[data-testid=\"password-input\"]', 'TestPass123!');
      await page2.click('[data-testid=\"login-button\"]');
      
      // Both users navigate to real-time dashboard
      await realtimePage.navigateTo();
      await realtimePage.waitForWebSocketConnection();
      
      const realtimePage2 = new RealTimeDashboardPage(page2);
      await realtimePage2.navigateTo();
      await realtimePage2.waitForWebSocketConnection();
      
      // Should show 2 active users
      await page.waitForTimeout(1000); // Allow time for user count update
      const activeUsers1 = await realtimePage.getActiveUsers();
      const activeUsers2 = await realtimePage2.getActiveUsers();
      
      expect(activeUsers1).toBe(2);
      expect(activeUsers2).toBe(2);
      
      // Disconnect second user
      await page2.close();
      await context2?.close();
      
      // Should show 1 active user
      await page.waitForTimeout(2000); // Allow time for disconnect detection
      const finalActiveUsers = await realtimePage.getActiveUsers();
      expect(finalActiveUsers).toBe(1);
    });
    
    test('should enable collaborative resume review', async ({ page, context, baseURL }) => {
      // Create WebSocket clients for both users
      const hrClient = await wsHelper.createClient('hr-manager', baseURL || 'http://localhost:4200');
      const recruiterClient = await wsHelper.createClient('recruiter', baseURL || 'http://localhost:4200');
      
      // Create second browser context
      const context2 = await context.browser()?.newContext();
      const page2 = await context2?.newPage();
      
      if (!page2) throw new Error('Failed to create second page');
      
      // Login second user (recruiter)
      await page2.goto('/login');
      await page2.fill('[data-testid=\"email-input\"]', 'recruiter@test.com');
      await page2.fill('[data-testid=\"password-input\"]', 'TestPass123!');
      await page2.click('[data-testid=\"login-button\"]');
      
      // Navigate to collaborative review page
      const applicationId = 'test-application-123';
      
      await collaborativePage.navigateTo(applicationId);
      
      const collaborativePage2 = new CollaborativeReviewPage(page2);
      await collaborativePage2.navigateTo(applicationId);
      
      // HR Manager adds a comment
      await collaborativePage.addComment('Great technical skills, let\\'s discuss further.');
      
      // Recruiter should see the comment in real-time
      await wsHelper.waitForEvent('recruiter', 'comment.added');
      
      await page2.waitForTimeout(1000);
      const comments = await collaborativePage2.getComments();
      expect(comments).toContain('Great technical skills, let\\'s discuss further.');
      
      // Recruiter updates score
      await collaborativePage2.setScore('communication', 8);
      
      // HR Manager should see score update in real-time
      await wsHelper.waitForEvent('hr-manager', 'score.updated');
      
      await page.waitForTimeout(1000);
      const scores = await collaborativePage.getCurrentScores();
      expect(scores.communication).toBe(8);
      
      // Both users should see each other in active reviewers
      const activeReviewers1 = await collaborativePage.getActiveReviewers();
      const activeReviewers2 = await collaborativePage2.getActiveReviewers();
      
      expect(activeReviewers1).toContain('Recruiter');
      expect(activeReviewers2).toContain('HR Manager');
      
      await page2.close();
      await context2?.close();
    });
  });
  
  test.describe('Notification System', () => {
    test('should receive real-time notifications for job applications', async ({ page, baseURL }) => {
      const client = await wsHelper.createClient('hr-manager', baseURL || 'http://localhost:4200');
      
      await realtimePage.navigateTo();
      await realtimePage.waitForWebSocketConnection();
      
      // Simulate new application notification
      client.socket.emit('simulate.new.application', {
        jobId: 'job-123',
        candidateName: 'John Doe',
        resumeScore: 85
      });
      
      // Should receive notification event
      const notificationEvent = await wsHelper.waitForEvent('hr-manager', 'notification.new.application');
      expect(notificationEvent.args[0].candidateName).toBe('John Doe');
      
      // Should show notification in UI
      await expect(page.locator('[data-testid=\"notification-popup\"]')).toBeVisible();
      await expect(page.locator('[data-testid=\"notification-message\"]')).toContainText('New application from John Doe');
    });
    
    test('should handle notification queue and batch processing', async ({ page, baseURL }) => {
      const client = await wsHelper.createClient('hr-manager', baseURL || 'http://localhost:4200');
      
      await realtimePage.navigateTo();
      await realtimePage.waitForWebSocketConnection();
      
      // Simulate multiple notifications
      for (let i = 1; i <= 5; i++) {
        client.socket.emit('simulate.new.application', {
          jobId: `job-${i}`,
          candidateName: `Candidate ${i}`,
          resumeScore: 70 + i * 5
        });
      }
      
      // Should batch notifications
      await page.waitForTimeout(2000);
      
      const notificationCount = await page.locator('[data-testid=\"notification-badge\"]').textContent();
      expect(parseInt(notificationCount || '0')).toBe(5);
      
      // Click to view all notifications
      await page.click('[data-testid=\"notifications-button\"]');
      
      // Should show all notifications in list
      const notifications = await page.locator('[data-testid=\"notification-item\"]').count();
      expect(notifications).toBe(5);
    });
  });
  
  test.describe('Performance and Scalability', () => {
    test('should handle high-frequency message updates', async ({ page, baseURL }) => {
      const client = await wsHelper.createClient('performance-test', baseURL || 'http://localhost:4200');
      
      await realtimePage.navigateTo();
      await realtimePage.waitForWebSocketConnection();
      
      // Send high-frequency updates
      const messageCount = 100;
      const startTime = Date.now();
      
      for (let i = 0; i < messageCount; i++) {
        client.socket.emit('high.frequency.update', {
          messageId: i,
          timestamp: Date.now()
        });
      }
      
      // Wait for all messages to be processed
      await wsHelper.waitForEvent('performance-test', 'batch.processed');
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Should process messages efficiently (under 5 seconds)
      expect(processingTime).toBeLessThan(5000);
      
      // UI should remain responsive
      const isResponsive = await page.evaluate(() => {
        const start = performance.now();
        // Simulate user interaction
        document.body.click();
        const end = performance.now();
        return (end - start) < 100; // Should respond within 100ms
      });
      
      expect(isResponsive).toBe(true);
    });
    
    test('should maintain memory efficiency during long sessions', async ({ page, baseURL }) => {
      const client = await wsHelper.createClient('memory-test', baseURL || 'http://localhost:4200');
      
      await realtimePage.navigateTo();
      await realtimePage.waitForWebSocketConnection();
      
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        // @ts-ignore
        return performance.memory?.usedJSHeapSize || 0;
      });
      
      // Simulate long session with periodic updates
      for (let i = 0; i < 50; i++) {
        client.socket.emit('periodic.update', { iteration: i });
        await page.waitForTimeout(100);
      }
      
      // Get final memory usage
      const finalMemory = await page.evaluate(() => {
        // @ts-ignore
        return performance.memory?.usedJSHeapSize || 0;
      });
      
      // Memory increase should be reasonable (less than 50MB)
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
    });
  });
});