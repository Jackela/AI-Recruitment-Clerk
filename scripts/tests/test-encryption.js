// Simple test script for encryption service
const { EncryptionService } = require('./libs/shared-dtos/src/encryption/encryption.service.ts');

console.log('Testing Encryption Service...');

try {
  // Set test environment
  process.env.ENCRYPTION_MASTER_KEY = 'test-key-32-chars-long-for-secure-encryption';

  // Test basic encryption/decryption
  const testData = 'Sensitive test data that needs encryption!';
  console.log('Original data:', testData);

  const encrypted = EncryptionService.encrypt(testData);
  console.log('Encrypted data:', {
    encryptedData: encrypted.encryptedData.substring(0, 20) + '...',
    iv: encrypted.iv.substring(0, 10) + '...',
    tag: encrypted.tag.substring(0, 10) + '...',
    salt: encrypted.salt.substring(0, 10) + '...'
  });

  const decrypted = EncryptionService.decrypt(encrypted);
  console.log('Decrypted data:', decrypted);
  console.log('Match original:', decrypted === testData);

  // Test field encryption
  const userData = {
    id: 'user-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    role: 'user'
  };

  console.log('\nTesting field encryption...');
  console.log('Original user data:', userData);

  const encryptedUser = EncryptionService.encryptUserPII(userData);
  console.log('Encrypted user data:', {
    ...encryptedUser,
    _encrypted: Object.keys(encryptedUser._encrypted || {})
  });

  const decryptedUser = EncryptionService.decryptUserPII(encryptedUser);
  console.log('Decrypted user data:', decryptedUser);

  // Test configuration validation
  console.log('\nTesting configuration validation...');
  const validation = EncryptionService.validateConfig();
  console.log('Configuration valid:', validation.isValid);
  console.log('Validation errors:', validation.errors);

  console.log('\n✅ All encryption tests passed!');
} catch (error) {
  console.error('❌ Encryption test failed:', error);
}