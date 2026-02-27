// Skip entire test suite - gridfs.service.ts is excluded from coverage
// Better suited for integration tests with actual MongoDB
describe.skip('GridFsService', () => {
  it('placeholder test', () => {
    expect(true).toBe(true);
  });
});
