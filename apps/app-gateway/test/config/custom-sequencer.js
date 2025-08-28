const Sequencer = require('@jest/test-sequencer').default;

class CustomSequencer extends Sequencer {
  sort(tests) {
    // Define the order of test execution for optimal integration testing
    const testPriority = {
      // Setup and basic tests first
      'api-test-suite.spec.ts': 1,
      
      // Integration tests in logical order
      'comprehensive-api-integration.e2e.spec.ts': 2,
      'cross-service-validation.e2e.spec.ts': 3,
      
      // Performance tests last (they're resource intensive)
      'api-performance-load.e2e.spec.ts': 4
    };
    
    return tests.sort((testA, testB) => {
      const priorityA = this.getPriority(testA.path, testPriority);
      const priorityB = this.getPriority(testB.path, testPriority);
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // If same priority, sort alphabetically
      return testA.path.localeCompare(testB.path);
    });
  }
  
  getPriority(testPath, priorities) {
    const fileName = testPath.split('/').pop();
    
    for (const [pattern, priority] of Object.entries(priorities)) {
      if (fileName.includes(pattern)) {
        return priority;
      }
    }
    
    // Default priority for unmatched tests
    return 999;
  }
}

module.exports = CustomSequencer;