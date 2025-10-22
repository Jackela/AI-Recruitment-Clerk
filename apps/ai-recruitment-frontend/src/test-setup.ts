import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});

// Mock window.matchMedia for accessibility tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
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
  rootMargin = '0px';
  thresholds: ReadonlyArray<number> = [];

  constructor(_callback: IntersectionObserverCallback) {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
} as unknown as typeof IntersectionObserver;

// Mock window.showDirectoryPicker for file system access
Object.defineProperty(window, 'showDirectoryPicker', {
  writable: true,
  value: jest
    .fn()
    .mockRejectedValue(
      new DOMException('Not implemented', 'NotSupportedError'),
    ),
});

// Mock window.alert for legacy alert dialogs
Object.defineProperty(window, 'alert', {
  writable: true,
  value: jest.fn(),
});

// Global Jest/Jasmine compatibility bridge
interface JasmineAndMethods {
  returnValue: (value: unknown) => jest.MockedFunction<any>;
  returnValues: (...values: unknown[]) => jest.MockedFunction<any>;
  callFake: (fn: (...args: unknown[]) => unknown) => jest.MockedFunction<any>;
  callThrough: () => jest.MockedFunction<any>;
  stub: () => jest.MockedFunction<any>;
  throwError: (error: Error | unknown) => jest.MockedFunction<any>;
}

interface JasmineSpy extends jest.MockedFunction<any> {
  and: JasmineAndMethods;
}

interface JasmineInterface {
  createSpyObj: (
    name: string,
    methods: string[],
    props?: Record<string, unknown>,
  ) => Record<string, JasmineSpy>;
  createSpy: (name?: string) => JasmineSpy;
}

(global as { jasmine?: JasmineInterface }).jasmine = {
  createSpyObj: (
    _name: string,
    methods: string[],
    props?: Record<string, unknown>,
  ) => {
    const spy: Record<string, JasmineSpy> = {};
    methods.forEach((method) => {
      const jestSpy = jest.fn();
      // Add Jasmine-style chaining methods
      const spyWithMethods = jestSpy as unknown as JasmineSpy;
      spyWithMethods.and = {
        returnValue: (value: unknown) => jestSpy.mockReturnValue(value),
        returnValues: (...values: unknown[]) => {
          values.forEach((value) => jestSpy.mockReturnValueOnce(value));
          return jestSpy;
        },
        callFake: (fn: (...args: unknown[]) => unknown) =>
          jestSpy.mockImplementation(fn),
        callThrough: () => jestSpy.mockImplementation(),
        stub: () => jestSpy.mockImplementation(() => {}),
        throwError: (error: Error | unknown) =>
          jestSpy.mockImplementation(() => {
            throw error;
          }),
      };
      spy[method] = spyWithMethods;
    });
    if (props) {
      Object.assign(spy, props);
    }
    return spy;
  },
  createSpy: (_name?: string) => {
    const jestSpy = jest.fn();
    const spyWithMethods = jestSpy as unknown as JasmineSpy;
    spyWithMethods.and = {
      returnValue: (value: unknown) => jestSpy.mockReturnValue(value),
      returnValues: (...values: unknown[]) => {
        values.forEach((value) => jestSpy.mockReturnValueOnce(value));
        return jestSpy;
      },
      callFake: (fn: (...args: unknown[]) => unknown) =>
        jestSpy.mockImplementation(fn),
      callThrough: () => jestSpy.mockImplementation(),
      stub: () => jestSpy.mockImplementation(() => {}),
      throwError: (error: Error | unknown) =>
        jestSpy.mockImplementation(() => {
          throw error;
        }),
    };
    return spyWithMethods;
  },
};

// Global spyOn function for Jasmine compatibility
(
  global as {
    spyOn?: (object: Record<string, unknown>, method: string) => JasmineSpy;
  }
).spyOn = (object: Record<string, unknown>, method: string) => {
  const jestSpy = jest.spyOn(object as any, method as any);
  const spyWithMethods = jestSpy as unknown as JasmineSpy;
  spyWithMethods.and = {
    returnValue: (value: unknown) => jestSpy.mockReturnValue(value as any),
    returnValues: (...values: unknown[]) => {
      values.forEach((value) => jestSpy.mockReturnValueOnce(value as any));
      return jestSpy;
    },
    callFake: (fn: (...args: unknown[]) => unknown) =>
      jestSpy.mockImplementation(fn),
    callThrough: () => jestSpy.mockImplementation(),
    stub: () => jestSpy.mockImplementation(() => {}),
    throwError: (error: Error | unknown) =>
      jestSpy.mockImplementation(() => {
        throw error;
      }),
  };
  return spyWithMethods;
};
