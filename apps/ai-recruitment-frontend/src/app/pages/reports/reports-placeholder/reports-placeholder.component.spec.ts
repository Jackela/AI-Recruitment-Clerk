import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ReportsPlaceholderComponent } from './reports-placeholder.component';
import { ApiService } from '../../../services/api.service';

describe('ReportsPlaceholderComponent', () => {
  let component: ReportsPlaceholderComponent;
  let fixture: ComponentFixture<ReportsPlaceholderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsPlaceholderComponent],
      providers: [
        {
          provide: ApiService,
          useValue: {
            getReports: jest.fn().mockReturnValue(
              of({
                reports: [],
                totalCount: 0,
              }),
            ),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportsPlaceholderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });
  });

  describe('Template Rendering', () => {
    it('should render reports page content', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('报告');
      expect(compiled.textContent).toContain('暂无报告');
    });
  });
});
