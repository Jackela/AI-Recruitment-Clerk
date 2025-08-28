import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});

// Mock window.matchMedia for accessibility tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.ResizeObserver for responsive tests
global.ResizeObserver = class ResizeObserver {
  constructor(_callback: ResizeObserverCallback) {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver for lazy loading tests
global.IntersectionObserver = class IntersectionObserver {
  root: Element | null = null;
  rootMargin: string = '0px';
  thresholds: ReadonlyArray<number> = [];
  
  constructor(_callback: IntersectionObserverCallback) {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
} as any;

// Mock window.showDirectoryPicker for file system access
Object.defineProperty(window, 'showDirectoryPicker', {
  writable: true,
  value: jest.fn().mockRejectedValue(new DOMException('Not implemented', 'NotSupportedError')),
});

// Mock window.alert for legacy alert dialogs
Object.defineProperty(window, 'alert', {
  writable: true,
  value: jest.fn(),
});

// Global Jest/Jasmine compatibility bridge
(global as any).jasmine = {
  createSpyObj: (_name: string, methods: string[], props?: any) => {
    const spy: any = {};
    methods.forEach(method => {
      const jestSpy = jest.fn();
      // Add Jasmine-style chaining methods
      (jestSpy as any).and = {
        returnValue: (value: any) => jestSpy.mockReturnValue(value),
        returnValues: (...values: any[]) => {
          values.forEach(value => jestSpy.mockReturnValueOnce(value));
          return jestSpy;
        },
        callFake: (fn: any) => jestSpy.mockImplementation(fn),
        callThrough: () => jestSpy.mockImplementation(),
        stub: () => jestSpy.mockImplementation(() => {}),
        throwError: (error: any) => jestSpy.mockImplementation(() => { throw error; })
      };
      spy[method] = jestSpy;
    });
    if (props) {
      Object.assign(spy, props);
    }
    return spy;
  },
  createSpy: (_name?: string) => {
    const jestSpy = jest.fn();
    (jestSpy as any).and = {
      returnValue: (value: any) => jestSpy.mockReturnValue(value),
      returnValues: (...values: any[]) => jestSpy.mockReturnValueOnce(...values),
      callFake: (fn: any) => jestSpy.mockImplementation(fn),
      callThrough: () => jestSpy.mockImplementation(),
      stub: () => jestSpy.mockImplementation(() => {}),
      throwError: (error: any) => jestSpy.mockImplementation(() => { throw error; })
    };
    return jestSpy;
  }
};

// Global spyOn function for Jasmine compatibility
(global as any).spyOn = (object: any, method: string) => {
  const jestSpy = jest.spyOn(object, method);
  (jestSpy as any).and = {
    returnValue: (value: any) => jestSpy.mockReturnValue(value),
    returnValues: (...values: any[]) => jestSpy.mockReturnValueOnce(...values),
    callFake: (fn: any) => jestSpy.mockImplementation(fn),
    callThrough: () => jestSpy.mockImplementation(),
    stub: () => jestSpy.mockImplementation(() => {}),
    throwError: (error: any) => jestSpy.mockImplementation(() => { throw error; })
  };
  return jestSpy;
};
