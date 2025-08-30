module.exports = {
  displayName: 'api-contracts',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', { 
      jsc: { 
        parser: { syntax: 'typescript', decorators: true }, 
        transform: { decoratorMetadata: true } 
      } 
    }]
  },
  moduleFileExtensions: ['ts', 'js'],
  coverageDirectory: '../../coverage/libs/api-contracts',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ]
};