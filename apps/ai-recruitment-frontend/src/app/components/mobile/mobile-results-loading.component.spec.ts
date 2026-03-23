import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { MobileResultsLoadingComponent } from './mobile-results-loading.component';

describe('MobileResultsLoadingComponent', () => {
  let component: MobileResultsLoadingComponent;
  let fixture: ComponentFixture<MobileResultsLoadingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileResultsLoadingComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MobileResultsLoadingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Default Properties', () => {
    it('should have default message', () => {
      expect(component.message).toBe('Loading candidates...');
    });
  });

  describe('Template Rendering', () => {
    it('should render loading state container', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.loading-state')).toBeTruthy();
    });

    it('should render loading spinner', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.loading-spinner')).toBeTruthy();
    });

    it('should render loading message', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const message = compiled.querySelector('p');
      expect(message?.textContent).toContain('Loading candidates...');
    });

    it('should render spinner animation elements', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const spinner = compiled.querySelector('.loading-spinner');
      expect(spinner).toBeTruthy();
    });
  });
});
