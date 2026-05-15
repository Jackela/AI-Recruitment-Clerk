import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import {
  AnalyticsItemsListComponent,
  type AnalyticsListItem,
} from './analytics-items-list.component';

describe('AnalyticsItemsListComponent', () => {
  let component: AnalyticsItemsListComponent;
  let fixture: ComponentFixture<AnalyticsItemsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalyticsItemsListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AnalyticsItemsListComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Rendering Tests', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should render recent items container', () => {
      fixture.componentRef.setInput('title', 'Recent Items');
      fixture.componentRef.setInput('items', [
        { title: 'Item 1' },
        { title: 'Item 2' },
      ]);
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.recent-items');
      expect(container).toBeTruthy();
    });

    it('should render title', () => {
      fixture.componentRef.setInput('title', 'Recent Jobs');
      fixture.componentRef.setInput('items', [{ title: 'Job 1' }]);
      fixture.detectChanges();

      const title = fixture.nativeElement.querySelector('h4');
      expect(title).toBeTruthy();
      expect(title.textContent.trim()).toBe('Recent Jobs');
    });

    it('should render item list', () => {
      fixture.componentRef.setInput('title', 'Items');
      fixture.componentRef.setInput('items', [
        { title: 'Item 1' },
        { title: 'Item 2' },
      ]);
      fixture.detectChanges();

      const list = fixture.nativeElement.querySelector('.item-list');
      expect(list).toBeTruthy();
    });

    it('should not render when items array is empty', () => {
      fixture.componentRef.setInput('title', 'Items');
      fixture.componentRef.setInput('items', []);
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.recent-items');
      expect(container).toBeFalsy();
    });
  });

  describe('Input Tests', () => {
    it('should bind title input correctly', () => {
      fixture.componentRef.setInput('title', 'Test Title');
      fixture.componentRef.setInput('items', [{ title: 'Item' }]);
      fixture.detectChanges();

      const title = fixture.nativeElement.querySelector('h4');
      expect(title.textContent.trim()).toBe('Test Title');
    });

    it('should bind items input correctly', () => {
      const items: AnalyticsListItem[] = [
        { title: 'First Item' },
        { title: 'Second Item' },
      ];
      fixture.componentRef.setInput('title', 'List');
      fixture.componentRef.setInput('items', items);
      fixture.detectChanges();

      const itemElements =
        fixture.nativeElement.querySelectorAll('.item-title');
      expect(itemElements.length).toBe(2);
      expect(itemElements[0].textContent.trim()).toBe('First Item');
    });
  });

  describe('Item Rendering Tests', () => {
    it('should render item title', () => {
      fixture.componentRef.setInput('title', 'Items');
      fixture.componentRef.setInput('items', [{ title: 'Test Item' }]);
      fixture.detectChanges();

      const itemTitle = fixture.nativeElement.querySelector('.item-title');
      expect(itemTitle.textContent.trim()).toBe('Test Item');
    });

    it('should render status badge when status provided', () => {
      fixture.componentRef.setInput('title', 'Items');
      fixture.componentRef.setInput('items', [
        { title: 'Item 1', status: 'active' },
      ]);
      fixture.detectChanges();

      const status = fixture.nativeElement.querySelector('.item-status');
      expect(status).toBeTruthy();
      expect(status.classList.contains('status-active')).toBe(true);
    });

    it('should render score badge when badge provided', () => {
      fixture.componentRef.setInput('title', 'Items');
      fixture.componentRef.setInput('items', [{ title: 'Item 1', badge: 95 }]);
      fixture.detectChanges();

      const score = fixture.nativeElement.querySelector('.item-score');
      expect(score).toBeTruthy();
      expect(score.textContent.trim()).toBe('95');
    });

    it('should prioritize badge over status', () => {
      fixture.componentRef.setInput('title', 'Items');
      fixture.componentRef.setInput('items', [
        { title: 'Item 1', status: 'active', badge: 100 },
      ]);
      fixture.detectChanges();

      const score = fixture.nativeElement.querySelector('.item-score');
      const status = fixture.nativeElement.querySelector('.item-status');
      expect(score).toBeTruthy();
      expect(status).toBeFalsy();
    });
  });

  describe('Status Styling Tests', () => {
    const statuses = [
      'active',
      'draft',
      'closed',
      'completed',
      'processing',
      'failed',
      'processed',
      'pending',
    ];

    statuses.forEach((status) => {
      it(`should apply ${status} status class`, () => {
        fixture.componentRef.setInput('title', 'Items');
        fixture.componentRef.setInput('items', [{ title: 'Item 1', status }]);
        fixture.detectChanges();

        const statusEl = fixture.nativeElement.querySelector('.item-status');
        expect(statusEl.classList.contains(`status-${status}`)).toBe(true);
      });
    });
  });
});
