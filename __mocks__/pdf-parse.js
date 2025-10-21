const mockPdfParse = jest.fn(async () => ({
  text: '',
  numpages: 1,
  version: 'mock',
  info: {},
  metadata: null
}));

module.exports = {
  __esModule: true,
  default: mockPdfParse,
  mockPdfParse
};
