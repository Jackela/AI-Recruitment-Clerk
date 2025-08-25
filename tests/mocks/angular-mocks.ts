import { of, throwError } from 'rxjs';

// HttpClient Mock
export const createMockHttpClient = () => ({
  get: jasmine.createSpy('get').and.returnValue(of({})),
  post: jasmine.createSpy('post').and.returnValue(of({})),
  put: jasmine.createSpy('put').and.returnValue(of({})),
  delete: jasmine.createSpy('delete').and.returnValue(of({})),
  patch: jasmine.createSpy('patch').and.returnValue(of({})),
  head: jasmine.createSpy('head').and.returnValue(of({})),
  options: jasmine.createSpy('options').and.returnValue(of({})),
});

// Router Mock
export const createMockRouter = () => ({
  navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true)),
  navigateByUrl: jasmine.createSpy('navigateByUrl').and.returnValue(Promise.resolve(true)),
  createUrlTree: jasmine.createSpy('createUrlTree'),
  url: '/',
  events: of({}),
});

// ActivatedRoute Mock
export const createMockActivatedRoute = (params = {}, queryParams = {}) => ({
  params: of(params),
  queryParams: of(queryParams),
  snapshot: {
    params,
    queryParams,
    data: {},
  },
  data: of({}),
  fragment: of(''),
  outlet: 'primary',
  component: null,
  routeConfig: null,
});

// Store Mock (NgRx)
export const createMockStore = (initialState = {}) => ({
  select: jasmine.createSpy('select').and.returnValue(of(initialState)),
  dispatch: jasmine.createSpy('dispatch'),
  pipe: jasmine.createSpy('pipe').and.returnValue(of(initialState)),
  subscribe: jasmine.createSpy('subscribe').and.returnValue({ unsubscribe: () => {} }),
});

// Actions Mock (NgRx)
export const createMockActions = () => of({});

// FormBuilder Mock
export const createMockFormBuilder = () => ({
  group: jasmine.createSpy('group').and.returnValue({
    value: {},
    valid: true,
    invalid: false,
    get: jasmine.createSpy('get'),
    patchValue: jasmine.createSpy('patchValue'),
    setValue: jasmine.createSpy('setValue'),
    reset: jasmine.createSpy('reset'),
    controls: {},
  }),
  control: jasmine.createSpy('control'),
  array: jasmine.createSpy('array'),
});

// ToastrService Mock
export const createMockToastrService = () => ({
  success: jasmine.createSpy('success'),
  error: jasmine.createSpy('error'),
  warning: jasmine.createSpy('warning'),
  info: jasmine.createSpy('info'),
  clear: jasmine.createSpy('clear'),
});

// ConfigService Mock (for NestJS)
export const createMockConfigService = () => ({
  get: jasmine.createSpy('get').and.returnValue('mock-value'),
  getOrThrow: jasmine.createSpy('getOrThrow').and.returnValue('mock-value'),
});

// Repository Mock (for TypeORM/Mongoose)
export const createMockRepository = () => ({
  find: jasmine.createSpy('find').and.returnValue(Promise.resolve([])),
  findOne: jasmine.createSpy('findOne').and.returnValue(Promise.resolve(null)),
  findOneBy: jasmine.createSpy('findOneBy').and.returnValue(Promise.resolve(null)),
  save: jasmine.createSpy('save').and.returnValue(Promise.resolve({})),
  update: jasmine.createSpy('update').and.returnValue(Promise.resolve({ affected: 1 })),
  delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve({ affected: 1 })),
  create: jasmine.createSpy('create').and.returnValue({}),
  count: jasmine.createSpy('count').and.returnValue(Promise.resolve(0)),
});

// Helper function to create a complete test module configuration
export function createTestModuleMetadata(componentOrService: any, additionalProviders: any[] = []) {
  return {
    declarations: componentOrService.name?.includes('Component') ? [componentOrService] : [],
    imports: [],
    providers: [
      ...(componentOrService.name?.includes('Service') ? [componentOrService] : []),
      ...additionalProviders,
    ],
  };
}