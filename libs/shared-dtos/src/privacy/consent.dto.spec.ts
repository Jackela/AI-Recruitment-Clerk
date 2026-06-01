import {
  ConsentStatus,
  ConsentPurpose,
  ConsentMethod,
  DataCategory,
  ConsentRecord,
  CookieConsentRecord,
  UserConsentProfile,
  ConsentGrantDto,
  WithdrawConsentDto,
} from './consent.dto';

describe('ConsentDto', () => {
  describe('Enums', () => {
    it('should have correct ConsentStatus values', () => {
      expect(ConsentStatus.GRANTED).toBe('granted');
      expect(ConsentStatus.DENIED).toBe('denied');
      expect(ConsentStatus.PENDING).toBe('pending');
      expect(ConsentStatus.WITHDRAWN).toBe('withdrawn');
      expect(ConsentStatus.EXPIRED).toBe('expired');
      expect(ConsentStatus.NOT_APPLICABLE).toBe('not_applicable');
    });

    it('should have correct ConsentPurpose values', () => {
      expect(ConsentPurpose.ESSENTIAL_SERVICES).toBe('essential_services');
      expect(ConsentPurpose.MARKETING_COMMUNICATIONS).toBe(
        'marketing_communications',
      );
      expect(ConsentPurpose.RESUME_PROCESSING).toBe('resume_processing');
    });

    it('should have correct ConsentMethod values', () => {
      expect(ConsentMethod.EXPLICIT_OPT_IN).toBe('explicit_opt_in');
      expect(ConsentMethod.IMPLIED_CONSENT).toBe('implied_consent');
      expect(ConsentMethod.GRANULAR_CHOICE).toBe('granular_choice');
    });

    it('should have correct DataCategory values', () => {
      expect(DataCategory.AUTHENTICATION).toBe('authentication');
      expect(DataCategory.RESUME_CONTENT).toBe('resume_content');
      expect(DataCategory.BEHAVIORAL_DATA).toBe('behavioral_data');
    });
  });

  describe('ConsentRecord', () => {
    it('should create a consent record', () => {
      const record = new ConsentRecord();
      record.id = 'consent-1';
      record.userId = 'user-123';
      record.purpose = ConsentPurpose.MARKETING;
      record.status = ConsentStatus.GRANTED;
      record.dataCategories = [
        DataCategory.PROFILE_INFORMATION,
        DataCategory.PROFILE_INFORMATION,
      ];
      record.consentDate = new Date();

      expect(record.id).toBe('consent-1');
      expect(record.userId).toBe('user-123');
      expect(record.status).toBe(ConsentStatus.GRANTED);
    });
  });

  describe('CookieConsentRecord', () => {
    it('should create a cookie consent record', () => {
      const record = new CookieConsentRecord();
      record.deviceId = 'device-abc';
      record.essential = true;
      record.functional = true;
      record.analytics = false;
      record.marketing = false;
      record.consentDate = new Date();

      expect(record.deviceId).toBe('device-abc');
      expect(record.essential).toBe(true);
      expect(record.analytics).toBe(false);
    });
  });

  describe('UserConsentProfile', () => {
    let profile: UserConsentProfile;

    beforeEach(() => {
      profile = new UserConsentProfile();
      profile.userId = 'user-123';
      profile.consentRecords = [];
      profile.lastConsentUpdate = new Date();
      profile.createdAt = new Date();
      profile.updatedAt = new Date();
    });

    it('should have no valid consent initially', () => {
      expect(profile.hasValidConsent(ConsentPurpose.MARKETING)).toBe(false);
    });

    it('should return valid consent when granted and not expired', () => {
      const record = new ConsentRecord();
      record.id = 'r1';
      record.userId = 'user-123';
      record.purpose = ConsentPurpose.MARKETING;
      record.status = ConsentStatus.GRANTED;
      record.dataCategories = [DataCategory.PROFILE_INFORMATION];
      record.consentDate = new Date();

      profile.consentRecords = [record];

      expect(profile.hasValidConsent(ConsentPurpose.MARKETING)).toBe(true);
    });

    it('should return invalid consent when denied', () => {
      const record = new ConsentRecord();
      record.id = 'r1';
      record.userId = 'user-123';
      record.purpose = ConsentPurpose.MARKETING;
      record.status = ConsentStatus.DENIED;
      record.dataCategories = [DataCategory.PROFILE_INFORMATION];
      record.consentDate = new Date();

      profile.consentRecords = [record];

      expect(profile.hasValidConsent(ConsentPurpose.MARKETING)).toBe(false);
    });

    it('should return invalid consent when expired', () => {
      const record = new ConsentRecord();
      record.id = 'r1';
      record.userId = 'user-123';
      record.purpose = ConsentPurpose.MARKETING;
      record.status = ConsentStatus.GRANTED;
      record.dataCategories = [DataCategory.PROFILE_INFORMATION];
      record.consentDate = new Date();
      record.expiryDate = new Date('2020-01-01');

      profile.consentRecords = [record];

      expect(profile.hasValidConsent(ConsentPurpose.MARKETING)).toBe(false);
    });

    it('should get granted purposes', () => {
      const record1 = new ConsentRecord();
      record1.id = 'r1';
      record1.userId = 'user-123';
      record1.purpose = ConsentPurpose.MARKETING;
      record1.status = ConsentStatus.GRANTED;
      record1.dataCategories = [DataCategory.PROFILE_INFORMATION];
      record1.consentDate = new Date();

      const record2 = new ConsentRecord();
      record2.id = 'r2';
      record2.userId = 'user-123';
      record2.purpose = ConsentPurpose.ANALYTICS;
      record2.status = ConsentStatus.DENIED;
      record2.dataCategories = [DataCategory.BEHAVIORAL_DATA];
      record2.consentDate = new Date();

      profile.consentRecords = [record1, record2];

      const granted = profile.getGrantedPurposes();
      expect(granted).toContain(ConsentPurpose.MARKETING);
      expect(granted).not.toContain(ConsentPurpose.ANALYTICS);
    });

    it('should detect consent renewal needed when last update is over a year', () => {
      profile.lastConsentUpdate = new Date('2020-01-01');

      expect(profile.needsConsentRenewal()).toBe(true);
    });

    it('should not need renewal when consent is recent', () => {
      profile.lastConsentUpdate = new Date();

      expect(profile.needsConsentRenewal()).toBe(false);
    });
  });

  describe('ConsentGrantDto', () => {
    it('should create a consent grant', () => {
      const grant = new ConsentGrantDto();
      grant.purpose = ConsentPurpose.MARKETING;
      grant.granted = true;
      grant.method = ConsentMethod.EXPLICIT_OPT_IN;

      expect(grant.purpose).toBe(ConsentPurpose.MARKETING);
      expect(grant.granted).toBe(true);
      expect(grant.method).toBe(ConsentMethod.EXPLICIT_OPT_IN);
    });
  });

  describe('WithdrawConsentDto', () => {
    it('should create a withdrawal request', () => {
      const withdrawal = new WithdrawConsentDto();
      withdrawal.userId = 'user-123';
      withdrawal.purpose = ConsentPurpose.MARKETING;
      withdrawal.reason = 'Personal preference';

      expect(withdrawal.userId).toBe('user-123');
      expect(withdrawal.purpose).toBe(ConsentPurpose.MARKETING);
      expect(withdrawal.reason).toBe('Personal preference');
    });
  });
});
