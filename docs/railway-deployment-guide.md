# Railway Deployment Guide - AI Recruitment Clerk

## 🚀 Quick Deploy to Railway

### Prerequisites
- Railway account
- GitHub repository connected
- Environment variables configured

### Required Environment Variables

#### Core Application
```bash
NODE_ENV=production
JWT_SECRET=your-jwt-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
ENCRYPTION_KEY=your-32-char-encryption-key
GEMINI_API_KEY=your-gemini-api-key
```

#### Database Connections
```bash
MONGODB_URI=mongodb://username:password@host:port/database
REDIS_URL=redis://username:password@host:port
```

#### Optional Services
```bash
NATS_URL=nats://host:port
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
```

### Deployment Steps

1. **Connect Repository**
   ```bash
   # Fork and connect your repository to Railway
   railway login
   railway link
   ```

2. **Configure Environment**
   ```bash
   # Set environment variables
   railway variables set NODE_ENV=production
   railway variables set JWT_SECRET=your-secret
   # ... add all required variables
   ```

3. **Deploy Application**
   ```bash
   # Deploy from main branch
   railway up
   ```

4. **Verify Deployment**
   ```bash
   # Check deployment status
   railway status
   
   # View logs
   railway logs
   
   # Run verification script
   bash scripts/railway-verify.sh
   ```

### Health Checks

The application includes comprehensive health checks:

- **Health Endpoint**: `/api/health`
- **System Status**: `/api/system/status`
- **Memory Monitoring**: Built-in memory usage tracking
- **Service Monitoring**: Individual service health tracking

### Performance Optimizations

#### Memory Management
- Node.js heap size: 2048MB
- Memory limit: 2048MB
- Automatic garbage collection optimization

#### Build Optimizations
- Production-only dependencies
- Optimized npm configuration
- Build artifact caching
- Legacy peer deps handling

#### Security Configurations
- Helmet.js security headers
- CORS configuration
- Environment variable validation
- Secret management

### Troubleshooting

#### Common Issues

1. **Build Failures**
   ```bash
   # Check build logs
   railway logs --deployment
   
   # Verify dependencies
   npm audit
   ```

2. **Memory Issues**
   ```bash
   # Monitor memory usage
   railway metrics
   
   # Adjust memory limits in railway.json
   ```

3. **Health Check Failures**
   ```bash
   # Test health endpoint locally
   curl http://localhost:3000/api/health
   
   # Check service status
   curl http://localhost:3000/api/system/status
   ```

### Monitoring & Alerting

#### Built-in Monitoring
- Application uptime tracking
- Memory usage monitoring
- Response time tracking
- Error rate monitoring

#### External Monitoring
- Railway built-in metrics
- Custom health check endpoints
- Log aggregation and analysis

### Scaling Configuration

#### Horizontal Scaling
- Replica count: Configurable via railway.json
- Load balancing: Automatic via Railway
- Session management: Redis-backed sessions

#### Vertical Scaling
- CPU limits: 1000m (1 core)
- Memory limits: 2048MB
- Adjustable via deployment configuration

### Security Best Practices

1. **Environment Variables**
   - Never commit secrets to repository
   - Use Railway's secret management
   - Rotate secrets regularly

2. **Network Security**
   - HTTPS enforcement
   - CORS configuration
   - Rate limiting enabled

3. **Application Security**
   - JWT token validation
   - Input sanitization
   - SQL injection prevention

### Support & Resources

- [Railway Documentation](https://docs.railway.app/)
- [Application Health Checks](./health-checks.md)
- [Performance Monitoring](./monitoring.md)
- [Troubleshooting Guide](./troubleshooting.md)