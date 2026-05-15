import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { MobileActivityListComponent } from './mobile-activity-list.component';
import type { ActivityItem } from '../../services/mobile/mobile-dashboard.service';

describe('MobileActivityListComponent', () => {
  let component: MobileActivityListComponent;
  let fixture: ComponentFixture<MobileActivityListComponent>;

  const mockActivities: ActivityItem[] = [
    {
      id: '1',
      title: 'Candidate Shortlisted',
      subtitle: 'John Doe for Senior Developer',
      timeAgo: '2 hours ago',
      icon: 'M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z',
      type: 'success',
    },
    {
      id: '2',
      title: 'Resume Uploaded',
      subtitle: 'Jane Smith uploaded resume',
      timeAgo: '4 hours ago',
      icon: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z',
      type: 'info',
    },
    {
      id: '3',
      title: 'Interview Scheduled',
      subtitle: 'With Mike Johnson',
      timeAgo: '1 day ago',
      icon: 'M19,19H5V8H19M16,1V3H8V1H6V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3H18V1',
      type: 'warning',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileActivityListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MobileActivityListComponent);
    component = fixture.componentInstance;
    component.activities = mockActivities;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Input Properties', () => {
    it('should accept activities input', () => {
      expect(component.activities).toBe(mockActivities);
    });

    it('should handle empty activities array', () => {
      component.activities = [];
      fixture.detectChanges();
      expect(component.activities.length).toBe(0);
    });
  });

  describe('Output Events', () => {
    it('should emit activityClick event when activity is clicked', () => {
      const emitSpy = jest.spyOn(component.activityClick, 'emit');
      const activity = mockActivities[0];
      component.onActivityClick(activity);
      expect(emitSpy).toHaveBeenCalledWith(activity);
    });
  });

  describe('Methods', () => {
    it('should emit activity on click', () => {
      const emitSpy = jest.spyOn(component.activityClick, 'emit');
      component.onActivityClick(mockActivities[0]);
      expect(emitSpy).toHaveBeenCalledWith(mockActivities[0]);
    });
  });

  describe('Template Rendering', () => {
    it('should render activity list container', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.recent-activity')).toBeTruthy();
    });

    it('should render section title', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const title = compiled.querySelector('.section-title');
      expect(title).toBeTruthy();
      expect(title?.textContent).toContain('Recent Activity');
    });

    it('should render activity items', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const items = compiled.querySelectorAll('.activity-item');
      expect(items.length).toBe(3);
    });

    it('should render activity titles', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const titles = compiled.querySelectorAll('.activity-title');
      expect(titles.length).toBe(3);
      expect(titles[0].textContent).toContain('Candidate Shortlisted');
    });

    it('should render activity subtitles', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const subtitles = compiled.querySelectorAll('.activity-subtitle');
      expect(subtitles.length).toBe(3);
      expect(subtitles[0].textContent).toContain('John Doe');
    });

    it('should render activity times', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const times = compiled.querySelectorAll('.activity-time');
      expect(times.length).toBe(3);
      expect(times[0].textContent).toContain('2 hours ago');
    });

    it('should apply correct type classes to icons', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const icons = compiled.querySelectorAll('.activity-icon');
      expect(icons[0].classList.contains('activity-icon--success')).toBe(true);
      expect(icons[1].classList.contains('activity-icon--info')).toBe(true);
      expect(icons[2].classList.contains('activity-icon--warning')).toBe(true);
    });

    it('should hide container when activities array is empty', () => {
      component.activities = [];
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.recent-activity')).toBeFalsy();
    });

    it('should make activity items clickable', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const items = compiled.querySelectorAll('.activity-item');
      expect(items[0].getAttribute('role')).toBe('button');
      expect(items[0].getAttribute('tabindex')).toBe('0');
    });
  });
});
