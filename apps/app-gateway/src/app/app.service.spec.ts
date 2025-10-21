import { AppService } from './app.service';

describe('AppService', () => {
  it('returns static API greeting', () => {
    const service = new AppService();

    expect(service.getData()).toEqual({ message: 'Hello API' });
  });
});
