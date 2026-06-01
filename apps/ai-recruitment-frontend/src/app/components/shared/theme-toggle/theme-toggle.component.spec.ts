import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { ThemeToggleComponent } from './theme-toggle.component';
import { ThemeService } from '../../../services/theme/theme.service';

describe('ThemeToggleComponent', () => {
  let component: ThemeToggleComponent;
  let fixture: ComponentFixture<ThemeToggleComponent>;
  let themeService: jest.Mocked<ThemeService>;

  beforeEach(async () => {
    const mockThemeService = {
      currentTheme: jest.fn().mockReturnValue('light'),
      isDarkMode: jest.fn().mockReturnValue(false),
      setTheme: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ThemeToggleComponent],
      providers: [{ provide: ThemeService, useValue: mockThemeService }],
    }).compileComponents();

    themeService = TestBed.inject(ThemeService) as jest.Mocked<ThemeService>;

    fixture = TestBed.createComponent(ThemeToggleComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Rendering Tests', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should render desktop toggle container', () => {
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector(
        '.theme-toggle-container',
      );
      expect(container).toBeTruthy();
    });

    it('should render mobile dropdown', () => {
      fixture.detectChanges();

      const mobileToggle = fixture.nativeElement.querySelector(
        '.theme-toggle-mobile',
      );
      expect(mobileToggle).toBeTruthy();
    });

    it('should render three theme buttons in desktop view', () => {
      fixture.detectChanges();

      const buttons =
        fixture.nativeElement.querySelectorAll('.theme-toggle-btn');
      expect(buttons.length).toBe(3);
    });

    it('should render light theme button', () => {
      fixture.detectChanges();

      const lightBtn = fixture.nativeElement.querySelector(
        '.theme-toggle-btn[title="明亮模式"]',
      );
      expect(lightBtn).toBeTruthy();
    });

    it('should render auto theme button', () => {
      fixture.detectChanges();

      const autoBtn = fixture.nativeElement.querySelector(
        '.theme-toggle-btn[title="跟随系统"]',
      );
      expect(autoBtn).toBeTruthy();
    });

    it('should render dark theme button', () => {
      fixture.detectChanges();

      const darkBtn = fixture.nativeElement.querySelector(
        '.theme-toggle-btn[title="暗黑模式"]',
      );
      expect(darkBtn).toBeTruthy();
    });
  });

  describe('Input/Output Tests', () => {
    it('should have default dropdown state as closed', () => {
      expect(component.dropdownOpen).toBe(false);
    });

    it('should expose currentTheme computed signal', () => {
      themeService.currentTheme.mockReturnValue('dark');
      fixture.detectChanges();

      expect(component.currentTheme()).toBe('dark');
    });

    it('should expose isDarkMode computed signal', () => {
      themeService.isDarkMode.mockReturnValue(true);
      fixture.detectChanges();

      expect(component.isDarkMode()).toBe(true);
    });
  });

  describe('Event Trigger Tests', () => {
    it('should call setTheme with light when light button clicked', () => {
      fixture.detectChanges();

      const lightBtn = fixture.nativeElement.querySelector(
        '.theme-toggle-btn[title="明亮模式"]',
      );
      lightBtn.click();

      expect(themeService.setTheme).toHaveBeenCalledWith('light');
    });

    it('should call setTheme with auto when auto button clicked', () => {
      fixture.detectChanges();

      const autoBtn = fixture.nativeElement.querySelector(
        '.theme-toggle-btn[title="跟随系统"]',
      );
      autoBtn.click();

      expect(themeService.setTheme).toHaveBeenCalledWith('auto');
    });

    it('should call setTheme with dark when dark button clicked', () => {
      fixture.detectChanges();

      const darkBtn = fixture.nativeElement.querySelector(
        '.theme-toggle-btn[title="暗黑模式"]',
      );
      darkBtn.click();

      expect(themeService.setTheme).toHaveBeenCalledWith('dark');
    });

    it('should toggle dropdown when mobile button clicked', () => {
      fixture.detectChanges();

      const dropdownBtn = fixture.nativeElement.querySelector(
        '.theme-toggle-dropdown-btn',
      );
      dropdownBtn.click();

      expect(component.dropdownOpen).toBe(true);
    });

    it('should close dropdown when selectTheme is called', () => {
      component.dropdownOpen = true;
      component.selectTheme('dark');

      expect(component.dropdownOpen).toBe(false);
      expect(themeService.setTheme).toHaveBeenCalledWith('dark');
    });
  });

  describe('Service Integration Tests', () => {
    it('should initialize with theme service', () => {
      expect(themeService.currentTheme).toBeDefined();
      expect(themeService.isDarkMode).toBeDefined();
    });

    it('should set theme through service', () => {
      component.setTheme('dark');

      expect(themeService.setTheme).toHaveBeenCalledWith('dark');
    });

    it('should remove outside click listener on destroy', () => {
      const removeEventListenerSpy = jest.spyOn(
        document,
        'removeEventListener',
      );

      fixture.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
      );
    });
  });

  describe('getThemeLabel Tests', () => {
    it('should return 明亮 for light theme', () => {
      themeService.currentTheme.mockReturnValue('light');
      fixture.detectChanges();

      expect(component.getThemeLabel()).toBe('明亮');
    });

    it('should return 暗黑 for dark theme', () => {
      themeService.currentTheme.mockReturnValue('dark');
      fixture.detectChanges();

      expect(component.getThemeLabel()).toBe('暗黑');
    });

    it('should return 自动 for auto theme', () => {
      themeService.currentTheme.mockReturnValue('auto');
      fixture.detectChanges();

      expect(component.getThemeLabel()).toBe('自动');
    });

    it('should return 主题 for unknown theme', () => {
      themeService.currentTheme.mockReturnValue('unknown' as any);
      fixture.detectChanges();

      expect(component.getThemeLabel()).toBe('主题');
    });
  });

  describe('Active State Tests', () => {
    it('should apply active class to light button when theme is light', () => {
      themeService.currentTheme.mockReturnValue('light');
      fixture.detectChanges();

      const buttons =
        fixture.nativeElement.querySelectorAll('.theme-toggle-btn');
      expect(buttons[0].classList.contains('active')).toBe(true);
    });

    it('should apply active class to auto button when theme is auto', () => {
      themeService.currentTheme.mockReturnValue('auto');
      fixture.detectChanges();

      const buttons =
        fixture.nativeElement.querySelectorAll('.theme-toggle-btn');
      expect(buttons[1].classList.contains('active')).toBe(true);
    });

    it('should apply active class to dark button when theme is dark', () => {
      themeService.currentTheme.mockReturnValue('dark');
      fixture.detectChanges();

      const buttons =
        fixture.nativeElement.querySelectorAll('.theme-toggle-btn');
      expect(buttons[2].classList.contains('active')).toBe(true);
    });
  });

  describe('Dropdown Tests', () => {
    it('should toggle dropdown state', () => {
      expect(component.dropdownOpen).toBe(false);

      component.toggleDropdown();
      expect(component.dropdownOpen).toBe(true);

      component.toggleDropdown();
      expect(component.dropdownOpen).toBe(false);
    });

    it('should close dropdown when selecting theme', () => {
      component.dropdownOpen = true;
      component.selectTheme('dark');

      expect(component.dropdownOpen).toBe(false);
    });

    it('should render dropdown options when open', () => {
      component.dropdownOpen = true;
      fixture.detectChanges();

      const dropdown = fixture.nativeElement.querySelector('.theme-dropdown');
      expect(dropdown.classList.contains('open')).toBe(true);

      const options = dropdown.querySelectorAll('.theme-option');
      expect(options.length).toBe(3);
    });
  });

  describe('Accessibility Tests', () => {
    it('should have button type attribute', () => {
      fixture.detectChanges();

      const buttons =
        fixture.nativeElement.querySelectorAll('.theme-toggle-btn');
      buttons.forEach((btn: HTMLButtonElement) => {
        expect(btn.getAttribute('type')).toBe('button');
      });
    });

    it('should have title attributes for desktop buttons', () => {
      fixture.detectChanges();

      const lightBtn = fixture.nativeElement.querySelector(
        '.theme-toggle-btn[title="明亮模式"]',
      );
      expect(lightBtn).toBeTruthy();
    });

    it('should have aria-label support in mobile dropdown', () => {
      component.dropdownOpen = true;
      fixture.detectChanges();

      const options = fixture.nativeElement.querySelectorAll('.theme-option');
      expect(options.length).toBeGreaterThan(0);
    });
  });

  describe('Lifecycle Tests', () => {
    it('should setup outside click handler on init', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      fixture = TestBed.createComponent(ThemeToggleComponent);
      component = fixture.componentInstance;

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
      );
    });

    it('should cleanup on destroy', () => {
      const removeEventListenerSpy = jest.spyOn(
        document,
        'removeEventListener',
      );

      fixture.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalled();
    });
  });
});
