import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MobileResultsEmptyComponent } from './mobile-results-empty.component';

describe('MobileResultsEmptyComponent', () => {
  let component: MobileResultsEmptyComponent;
  let fixture: ComponentFixture<MobileResultsEmptyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileResultsEmptyComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MobileResultsEmptyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Default Properties', () => {
    it('should have default title', () => {
      expect(component.title).toBe('No candidates found');
    });

    it('should have default message', () => {
      expect(component.message).toBe(
        'Try adjusting your filters or search criteria',
      );
    });

    it('should have default actionLabel', () => {
      expect(component.actionLabel).toBe('Clear Filters');
    });
  });

  describe('Output Events', () => {
    it('should emit clearFilters event', () => {
      const emitSpy = jest.spyOn(component.clearFilters, 'emit');
      component.clearFilters.emit();
      expect(emitSpy).toHaveBeenCalled();
    });
  });

  describe('Template Rendering', () => {
    it('should render empty state container', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.empty-state')).toBeTruthy();
    });

    it('should render empty icon', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.empty-icon')).toBeTruthy();
    });

    it('should render title', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const title = compiled.querySelector('.empty-title');
      expect(title?.textContent).toContain('No candidates found');
    });

    it('should render message', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const message = compiled.querySelector('.empty-message');
      expect(message?.textContent).toContain('Try adjusting your filters');
    });

    it('should render action button', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const button = compiled.querySelector('.empty-action');
      expect(button).toBeTruthy();
      expect(button?.textContent).toContain('Clear Filters');
    });

    it('should emit event on button click', () => {
      const emitSpy = jest.spyOn(component.clearFilters, 'emit');
      const compiled = fixture.nativeElement as HTMLElement;
      const button = compiled.querySelector('.empty-action');
      button?.dispatchEvent(new Event('click'));
      expect(emitSpy).toHaveBeenCalled();
    });
  });
});
