import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { ServiceUnavailableComponent } from './service-unavailable.component';
import { ConnectionService } from '../../services/connection.service';
import { signal } from '@angular/core';

describe('ServiceUnavailableComponent', () => {
  let component: ServiceUnavailableComponent;
  let fixture: ComponentFixture<ServiceUnavailableComponent>;
  let connectionService: jest.Mocked<ConnectionService>;

  const createMockConnectionStatus = (overrides = {}) => ({
    isOffline: true,
    lastChecked: new Date('2024-03-15T10:00:00'),
    backendAvailable: false,
    errorMessage: '后端服务不可用，请检查网络连接或服务状态',
    ...overrides,
  });

  const mockConnectionService = {
    getConnectionStatus: jest
      .fn()
      .mockReturnValue(signal(createMockConnectionStatus())),
    getIsChecking: jest.fn().mockReturnValue(signal(false)),
    retryConnection: jest.fn().mockResolvedValue(true),
    isOffline: jest.fn().mockReturnValue(true),
    checkBackendConnection: jest.fn().mockResolvedValue(true),
    assertBackendAvailable: jest.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceUnavailableComponent],
      providers: [
        {
          provide: ConnectionService,
          useValue: mockConnectionService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceUnavailableComponent);
    component = fixture.componentInstance;
    connectionService = TestBed.inject(
      ConnectionService,
    ) as jest.Mocked<ConnectionService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Display', () => {
    it('should display overlay when offline', () => {
      fixture.detectChanges();

      const overlay = fixture.nativeElement.querySelector(
        '.service-unavailable-overlay',
      );
      expect(overlay).toBeTruthy();
    });

    it('should not display overlay when online', () => {
      connectionService.getConnectionStatus.mockReturnValue(
        signal(createMockConnectionStatus({ isOffline: false })),
      );
      fixture.detectChanges();

      const overlay = fixture.nativeElement.querySelector(
        '.service-unavailable-overlay',
      );
      expect(overlay).toBeFalsy();
    });

    it('should display error title', () => {
      fixture.detectChanges();

      const title = fixture.nativeElement.querySelector('.error-title');
      expect(title.textContent).toContain('服务暂时不可用');
    });

    it('should display error message from service', () => {
      fixture.detectChanges();

      const message = fixture.nativeElement.querySelector('.error-message');
      expect(message.textContent).toContain('后端服务不可用');
    });

    it('should display required services list', () => {
      fixture.detectChanges();

      const details = fixture.nativeElement.querySelector('.error-details');
      expect(details.textContent).toContain('后端 API 服务');
      expect(details.textContent).toContain('AI/LLM 分析服务');
      expect(details.textContent).toContain('数据库存储服务');
    });

    it('should display last checked time when available', () => {
      fixture.detectChanges();

      const lastChecked = fixture.nativeElement.querySelector('.last-checked');
      expect(lastChecked).toBeTruthy();
      expect(lastChecked.textContent).toContain('上次检查');
    });

    it('should not display last checked when not available', () => {
      connectionService.getConnectionStatus.mockReturnValue(
        signal(createMockConnectionStatus({ lastChecked: null })),
      );
      fixture.detectChanges();

      const lastChecked = fixture.nativeElement.querySelector('.last-checked');
      expect(lastChecked).toBeFalsy();
    });
  });

  describe('Retry Functionality', () => {
    it('should have retry button', () => {
      fixture.detectChanges();

      const retryButton = fixture.nativeElement.querySelector('.retry-btn');
      expect(retryButton).toBeTruthy();
      expect(retryButton.textContent).toContain('重新连接');
    });

    it('should call retryConnection when retry button is clicked', async () => {
      fixture.detectChanges();

      const retryButton = fixture.nativeElement.querySelector('.retry-btn');
      retryButton.click();

      expect(connectionService.retryConnection).toHaveBeenCalled();
    });

    it('should disable retry button when checking', () => {
      connectionService.getIsChecking.mockReturnValue(signal(true));
      fixture.detectChanges();

      const retryButton = fixture.nativeElement.querySelector('.retry-btn');
      expect(retryButton.disabled).toBe(true);
      expect(retryButton.textContent).toContain('检查中');
    });

    it('should enable retry button when not checking', () => {
      connectionService.getIsChecking.mockReturnValue(signal(false));
      fixture.detectChanges();

      const retryButton = fixture.nativeElement.querySelector('.retry-btn');
      expect(retryButton.disabled).toBe(false);
      expect(retryButton.textContent).toContain('重新连接');
    });
  });

  describe('Config Button', () => {
    it('should have config button', () => {
      fixture.detectChanges();

      const configButton = fixture.nativeElement.querySelector('.config-btn');
      expect(configButton).toBeTruthy();
      expect(configButton.textContent).toContain('检查配置');
    });

    it('should show config alert when config button is clicked', () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      fixture.detectChanges();

      const configButton = fixture.nativeElement.querySelector('.config-btn');
      configButton.click();

      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining('后端服务是否已启动'),
      );

      alertSpy.mockRestore();
    });

    it('should show configuration tips in alert', () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      fixture.detectChanges();

      const configButton = fixture.nativeElement.querySelector('.config-btn');
      configButton.click();

      const alertMessage = alertSpy.mock.calls[0][0];
      expect(alertMessage).toContain('环境变量是否正确设置');
      expect(alertMessage).toContain('网络连接是否正常');
      expect(alertMessage).toContain('API 地址是否正确');
      expect(alertMessage).toContain('npm run dev:gateway');

      alertSpy.mockRestore();
    });
  });

  describe('Visual Elements', () => {
    it('should display error icon', () => {
      fixture.detectChanges();

      const errorIcon = fixture.nativeElement.querySelector('.error-icon');
      expect(errorIcon).toBeTruthy();
    });

    it('should have styled error container', () => {
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.error-container');
      expect(container).toBeTruthy();
    });

    it('should have gradient overlay background', () => {
      fixture.detectChanges();

      const overlay = fixture.nativeElement.querySelector(
        '.service-unavailable-overlay',
      );
      expect(overlay).toBeTruthy();
    });
  });

  describe('Integration with ConnectionService', () => {
    it('should inject ConnectionService', () => {
      expect(component.connectionService).toBeTruthy();
    });

    it('should use connection status from service', () => {
      fixture.detectChanges();

      const status = connectionService.getConnectionStatus();
      expect(status().isOffline).toBe(true);
    });

    it('should use isChecking from service', () => {
      fixture.detectChanges();

      const isChecking = connectionService.getIsChecking();
      expect(isChecking()).toBe(false);
    });
  });

  describe('Error Messages', () => {
    it('should display connection error message', () => {
      connectionService.getConnectionStatus.mockReturnValue(
        signal(
          createMockConnectionStatus({
            errorMessage: '无法连接到后端服务',
          }),
        ),
      );
      fixture.detectChanges();

      const message = fixture.nativeElement.querySelector('.error-message');
      expect(message.textContent).toContain('无法连接到后端服务');
    });

    it('should handle null error message', () => {
      connectionService.getConnectionStatus.mockReturnValue(
        signal(
          createMockConnectionStatus({
            errorMessage: null,
          }),
        ),
      );
      fixture.detectChanges();

      const message = fixture.nativeElement.querySelector('.error-message');
      expect(message).toBeTruthy();
    });
  });

  describe('Date Formatting', () => {
    it('should format last checked date', () => {
      const testDate = new Date('2024-03-15T10:30:45');
      connectionService.getConnectionStatus.mockReturnValue(
        signal(
          createMockConnectionStatus({
            lastChecked: testDate,
          }),
        ),
      );
      fixture.detectChanges();

      const lastChecked = fixture.nativeElement.querySelector('.last-checked');
      expect(lastChecked.textContent).toContain('2024');
    });
  });

  describe('Button States', () => {
    it('should have both buttons in actions container', () => {
      fixture.detectChanges();

      const actions = fixture.nativeElement.querySelector('.error-actions');
      const buttons = actions.querySelectorAll('button');
      expect(buttons.length).toBe(2);
    });

    it('should style retry button as primary', () => {
      fixture.detectChanges();

      const retryButton = fixture.nativeElement.querySelector('.retry-btn');
      expect(retryButton.classList.contains('retry-btn')).toBe(true);
    });

    it('should style config button as secondary', () => {
      fixture.detectChanges();

      const configButton = fixture.nativeElement.querySelector('.config-btn');
      expect(configButton.classList.contains('config-btn')).toBe(true);
    });
  });

  describe('Async Operations', () => {
    it('should handle async retryConnection', async () => {
      connectionService.retryConnection.mockResolvedValueOnce(true);

      await component.retryConnection();

      expect(connectionService.retryConnection).toHaveBeenCalled();
    });

    it('should handle failed retryConnection', async () => {
      connectionService.retryConnection.mockRejectedValueOnce(
        new Error('Network error'),
      );

      await expect(component.retryConnection()).rejects.toThrow(
        'Network error',
      );
    });
  });
});
