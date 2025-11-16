import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import {
  MobileSwipeComponent,
  SwipeAction,
  SwipeEvent,
} from './mobile-swipe.component';

@Component({
  selector: 'arc-swipe-host',
  standalone: true,
  imports: [MobileSwipeComponent],
  template: `
    <arc-mobile-swipe
      [actions]="actions"
      [item]="item"
      (swipeAction)="onSwipeAction($event)"
    >
      <div class="content">Swipe me</div>
    </arc-mobile-swipe>
  `,
})
class SwipeHostComponent {
  actions: SwipeAction[] = [
    { id: 'delete', label: 'Delete', icon: 'M0 0', color: 'danger' },
    { id: 'archive', label: 'Archive', icon: 'M0 0', color: 'primary' },
  ];
  item = { id: '1', name: 'Item 1' };
  lastEvent?: SwipeEvent;

  onSwipeAction(evt: SwipeEvent) {
    this.lastEvent = evt;
  }
}

describe('MobileSwipeComponent', () => {
  let fixture: ComponentFixture<SwipeHostComponent>;
  let host: SwipeHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SwipeHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SwipeHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders actions and emits on action click', () => {
    const actionButtons = fixture.debugElement.queryAll(
      By.css('.swipe-action'),
    );
    expect(actionButtons.length).toBe(2);

    actionButtons[0].nativeElement.click();
    fixture.detectChanges();

    expect(host.lastEvent?.action.id).toBe('delete');
    expect(host.lastEvent?.item).toEqual(host.item);
  });

  it('tracks swipe movement and shows actions', () => {
    const container = fixture.debugElement.query(
      By.css('.mobile-swipe-container'),
    ).nativeElement as HTMLElement;

    // JSDOM does not implement Touch; exercise mouse event path
    container.dispatchEvent(
      new MouseEvent('mousedown', { clientX: 100, clientY: 0 }),
    );
    container.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 50, clientY: 0 }),
    );
    container.dispatchEvent(new MouseEvent('mouseup'));
    fixture.detectChanges();

    expect(
      container.classList.contains('actions-visible') ||
        container.querySelector('.swipe-content')?.getAttribute('style'),
    ).toBeTruthy();
  });
});
