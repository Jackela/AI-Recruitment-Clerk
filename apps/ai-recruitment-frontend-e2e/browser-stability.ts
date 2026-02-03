/**
 * Browser Stability Utilities
 *
 * Utilities to handle browser-specific connection issues and race conditions
 * in E2E testing, particularly for Firefox stability under parallel execution.
 */

/**
 * Add delay between browser launches to prevent race conditions
 */
export async function addBrowserLaunchDelay(
  browserName: string,
): Promise<void> {
  const delays = {
    chromium: 0, // Launch first
    firefox: 2000, // 2 second delay to avoid connection conflicts
    webkit: 4000, // 4 second delay
  };

  const delay = delays[browserName as keyof typeof delays] || 0;
  if (delay > 0) {
    console.log(
      `⏳ Adding ${delay}ms launch delay for ${browserName} to prevent connection conflicts`,
    );
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

/**
 * Wait for server availability with retries
 * Uses GET instead of HEAD to avoid unhandled request issues
 */
export async function waitForServerReady(
  url: string,
  maxRetries = 30,
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Use GET request with minimal timeout and handle both success and redirect responses
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        redirect: 'manual', // Don't follow redirects, just check if server responds
      });

      clearTimeout(timeoutId);

      // Accept any response that indicates server is running (2xx, 3xx)
      if (response.status >= 200 && response.status < 400) {
        console.log(
          `✅ Server ready at ${url} after ${i + 1} attempts (status: ${response.status})`,
        );
        return true;
      }

      // Even 404 means server is running, just route not found
      if (response.status === 404) {
        console.log(
          `✅ Server responding at ${url} after ${i + 1} attempts (404 is OK for dev server)`,
        );
        return true;
      }
    } catch (error) {
      // Log connection errors for debugging but continue trying
      if (i % 10 === 0) {
        // Log every 10th attempt to reduce spam
        console.log(
          `🔄 Server check ${i + 1}/${maxRetries}: ${error instanceof Error ? error.message : 'Connection failed'}`,
        );
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.warn(`⚠️ Server at ${url} not ready after ${maxRetries} attempts`);
  return false;
}

/**
 * Firefox-specific connection retry wrapper
 */
export async function withFirefoxConnectionRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  let lastError: Error = new Error('Operation failed');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check if it's a Firefox connection error
      if (
        error instanceof Error &&
        (error.message.includes('NS_ERROR_CONNECTION_REFUSED') ||
          error.message.includes('Connection refused'))
      ) {
        console.log(
          `🔄 Firefox connection failed (attempt ${attempt}/${maxRetries}), retrying...`,
        );

        if (attempt < maxRetries) {
          // Wait before retry with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      // Re-throw if not a connection error or max retries reached
      throw error;
    }
  }

  // lastError is guaranteed to be set here since we entered the loop at least once
  throw lastError;
}
