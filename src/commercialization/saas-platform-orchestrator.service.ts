/**
 * SaaS Platform Orchestrator - Final Round Commercialization Engine
 * Multi-tenant architecture with enterprise-grade features
 * 
 * Features:
 * - Multi-tenant data isolation and management
 * - Subscription and billing management
 * - API monetization and rate limiting
 * - White-label customization
 * - Enterprise SSO integration
 * - Analytics and usage tracking
 * - Partner ecosystem and marketplace
 * - Automated onboarding and provisioning
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Observable, BehaviorSubject, Subject, interval } from 'rxjs';
import { map, filter, debounceTime, takeUntil } from 'rxjs/operators';
import * as crypto from 'crypto';

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  subdomain: string;
  status: 'active' | 'suspended' | 'trial' | 'churned';
  plan: SubscriptionPlan;
  createdAt: Date;
  lastActiveAt: Date;
  settings: TenantSettings;
  billing: BillingInfo;
  usage: UsageMetrics;
  customization: CustomizationConfig;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: 'starter' | 'professional' | 'enterprise' | 'custom';
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  limits: PlanLimits;
  features: string[];
  trialDays: number;
}

export interface PlanLimits {
  maxUsers: number;
  maxJobs: number;
  maxResumes: number;
  maxApiCalls: number;
  maxStorage: number; // GB
  maxIntegrations: number;
  supportLevel: 'community' | 'email' | 'priority' | '24x7';
}

export interface TenantSettings {
  timezone: string;
  language: string;
  currency: string;
  dateFormat: string;
  emailNotifications: boolean;
  apiAccess: boolean;
  ssoEnabled: boolean;
  whitelabelEnabled: boolean;
  customDomain: string;
}

export interface BillingInfo {
  stripeCustomerId: string;
  subscriptionId: string;
  nextBillingDate: Date;
  paymentMethod: string;
  billingAddress: Address;
  invoices: Invoice[];
  credits: number;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  createdAt: Date;
  paidAt?: Date;
  downloadUrl: string;
}

export interface UsageMetrics {
  period: 'current' | 'previous';
  users: number;
  jobs: number;
  resumes: number;
  apiCalls: number;
  storage: number;
  integrations: number;
  lastUpdated: Date;
}

export interface CustomizationConfig {
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  favicon: string;
  customCSS: string;
  emailTemplates: { [key: string]: string };
  landingPageConfig: any;
}

export interface APIKey {
  id: string;
  tenantId: string;
  name: string;
  key: string;
  hashedKey: string;
  scopes: string[];
  rateLimit: number;
  status: 'active' | 'revoked';
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
}

export interface Partner {
  id: string;
  name: string;
  type: 'integration' | 'reseller' | 'technology' | 'consulting';
  status: 'active' | 'pending' | 'suspended';
  apiKey: string;
  commissionRate: number;
  integrations: string[];
  metrics: PartnerMetrics;
}

export interface PartnerMetrics {
  referrals: number;
  conversions: number;
  revenue: number;
  commissionPaid: number;
  lastActivity: Date;
}

export interface MarketplaceApp {
  id: string;
  name: string;
  description: string;
  category: 'integration' | 'extension' | 'template' | 'analytics';
  developer: string;
  price: number;
  rating: number;
  installs: number;
  status: 'published' | 'pending' | 'rejected';
  screenshots: string[];
  permissions: string[];
}

@Injectable()
export class SaaSPlatformOrchestratorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SaaSPlatformOrchestratorService.name);
  private readonly destroy$ = new Subject<void>();

  // Multi-tenancy management
  private readonly tenantsSubject = new BehaviorSubject<Tenant[]>([]);
  private readonly tenantUsageSubject = new BehaviorSubject<{ [tenantId: string]: UsageMetrics }>({});

  // Subscription management
  private readonly subscriptionPlans = new Map<string, SubscriptionPlan>();
  private readonly apiKeys = new Map<string, APIKey>();

  // Partner ecosystem
  private readonly partners = new Map<string, Partner>();
  private readonly marketplaceApps = new Map<string, MarketplaceApp>();

  // Platform metrics
  private readonly platformMetrics = new BehaviorSubject<any>({
    totalTenants: 0,
    activeTenants: 0,
    totalRevenue: 0,
    churnRate: 0,
    averageRevenuePerUser: 0
  });

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.initializeSubscriptionPlans();
    this.setupTenancyMonitoring();
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('🏢 SaaS Platform Orchestrator initializing...');
    await this.initializePlatformBaseline();
    await this.startBillingEngine();
    await this.initializePartnerEcosystem();
    this.logger.log('✅ SaaS Platform ready for commercialization');
  }

  onModuleDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.logger.log('🛑 SaaS Platform Orchestrator destroyed');
  }

  // Public API - Tenant Management
  getTenants$(): Observable<Tenant[]> {
    return this.tenantsSubject.asObservable();
  }

  async createTenant(tenantData: Partial<Tenant>): Promise<string> {
    const tenant: Tenant = {
      id: this.generateTenantId(),
      name: tenantData.name || 'New Tenant',
      domain: tenantData.domain || '',
      subdomain: tenantData.subdomain || this.generateSubdomain(),
      status: 'trial',
      plan: this.subscriptionPlans.get('starter') || this.getDefaultPlan(),
      createdAt: new Date(),
      lastActiveAt: new Date(),
      settings: this.getDefaultTenantSettings(),
      billing: await this.initializeBilling(tenantData.name || 'New Tenant'),
      usage: this.getDefaultUsageMetrics(),
      customization: this.getDefaultCustomization()
    };

    // Add to tenants list
    const currentTenants = this.tenantsSubject.value;
    currentTenants.push(tenant);
    this.tenantsSubject.next([...currentTenants]);

    // Provision tenant resources
    await this.provisionTenantResources(tenant);

    this.eventEmitter.emit('saas.tenant.created', tenant);
    this.logger.log(`🏢 Tenant created: ${tenant.name} (${tenant.id})`);

    return tenant.id;
  }

  async updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<void> {
    const tenants = this.tenantsSubject.value;
    const tenantIndex = tenants.findIndex(t => t.id === tenantId);
    
    if (tenantIndex === -1) {
      throw new Error('Tenant not found');
    }

    const updatedTenant = { ...tenants[tenantIndex], ...updates };
    tenants[tenantIndex] = updatedTenant;
    this.tenantsSubject.next([...tenants]);

    this.eventEmitter.emit('saas.tenant.updated', updatedTenant);
  }

  async suspendTenant(tenantId: string, reason: string): Promise<void> {
    await this.updateTenant(tenantId, { status: 'suspended' });
    this.eventEmitter.emit('saas.tenant.suspended', { tenantId, reason });
    this.logger.warn(`⚠️  Tenant suspended: ${tenantId} - ${reason}`);
  }

  async reactivateTenant(tenantId: string): Promise<void> {
    await this.updateTenant(tenantId, { status: 'active' });
    this.eventEmitter.emit('saas.tenant.reactivated', { tenantId });
    this.logger.log(`✅ Tenant reactivated: ${tenantId}`);
  }

  // Public API - Subscription Management
  getSubscriptionPlans(): SubscriptionPlan[] {
    return Array.from(this.subscriptionPlans.values());
  }

  async upgradeTenantPlan(tenantId: string, planId: string): Promise<void> {
    const plan = this.subscriptionPlans.get(planId);
    if (!plan) {
      throw new Error('Subscription plan not found');
    }

    await this.updateTenant(tenantId, { plan });
    
    // Update billing
    await this.updateTenantBilling(tenantId, plan);

    this.eventEmitter.emit('saas.subscription.upgraded', { tenantId, planId });
    this.logger.log(`📈 Tenant ${tenantId} upgraded to ${plan.name}`);
  }

  async downgradeTenantPlan(tenantId: string, planId: string): Promise<void> {
    const plan = this.subscriptionPlans.get(planId);
    if (!plan) {
      throw new Error('Subscription plan not found');
    }

    await this.updateTenant(tenantId, { plan });
    await this.updateTenantBilling(tenantId, plan);

    this.eventEmitter.emit('saas.subscription.downgraded', { tenantId, planId });
    this.logger.log(`📉 Tenant ${tenantId} downgraded to ${plan.name}`);
  }

  // Public API - API Key Management
  async generateAPIKey(tenantId: string, name: string, scopes: string[]): Promise<APIKey> {
    const apiKey: APIKey = {
      id: this.generateSecureId(),
      tenantId,
      name,
      key: this.generateAPIKeyString(),
      hashedKey: this.hashAPIKey(this.generateAPIKeyString()),
      scopes,
      rateLimit: 10000, // Default rate limit
      status: 'active',
      createdAt: new Date()
    };

    this.apiKeys.set(apiKey.id, apiKey);
    this.eventEmitter.emit('saas.api_key.created', apiKey);
    
    return apiKey;
  }

  async revokeAPIKey(keyId: string): Promise<void> {
    const apiKey = this.apiKeys.get(keyId);
    if (apiKey) {
      apiKey.status = 'revoked';
      this.apiKeys.set(keyId, apiKey);
      this.eventEmitter.emit('saas.api_key.revoked', apiKey);
    }
  }

  validateAPIKey(key: string): APIKey | null {
    const hashedKey = this.hashAPIKey(key);
    
    for (const apiKey of this.apiKeys.values()) {
      if (apiKey.hashedKey === hashedKey && apiKey.status === 'active') {
        // Update last used
        apiKey.lastUsedAt = new Date();
        return apiKey;
      }
    }
    
    return null;
  }

  // Public API - Usage Tracking
  async trackUsage(tenantId: string, resource: string, amount: number): Promise<void> {
    const currentUsage = this.tenantUsageSubject.value[tenantId] || this.getDefaultUsageMetrics();
    
    switch (resource) {
      case 'users':
        currentUsage.users += amount;
        break;
      case 'jobs':
        currentUsage.jobs += amount;
        break;
      case 'resumes':
        currentUsage.resumes += amount;
        break;
      case 'api_calls':
        currentUsage.apiCalls += amount;
        break;
      case 'storage':
        currentUsage.storage += amount;
        break;
      case 'integrations':
        currentUsage.integrations += amount;
        break;
    }

    currentUsage.lastUpdated = new Date();
    
    // Update usage map
    const allUsage = this.tenantUsageSubject.value;
    allUsage[tenantId] = currentUsage;
    this.tenantUsageSubject.next({ ...allUsage });

    // Check for plan limits
    await this.checkPlanLimits(tenantId, currentUsage);
    
    this.eventEmitter.emit('saas.usage.tracked', { tenantId, resource, amount, currentUsage });
  }

  getTenantUsage(tenantId: string): UsageMetrics | null {
    return this.tenantUsageSubject.value[tenantId] || null;
  }

  // Public API - Partner Management
  async registerPartner(partnerData: Partial<Partner>): Promise<string> {
    const partner: Partner = {
      id: this.generateSecureId(),
      name: partnerData.name || 'New Partner',
      type: partnerData.type || 'integration',
      status: 'pending',
      apiKey: this.generateAPIKeyString(),
      commissionRate: partnerData.commissionRate || 0.1, // 10% default
      integrations: partnerData.integrations || [],
      metrics: {
        referrals: 0,
        conversions: 0,
        revenue: 0,
        commissionPaid: 0,
        lastActivity: new Date()
      }
    };

    this.partners.set(partner.id, partner);
    this.eventEmitter.emit('saas.partner.registered', partner);
    
    return partner.id;
  }

  async approvePartner(partnerId: string): Promise<void> {
    const partner = this.partners.get(partnerId);
    if (partner) {
      partner.status = 'active';
      this.partners.set(partnerId, partner);
      this.eventEmitter.emit('saas.partner.approved', partner);
    }
  }

  getPartners(): Partner[] {
    return Array.from(this.partners.values());
  }

  // Public API - Marketplace
  async publishApp(appData: Partial<MarketplaceApp>): Promise<string> {
    const app: MarketplaceApp = {
      id: this.generateSecureId(),
      name: appData.name || 'New App',
      description: appData.description || '',
      category: appData.category || 'integration',
      developer: appData.developer || 'Unknown',
      price: appData.price || 0,
      rating: 0,
      installs: 0,
      status: 'pending',
      screenshots: appData.screenshots || [],
      permissions: appData.permissions || []
    };

    this.marketplaceApps.set(app.id, app);
    this.eventEmitter.emit('saas.app.published', app);
    
    return app.id;
  }

  async installApp(tenantId: string, appId: string): Promise<void> {
    const app = this.marketplaceApps.get(appId);
    if (!app) {
      throw new Error('App not found');
    }

    // Increment install count
    app.installs++;
    this.marketplaceApps.set(appId, app);

    this.eventEmitter.emit('saas.app.installed', { tenantId, appId });
  }

  getMarketplaceApps(): MarketplaceApp[] {
    return Array.from(this.marketplaceApps.values())
      .filter(app => app.status === 'published');
  }

  // Private Methods - Initialization
  private initializeSubscriptionPlans(): void {
    const plans: SubscriptionPlan[] = [
      {
        id: 'starter',
        name: 'Starter',
        tier: 'starter',
        price: 29,
        currency: 'USD',
        billingCycle: 'monthly',
        trialDays: 14,
        limits: {
          maxUsers: 5,
          maxJobs: 100,
          maxResumes: 1000,
          maxApiCalls: 10000,
          maxStorage: 10, // GB
          maxIntegrations: 2,
          supportLevel: 'email'
        },
        features: [
          'Resume parsing',
          'Job matching',
          'Basic analytics',
          'Email support',
          'Standard templates'
        ]
      },
      {
        id: 'professional',
        name: 'Professional',
        tier: 'professional',
        price: 79,
        currency: 'USD',
        billingCycle: 'monthly',
        trialDays: 14,
        limits: {
          maxUsers: 25,
          maxJobs: 1000,
          maxResumes: 10000,
          maxApiCalls: 100000,
          maxStorage: 100, // GB
          maxIntegrations: 10,
          supportLevel: 'priority'
        },
        features: [
          'Everything in Starter',
          'Advanced AI matching',
          'Custom branding',
          'API access',
          'Priority support',
          'Advanced analytics',
          'Custom integrations'
        ]
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        tier: 'enterprise',
        price: 299,
        currency: 'USD',
        billingCycle: 'monthly',
        trialDays: 30,
        limits: {
          maxUsers: -1, // Unlimited
          maxJobs: -1,
          maxResumes: -1,
          maxApiCalls: -1,
          maxStorage: -1,
          maxIntegrations: -1,
          supportLevel: '24x7'
        },
        features: [
          'Everything in Professional',
          'Unlimited usage',
          'SSO integration',
          'Custom domain',
          'Dedicated support',
          'SLA guarantee',
          'Advanced security',
          'Custom development'
        ]
      }
    ];

    plans.forEach(plan => {
      this.subscriptionPlans.set(plan.id, plan);
    });

    this.logger.log(`💳 Initialized ${this.subscriptionPlans.size} subscription plans`);
  }

  private setupTenancyMonitoring(): void {
    // Monitor tenant activity every minute
    interval(60000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(async () => {
      await this.updateTenantActivities();
      await this.checkPlanLimitsForAllTenants();
    });

    // Update platform metrics every 5 minutes
    interval(300000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(async () => {
      await this.updatePlatformMetrics();
    });
  }

  private async initializePlatformBaseline(): Promise<void> {
    this.logger.log('📊 Establishing SaaS platform baseline...');
    
    // Initialize with demo tenants for testing
    await this.createDemoTenants();
    
    this.logger.log('📈 SaaS platform baseline established');
  }

  private async startBillingEngine(): Promise<void> {
    this.logger.log('💰 Starting billing engine...');
    
    // Initialize Stripe integration (simulated)
    // In production, this would connect to Stripe API
    
    this.logger.log('✅ Billing engine ready');
  }

  private async initializePartnerEcosystem(): Promise<void> {
    this.logger.log('🤝 Initializing partner ecosystem...');
    
    // Register demo partners
    await this.createDemoPartners();
    await this.createDemoMarketplaceApps();
    
    this.logger.log('✅ Partner ecosystem ready');
  }

  // Private Methods - Demo Data
  private async createDemoTenants(): Promise<void> {
    const demoTenants = [
      {
        name: 'TechCorp Solutions',
        domain: 'techcorp.com',
        subdomain: 'techcorp'
      },
      {
        name: 'StartupHub',
        domain: 'startuphub.io',
        subdomain: 'startuphub'
      },
      {
        name: 'Enterprise Recruiting',
        domain: 'enterprise-recruiting.com',
        subdomain: 'enterprise'
      }
    ];

    for (const tenantData of demoTenants) {
      await this.createTenant(tenantData);
    }
  }

  private async createDemoPartners(): Promise<void> {
    const demoPartners = [
      {
        name: 'LinkedIn Integration',
        type: 'integration' as const,
        commissionRate: 0.15,
        integrations: ['linkedin_api', 'linkedin_recruiter']
      },
      {
        name: 'RecruiterPro',
        type: 'reseller' as const,
        commissionRate: 0.25,
        integrations: []
      },
      {
        name: 'AI Analytics Ltd',
        type: 'technology' as const,
        commissionRate: 0.20,
        integrations: ['advanced_analytics', 'ml_insights']
      }
    ];

    for (const partnerData of demoPartners) {
      const partnerId = await this.registerPartner(partnerData);
      await this.approvePartner(partnerId);
    }
  }

  private async createDemoMarketplaceApps(): Promise<void> {
    const demoApps = [
      {
        name: 'Advanced Resume Parser',
        description: 'AI-powered resume parsing with 99% accuracy',
        category: 'extension' as const,
        developer: 'AI Solutions Inc',
        price: 19.99,
        permissions: ['resume_read', 'resume_parse']
      },
      {
        name: 'Interview Scheduler',
        description: 'Automated interview scheduling and calendar management',
        category: 'integration' as const,
        developer: 'Scheduler Pro',
        price: 9.99,
        permissions: ['calendar_access', 'email_send']
      },
      {
        name: 'Diversity Analytics',
        description: 'Track and improve diversity in your hiring process',
        category: 'analytics' as const,
        developer: 'Diversity Tech',
        price: 29.99,
        permissions: ['candidate_data', 'analytics_read']
      }
    ];

    for (const appData of demoApps) {
      const appId = await this.publishApp(appData);
      // Auto-approve demo apps
      const app = this.marketplaceApps.get(appId);
      if (app) {
        app.status = 'published';
        this.marketplaceApps.set(appId, app);
      }
    }
  }

  // Private Methods - Tenant Management
  private async provisionTenantResources(tenant: Tenant): Promise<void> {
    this.logger.log(`🔧 Provisioning resources for tenant: ${tenant.name}`);
    
    // Create tenant database schema
    await this.createTenantSchema(tenant.id);
    
    // Setup tenant-specific configuration
    await this.setupTenantConfiguration(tenant);
    
    // Initialize tenant data
    await this.initializeTenantData(tenant);
    
    this.logger.log(`✅ Resources provisioned for tenant: ${tenant.name}`);
  }

  private async createTenantSchema(tenantId: string): Promise<void> {
    // Simulate database schema creation
    await this.sleep(2000);
    this.logger.log(`🗄️  Database schema created for tenant: ${tenantId}`);
  }

  private async setupTenantConfiguration(tenant: Tenant): Promise<void> {
    // Simulate configuration setup
    await this.sleep(1000);
    this.logger.log(`⚙️  Configuration setup for tenant: ${tenant.name}`);
  }

  private async initializeTenantData(tenant: Tenant): Promise<void> {
    // Simulate initial data creation
    await this.sleep(1500);
    this.logger.log(`📊 Initial data created for tenant: ${tenant.name}`);
  }

  private generateTenantId(): string {
    return `tenant_${this.generateSecureId()}`;
  }

  private generateSubdomain(): string {
    return `tenant-${Math.random().toString(36).substring(2, 8)}`;
  }

  private getDefaultTenantSettings(): TenantSettings {
    return {
      timezone: 'UTC',
      language: 'en',
      currency: 'USD',
      dateFormat: 'YYYY-MM-DD',
      emailNotifications: true,
      apiAccess: false,
      ssoEnabled: false,
      whitelabelEnabled: false,
      customDomain: ''
    };
  }

  private async initializeBilling(tenantName: string): Promise<BillingInfo> {
    // Simulate Stripe customer creation
    const stripeCustomerId = `cus_${this.generateSecureId()}`;
    
    return {
      stripeCustomerId,
      subscriptionId: '',
      nextBillingDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      paymentMethod: '',
      billingAddress: {
        line1: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'US'
      },
      invoices: [],
      credits: 0
    };
  }

  private getDefaultUsageMetrics(): UsageMetrics {
    return {
      period: 'current',
      users: 0,
      jobs: 0,
      resumes: 0,
      apiCalls: 0,
      storage: 0,
      integrations: 0,
      lastUpdated: new Date()
    };
  }

  private getDefaultCustomization(): CustomizationConfig {
    return {
      logo: '',
      primaryColor: '#007bff',
      secondaryColor: '#6c757d',
      fontFamily: 'Inter, sans-serif',
      favicon: '',
      customCSS: '',
      emailTemplates: {},
      landingPageConfig: {}
    };
  }

  private getDefaultPlan(): SubscriptionPlan {
    return this.subscriptionPlans.get('starter')!;
  }

  // Private Methods - Billing
  private async updateTenantBilling(tenantId: string, plan: SubscriptionPlan): Promise<void> {
    const tenant = this.tenantsSubject.value.find(t => t.id === tenantId);
    if (!tenant) return;

    // Update Stripe subscription (simulated)
    await this.updateStripeSubscription(tenant.billing.subscriptionId, plan);
    
    // Update next billing date
    tenant.billing.nextBillingDate = this.calculateNextBillingDate(plan.billingCycle);
    
    this.eventEmitter.emit('saas.billing.updated', { tenantId, plan });
  }

  private async updateStripeSubscription(subscriptionId: string, plan: SubscriptionPlan): Promise<void> {
    // Simulate Stripe API call
    await this.sleep(1000);
    this.logger.log(`💳 Stripe subscription updated: ${subscriptionId} -> ${plan.name}`);
  }

  private calculateNextBillingDate(cycle: 'monthly' | 'yearly'): Date {
    const now = new Date();
    if (cycle === 'monthly') {
      return new Date(now.setMonth(now.getMonth() + 1));
    } else {
      return new Date(now.setFullYear(now.getFullYear() + 1));
    }
  }

  // Private Methods - API Keys
  private generateAPIKeyString(): string {
    const prefix = 'ak_';
    const key = crypto.randomBytes(32).toString('hex');
    return `${prefix}${key}`;
  }

  private hashAPIKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  // Private Methods - Usage Monitoring
  private async checkPlanLimits(tenantId: string, usage: UsageMetrics): Promise<void> {
    const tenant = this.tenantsSubject.value.find(t => t.id === tenantId);
    if (!tenant) return;

    const limits = tenant.plan.limits;
    const warnings: string[] = [];

    // Check each limit
    if (limits.maxUsers > 0 && usage.users >= limits.maxUsers) {
      warnings.push(`User limit exceeded: ${usage.users}/${limits.maxUsers}`);
    }
    
    if (limits.maxJobs > 0 && usage.jobs >= limits.maxJobs) {
      warnings.push(`Job limit exceeded: ${usage.jobs}/${limits.maxJobs}`);
    }
    
    if (limits.maxResumes > 0 && usage.resumes >= limits.maxResumes) {
      warnings.push(`Resume limit exceeded: ${usage.resumes}/${limits.maxResumes}`);
    }
    
    if (limits.maxApiCalls > 0 && usage.apiCalls >= limits.maxApiCalls) {
      warnings.push(`API call limit exceeded: ${usage.apiCalls}/${limits.maxApiCalls}`);
    }
    
    if (limits.maxStorage > 0 && usage.storage >= limits.maxStorage) {
      warnings.push(`Storage limit exceeded: ${usage.storage}GB/${limits.maxStorage}GB`);
    }

    if (warnings.length > 0) {
      this.eventEmitter.emit('saas.limits.exceeded', { tenantId, warnings });
      this.logger.warn(`⚠️  Plan limits exceeded for tenant ${tenantId}: ${warnings.join(', ')}`);
    }
  }

  private async checkPlanLimitsForAllTenants(): Promise<void> {
    const tenants = this.tenantsSubject.value;
    const allUsage = this.tenantUsageSubject.value;

    for (const tenant of tenants) {
      const usage = allUsage[tenant.id];
      if (usage) {
        await this.checkPlanLimits(tenant.id, usage);
      }
    }
  }

  private async updateTenantActivities(): Promise<void> {
    // Simulate tenant activity updates
    const tenants = this.tenantsSubject.value;
    
    for (const tenant of tenants) {
      // Randomly update last active time for active tenants
      if (tenant.status === 'active' && Math.random() < 0.3) {
        tenant.lastActiveAt = new Date();
      }
    }
    
    this.tenantsSubject.next([...tenants]);
  }

  // Private Methods - Platform Metrics
  private async updatePlatformMetrics(): Promise<void> {
    const tenants = this.tenantsSubject.value;
    
    const totalTenants = tenants.length;
    const activeTenants = tenants.filter(t => t.status === 'active').length;
    const totalRevenue = this.calculateTotalRevenue(tenants);
    const churnRate = this.calculateChurnRate(tenants);
    const averageRevenuePerUser = totalTenants > 0 ? totalRevenue / totalTenants : 0;

    const metrics = {
      totalTenants,
      activeTenants,
      totalRevenue,
      churnRate,
      averageRevenuePerUser,
      lastUpdated: new Date()
    };

    this.platformMetrics.next(metrics);
    this.eventEmitter.emit('saas.metrics.updated', metrics);
  }

  private calculateTotalRevenue(tenants: Tenant[]): number {
    return tenants
      .filter(t => t.status === 'active')
      .reduce((sum, t) => sum + t.plan.price, 0);
  }

  private calculateChurnRate(tenants: Tenant[]): number {
    const churnedTenants = tenants.filter(t => t.status === 'churned').length;
    return tenants.length > 0 ? (churnedTenants / tenants.length) * 100 : 0;
  }

  // Scheduled Tasks
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processMonthlyBilling(): Promise<void> {
    this.logger.log('💰 Processing monthly billing...');
    
    const tenants = this.tenantsSubject.value;
    const today = new Date();
    
    for (const tenant of tenants) {
      if (tenant.status === 'active' && tenant.billing.nextBillingDate <= today) {
        await this.processTenantBilling(tenant);
      }
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async syncUsageMetrics(): Promise<void> {
    this.logger.log('📊 Syncing usage metrics...');
    
    // Simulate usage metric synchronization
    const tenants = this.tenantsSubject.value;
    const allUsage = this.tenantUsageSubject.value;
    
    for (const tenant of tenants) {
      if (tenant.status === 'active') {
        const usage = allUsage[tenant.id] || this.getDefaultUsageMetrics();
        
        // Simulate some activity
        if (Math.random() < 0.5) {
          usage.apiCalls += Math.floor(Math.random() * 100);
          usage.lastUpdated = new Date();
          allUsage[tenant.id] = usage;
        }
      }
    }
    
    this.tenantUsageSubject.next({ ...allUsage });
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async generatePlatformReport(): Promise<void> {
    this.logger.log('📈 Generating platform report...');
    
    const tenants = this.tenantsSubject.value;
    const metrics = this.platformMetrics.value;
    
    const report = {
      timestamp: new Date(),
      summary: metrics,
      tenantBreakdown: {
        byPlan: this.groupTenantsByPlan(tenants),
        byStatus: this.groupTenantsByStatus(tenants),
        topTenants: this.getTopTenantsByRevenue(tenants)
      },
      growth: this.calculateGrowthMetrics(tenants),
      recommendations: this.generateBusinessRecommendations(tenants, metrics)
    };

    this.eventEmitter.emit('saas.report.generated', report);
    this.logger.log('✅ Platform report generated');
  }

  // Private Methods - Billing Processing
  private async processTenantBilling(tenant: Tenant): Promise<void> {
    this.logger.log(`💳 Processing billing for tenant: ${tenant.name}`);
    
    try {
      // Create invoice (simulated)
      const invoice = await this.createInvoice(tenant);
      
      // Process payment (simulated)
      await this.processPayment(tenant, invoice);
      
      // Update next billing date
      tenant.billing.nextBillingDate = this.calculateNextBillingDate(tenant.plan.billingCycle);
      
      this.eventEmitter.emit('saas.billing.processed', { tenant, invoice });
      
    } catch (error) {
      this.logger.error(`❌ Billing failed for tenant ${tenant.name}: ${error.message}`);
      this.eventEmitter.emit('saas.billing.failed', { tenant, error: error.message });
    }
  }

  private async createInvoice(tenant: Tenant): Promise<Invoice> {
    const invoice: Invoice = {
      id: `inv_${this.generateSecureId()}`,
      amount: tenant.plan.price,
      currency: tenant.plan.currency,
      status: 'pending',
      createdAt: new Date(),
      downloadUrl: `https://platform.example.com/invoices/${this.generateSecureId()}.pdf`
    };

    tenant.billing.invoices.push(invoice);
    return invoice;
  }

  private async processPayment(tenant: Tenant, invoice: Invoice): Promise<void> {
    // Simulate payment processing
    await this.sleep(2000);
    
    // Simulate 95% success rate
    if (Math.random() < 0.95) {
      invoice.status = 'paid';
      invoice.paidAt = new Date();
      this.logger.log(`✅ Payment successful for tenant: ${tenant.name}`);
    } else {
      invoice.status = 'failed';
      throw new Error('Payment processing failed');
    }
  }

  // Private Methods - Analytics
  private groupTenantsByPlan(tenants: Tenant[]): { [planId: string]: number } {
    const groups: { [planId: string]: number } = {};
    
    tenants.forEach(tenant => {
      const planId = tenant.plan.id;
      groups[planId] = (groups[planId] || 0) + 1;
    });
    
    return groups;
  }

  private groupTenantsByStatus(tenants: Tenant[]): { [status: string]: number } {
    const groups: { [status: string]: number } = {};
    
    tenants.forEach(tenant => {
      groups[tenant.status] = (groups[tenant.status] || 0) + 1;
    });
    
    return groups;
  }

  private getTopTenantsByRevenue(tenants: Tenant[]): Tenant[] {
    return tenants
      .filter(t => t.status === 'active')
      .sort((a, b) => b.plan.price - a.plan.price)
      .slice(0, 10);
  }

  private calculateGrowthMetrics(tenants: Tenant[]): any {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    const newThisMonth = tenants.filter(t => t.createdAt >= lastMonth).length;
    const totalLastMonth = tenants.filter(t => t.createdAt < lastMonth).length;
    
    const growthRate = totalLastMonth > 0 ? (newThisMonth / totalLastMonth) * 100 : 0;
    
    return {
      newTenantsThisMonth: newThisMonth,
      growthRate: Math.round(growthRate * 100) / 100
    };
  }

  private generateBusinessRecommendations(tenants: Tenant[], metrics: any): string[] {
    const recommendations: string[] = [];
    
    if (metrics.churnRate > 5) {
      recommendations.push('High churn rate detected - investigate customer satisfaction');
    }
    
    if (metrics.averageRevenuePerUser < 100) {
      recommendations.push('Consider upselling strategies to increase ARPU');
    }
    
    const enterpriseTenants = tenants.filter(t => t.plan.tier === 'enterprise').length;
    const totalActiveTenants = tenants.filter(t => t.status === 'active').length;
    
    if (totalActiveTenants > 0 && (enterpriseTenants / totalActiveTenants) < 0.2) {
      recommendations.push('Focus on enterprise customer acquisition');
    }
    
    return recommendations;
  }

  // Utility Methods
  private generateSecureId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public API - Platform Metrics
  getPlatformMetrics$(): Observable<any> {
    return this.platformMetrics.asObservable();
  }

  getCurrentPlatformMetrics(): any {
    return this.platformMetrics.value;
  }
}