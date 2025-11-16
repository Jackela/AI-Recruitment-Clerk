import { Component, ViewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { LazyLoadDirective, LazyLoadConfig } from './lazy-load.directive';

let intersectionCallback: ((entries: IntersectionObserverEntry[]) => void) | null;
let observerInstances: MockIntersectionObserver[] = [];
let shouldError = false;

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin = '0px';
  readonly thresholds: ReadonlyArray<number> = [];

  constructor(
    callback: (entries: IntersectionObserverEntry[]) => void,
    public options?: IntersectionObserverInit,
  ) {
    intersectionCallback = callback;
    observerInstances.push(this);
  }

  disconnect = jest.fn();
  observe = jest.fn();
  takeRecords = jest.fn<IntersectionObserverEntry[], []>(() => []);
  unobserve = jest.fn();
}

class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  set src(_value: string) {
    setTimeout(() => {
      if (shouldError) {
        this.onerror?.();
      } else {
        this.onload?.();
      }
    }, 0);
  }
}

@Component({
  standalone: true,
  imports: [LazyLoadDirective],
  template: `<img arcLazyLoad="http://example.com/photo.png" />`,
})
class HostImageComponent {
  @ViewChild(LazyLoadDirective, { static: true })
  directive!: LazyLoadDirective;
}

@Component({
  standalone: true,
  imports: [LazyLoadDirective],
  template: `<div arcLazyLoad="http://example.com/fail.png" [lazyLoadConfig]="config"></div>`,
})
class HostErrorComponent {
  @ViewChild(LazyLoadDirective, { static: true })
  directive!: LazyLoadDirective;

  config: LazyLoadConfig = {
    retryCount: 1,
    retryDelay: 0,
    fadeIn: false,
  };
}

describe('LazyLoadDirective', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    intersectionCallback = null;
    observerInstances = [];
    shouldError = false;
    Object.defineProperty(window, 'IntersectionObserver', {
      writable: true,
      value: MockIntersectionObserver,
    });
    Object.defineProperty(window, 'Image', {
      writable: true,
      value: MockImage,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('loads images when intersecting and emits lazyLoaded', () => {
    TestBed.configureTestingModule({
      imports: [HostImageComponent],
    });
    const fixture = TestBed.createComponent(HostImageComponent);
    const loadedSpy = jest.fn();
    fixture.componentInstance.directive.lazyLoaded.subscribe(loadedSpy);
    fixture.detectChanges();

    const img = fixture.debugElement.query(By.css('img')).nativeElement;
    intersectionCallback?.([
      {
        isIntersecting: true,
        target: img,
        time: 0,
        boundingClientRect: img.getBoundingClientRect(),
        intersectionRatio: 1,
        intersectionRect: img.getBoundingClientRect(),
        rootBounds: null,
      } as IntersectionObserverEntry,
    ]);

    jest.runAllTimers();
    fixture.detectChanges();

    expect(loadedSpy).toHaveBeenCalled();
    expect(img.getAttribute('src')).toBe('http://example.com/photo.png');
    expect(observerInstances[0]?.observe).toHaveBeenCalledWith(img);
  });

  it('retries and eventually emits lazyError on failure', () => {
    shouldError = true;
    TestBed.configureTestingModule({
      imports: [HostErrorComponent],
    });
    const fixture = TestBed.createComponent(HostErrorComponent);
    const errorSpy = jest.fn();
    fixture.componentInstance.directive.lazyError.subscribe(errorSpy);
    fixture.detectChanges();

    const hostEl = fixture.debugElement.query(By.css('div')).nativeElement;
    intersectionCallback?.([
      {
        isIntersecting: true,
        target: hostEl,
        time: 0,
        boundingClientRect: hostEl.getBoundingClientRect(),
        intersectionRatio: 1,
        intersectionRect: hostEl.getBoundingClientRect(),
        rootBounds: null,
      } as IntersectionObserverEntry,
    ]);

    jest.runAllTimers();
    fixture.detectChanges();

    expect(errorSpy).toHaveBeenCalled();
    const [[error]] = errorSpy.mock.calls;
    expect((error as Error).message).toContain('Failed to load image');
  });

  it('disconnects observer on destroy', () => {
    TestBed.configureTestingModule({
      imports: [HostImageComponent],
    });
    const fixture = TestBed.createComponent(HostImageComponent);
    fixture.detectChanges();

    fixture.destroy();

    expect(observerInstances[0]?.disconnect).toHaveBeenCalled();
  });
});
