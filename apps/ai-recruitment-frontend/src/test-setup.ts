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
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(): void {
    return;
  }

  unobserve(): void {
    return;
  }

  disconnect(): void {
    return;
  }

  /**
   * Utility helper for tests to dispatch resize events.
   */
  mockTrigger(entries: ResizeObserverEntry[] = []): void {
    this.callback(entries, this);
  }
};

// Mock IntersectionObserver for lazy loading tests
global.IntersectionObserver = class IntersectionObserver {
  root: Element | null = null;
  rootMargin = '0px';
  thresholds: ReadonlyArray<number> = [];
  private readonly callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }

  observe(): void {
    return;
  }

  unobserve(): void {
    return;
  }

  disconnect(): void {
    return;
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  /**
   * Utility helper to simulate intersection changes in tests.
   */
  mockTrigger(entries: IntersectionObserverEntry[] = []): void {
    this.callback(entries, this);
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
type AnyFn = (...args: unknown[]) => unknown;
type MockFn = jest.MockedFunction<AnyFn>;

interface JasmineAndMethods {
  returnValue: (value: unknown) => JasmineSpy;
  returnValues: (...values: unknown[]) => JasmineSpy;
  callFake: (fn: AnyFn) => JasmineSpy;
  callThrough: () => JasmineSpy;
  stub: () => JasmineSpy;
  throwError: (error: Error | unknown) => JasmineSpy;
}

interface JasmineSpy extends MockFn {
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

const attachJasmineMethods = (
  jestSpy: MockFn,
  originalImpl?: AnyFn,
): JasmineSpy => {
  const spyWithMethods = jestSpy as JasmineSpy;
  spyWithMethods.and = {
    returnValue: (value: unknown) => {
      jestSpy.mockReturnValue(value);
      return spyWithMethods;
    },
    returnValues: (...values: unknown[]) => {
      values.forEach((value) => jestSpy.mockReturnValueOnce(value));
      return spyWithMethods;
    },
    callFake: (fn: AnyFn) => {
      jestSpy.mockImplementation(fn);
      return spyWithMethods;
    },
    callThrough: () => {
      if (originalImpl) {
        jestSpy.mockImplementation((...args) => originalImpl(...args));
      }
      return spyWithMethods;
    },
    stub: () => {
      jestSpy.mockImplementation(() => undefined);
      return spyWithMethods;
    },
    throwError: (error: Error | unknown) => {
      jestSpy.mockImplementation(() => {
        throw error instanceof Error ? error : new Error(String(error));
      });
      return spyWithMethods;
    },
  };
  return spyWithMethods;
};

const globalWithJasmine = globalThis as typeof globalThis & {
  jasmine?: JasmineInterface;
  spyOn?: <T extends Record<string, unknown>, K extends Extract<keyof T, string>>(
    object: T,
    method: K,
  ) => JasmineSpy;
};

globalWithJasmine.jasmine = {
  createSpyObj: (
    _name: string,
    methods: string[],
    props?: Record<string, unknown>,
  ) => {
    const spy: Record<string, JasmineSpy> = {};
    methods.forEach((method) => {
      const jestSpy = jest.fn() as MockFn;
      spy[method] = attachJasmineMethods(jestSpy);
    });
    if (props) {
      Object.assign(spy, props);
    }
    return spy;
  },
  createSpy: (_name?: string) => {
    const jestSpy = jest.fn() as MockFn;
    return attachJasmineMethods(jestSpy);
  },
};

const jasmineSpyOn = <
  T extends Record<string, unknown>,
  K extends Extract<keyof T, string>,
>(
  object: T,
  method: K,
): JasmineSpy => {
  const originalImpl = (object[method] as AnyFn | undefined)?.bind(object);
  const jestSpy = jest.spyOn(
    object,
    method,
  ) as unknown as MockFn;
  return attachJasmineMethods(jestSpy, originalImpl);
};

globalWithJasmine.spyOn = jasmineSpyOn;
