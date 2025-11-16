import { TestBed } from '@angular/core/testing';
import { WebSocketService, WebSocketMessage } from './websocket.service';
import { ToastService } from './toast.service';

type SocketHandler = (payload: any) => void;

class FakeSocket {
  handlers: Record<string, SocketHandler[]> = {};
  emitted: Array<{ event: string; data: unknown }> = [];
  connected = false;

  on(event: string, handler: SocketHandler): this {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    this.handlers[event]?.push(handler);
    return this;
  }

  emit(event: string, data: unknown): void {
    this.emitted.push({ event, data });
  }

  emitFromServer(event: string, payload?: unknown): void {
    if (event === 'connect') {
      this.connected = true;
    }
    if (event === 'disconnect') {
      this.connected = false;
    }
    this.handlers[event]?.forEach((handler) => handler(payload));
  }

  disconnect(): void {
    this.connected = false;
    this.handlers = {};
  }
}

const ioMock = jest.fn();

jest.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => ioMock(...args),
}));

describe('WebSocketService', () => {
  let service: WebSocketService;
  let socket: FakeSocket;
  const toastService = {
    error: jest.fn(),
    success: jest.fn(),
  };

  beforeEach(() => {
    ioMock.mockImplementation(() => {
      socket = new FakeSocket();
      return socket as unknown;
    });

    TestBed.configureTestingModule({
      providers: [
        WebSocketService,
        { provide: ToastService, useValue: toastService },
      ],
    });

    service = TestBed.inject(WebSocketService);
    jest.clearAllMocks();
  });

  it('connects and processes progress/completion messages', () => {
    const statuses: string[] = [];
    service.getConnectionStatus().subscribe((status) => statuses.push(status));

    const progressUpdates: Array<{ progress: number; currentStep: string }> =
      [];
    const completions: WebSocketMessage['data'][] = [];

    service.onProgress('session-1').subscribe((msg) => progressUpdates.push(msg));
    service.onCompletion('session-1').subscribe((msg) => completions.push(msg));

    service.connect('session-1').subscribe();
    socket.emitFromServer('connect');

    const progressPayload = {
      sessionId: 'session-1',
      type: 'progress' as const,
      data: { progress: 50, currentStep: 'analyzing' },
      timestamp: new Date().toISOString(),
    };
    socket.emitFromServer('message', progressPayload);

    const completionPayload = {
      sessionId: 'session-1',
      type: 'completed' as const,
      data: {
        analysisId: 'a1',
        processingTime: 120,
        result: { summary: 'done', score: 90 } as unknown,
      },
      timestamp: new Date().toISOString(),
    };
    socket.emitFromServer('message', completionPayload);

    expect(statuses).toContain('connecting');
    expect(statuses).toContain('connected');
    expect(progressUpdates).toEqual([
      { progress: 50, currentStep: 'analyzing' },
    ]);
    expect(completions).toHaveLength(1);
    expect(
      socket.emitted.find((call) => call.event === 'subscribe_session'),
    ).toBeTruthy();
  });

  it('handles error and disconnect events', () => {
    const statusStream: string[] = [];
    service.getConnectionStatus().subscribe((status) => statusStream.push(status));
    const errors: Array<{ error: string }> = [];
    service.onError('session-2').subscribe((msg) => errors.push(msg));

    service.connect('session-2').subscribe();
    socket.emitFromServer('connect_error');

    const errorPayload = {
      sessionId: 'session-2',
      type: 'error' as const,
      data: { error: 'failed' },
      timestamp: new Date().toISOString(),
    };
    socket.emitFromServer('message', errorPayload);

    socket.emitFromServer('job_subscription_error', {
      jobId: 'j-1',
      error: 'denied',
      timestamp: new Date(),
    });

    socket.emitFromServer('disconnect');

    expect(statusStream).toContain('error');
    expect(statusStream).toContain('disconnected');
    expect(errors).toEqual([{ error: 'failed' }]);
    expect(toastService.error).toHaveBeenCalledWith(
      'Failed to subscribe to job updates: denied',
    );
  });

  it('cleans up on destroy', () => {
    const statusStream: string[] = [];
    service.getConnectionStatus().subscribe((status) => statusStream.push(status));

    service.connect('session-3').subscribe();
    socket.emitFromServer('connect');

    service.ngOnDestroy();
    socket.emitFromServer('message', {
      sessionId: 'session-3',
      type: 'progress' as const,
      data: { progress: 10, currentStep: 'init' },
      timestamp: new Date(),
    });

    expect(statusStream.at(-1)).toBe('disconnected');
    expect(socket.connected).toBe(false);
  });
});
