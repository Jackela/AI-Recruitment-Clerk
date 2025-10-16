import { http, HttpResponse } from 'msw';

/**
 * Mock handlers for guest API endpoints used in E2E tests.
 * Ensure all responses are valid JSON to avoid parsing errors in the frontend.
 */
export const guestHandlers = [
  http.get('**/api/guest/stats', () => {
    const payload = {
      totalGuests: 1247,
      activeGuests: 312,
      pendingFeedbackCodes: 48,
      redeemedFeedbackCodes: 196,
      lastUpdated: new Date().toISOString(),
    };

    return HttpResponse.json(payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }),
];

export const handlers = [...guestHandlers];
