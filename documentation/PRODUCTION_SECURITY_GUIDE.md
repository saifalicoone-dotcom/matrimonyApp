# 🛡️ PRODUCTION SECURITY GUIDE

## 🔐 Critical Security Measures

### 🔑 Secret Management
All secrets must be properly secured in production:

1. **Generate Strong Secrets**:
```bash
# JWT Secrets (minimum 32 characters each)
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For JWT_REFRESH_SECRET (MUST BE DIFFERENT)

# Database & Redis Passwords
openssl rand -base64 24  # For DB_PASSWORD
openssl rand -base64 24  # For REDIS_PASSWORD
```

2. **Environment File Security**:
```bash
# Set proper permissions
chmod 600 .env.production
chmod 600 .env

# Never commit secrets to version control
echo ".env*" >> .gitignore
```

### 🚫 NEVER DO THESE IN PRODUCTION:
- ❌ Use default passwords ("password", "admin")
- ❌ Store secrets in version control
- ❌ Use test API keys in production
- ❌ Expose database ports publicly
- ❌ Run containers as root user
- ❌ Use development SMS service (console)
- ❌ Disable SSL/HTTPS
- ❌ Skip input validation
- ❌ Log sensitive information

## 🔧 Required Configuration Changes

### 1. Update All Secrets
**Before deploying, REPLACE ALL placeholder values in `.env.production`:**

```bash
# Generate and set these values:
DB_PASSWORD="your_secure_db_password_here"
REDIS_PASSWORD="your_secure_redis_password_here"  
JWT_SECRET="your_very_long_jwt_secret_here_min_32_chars"
JWT_REFRESH_SECRET="your_different_jwt_refresh_secret_here"
RAZORPAY_KEY_ID="rzp_live_xxxxxxxxxxxxx"  # LIVE key, not test
RAZORPAY_KEY_SECRET="your_live_razorpay_secret"
R2_ACCOUNT_ID="your_production_account_id"
R2_ACCESS_KEY_ID="your_production_access_key"
R2_SECRET_ACCESS_KEY="your_production_secret_key"
R2_BUCKET_NAME="matrimonial-production-bucket"
```

### 2. SMS Service Configuration
**Change from development to production SMS provider:**

```bash
# Option A: Twilio (Recommended)
SMS_SERVICE=twilio
TWILIO_ACCOUNT_SID=your_production_account_sid
TWILIO_AUTH_TOKEN=your_production_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Option B: AWS SNS
SMS_SERVICE=aws-sns
AWS_ACCESS_KEY_ID=your_production_key
AWS_SECRET_ACCESS_KEY=your_production_secret
AWS_REGION=us-east-1
```

### 3. CORS Configuration
**Set proper allowed origins:**

```bash
# In .env.production
CLIENT_URL=https://your-production-domain.com
# Or for multiple domains:
# CLIENT_URL=https://app.yourdomain.com,https://admin.yourdomain.com
```

## 🔍 Security Verification Checklist

### 🔐 Pre-Deployment Security Check
- [ ] All passwords generated with `openssl rand -base64`
- [ ] JWT_SECRET and JWT_REFRESH_SECRET are different
- [ ] Database password is 16+ characters
- [ ] Redis password is 16+ characters
- [ ] Razorpay keys are LIVE (not test)
- [ ] R2 credentials are production keys
- [ ] SMS service configured for production
- [ ] `.env.production` file permissions set to 600
- [ ] `.gitignore` includes `.env*`

### 🛡️ Network Security
- [ ] PostgreSQL port (5432) NOT exposed publicly
- [ ] Redis port (6379) NOT exposed publicly
- [ ] Only application port (3000) exposed through reverse proxy
- [ ] SSL/HTTPS configured and enforced
- [ ] Firewall rules configured properly
- [ ] SSH access restricted to specific IPs

### 🔍 Runtime Security
- [ ] Containers running as non-root user
- [ ] Health checks implemented
- [ ] Resource limits set (memory/CPU)
- [ ] Log levels appropriate (not debug)
- [ ] No sensitive data in logs
- [ ] Rate limiting enabled
- [ ] Input validation enforced

## 🚨 Emergency Security Procedures

### 🔐 Secret Compromise Protocol
If any secrets are compromised:

1. **Immediate Actions**:
   ```bash
   # Rotate ALL secrets immediately
   openssl rand -base64 32  # New JWT_SECRET
   openssl rand -base64 32  # New JWT_REFRESH_SECRET
   openssl rand -base64 24  # New DB_PASSWORD
   openssl rand -base64 24  # New REDIS_PASSWORD
   ```

2. **Update Configuration**:
   - Update `.env.production` with new secrets
   - Redeploy application
   - Invalidate all existing JWT tokens
   - Rotate API keys (Razorpay, R2, SMS)

3. **Security Audit**:
   - Review logs for unauthorized access
   - Check database for suspicious activity
   - Verify file integrity
   - Update monitoring alerts

### 🔥 Incident Response
**Critical Security Issues:**
- Database breach → Immediate shutdown + investigation
- API key exposure → Rotate keys + audit usage
- Unauthorized access → Block IPs + enhance security
- DDoS attack → Enable rate limiting + CDN protection

## 📊 Security Monitoring

### 🔍 What to Monitor
- Failed login attempts
- Suspicious API usage patterns
- Database query performance
- File upload attempts
- Payment processing anomalies
- Container resource usage
- Network traffic patterns

### 🚨 Alert Thresholds
- More than 10 failed logins per minute
- More than 100 requests per minute from same IP
- Database queries taking >5 seconds
- Container memory usage >80%
- Disk space <20% remaining

## 🔧 Additional Security Recommendations

### 🛡️ Advanced Security Measures
1. **Web Application Firewall (WAF)**:
   - Cloudflare WAF
   - AWS WAF
   - Custom Nginx rules

2. **Rate Limiting**:
   ```bash
   # In nginx configuration
   limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
   limit_req zone=api burst=200 nodelay;
   ```

3. **Security Headers**:
   ```nginx
   add_header X-Content-Type-Options nosniff;
   add_header X-Frame-Options DENY;
   add_header X-XSS-Protection "1; mode=block";
   add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
   ```

4. **Regular Security Updates**:
   - Weekly OS updates
   - Monthly dependency updates
   - Quarterly security audits
   - Annual penetration testing

### 🔐 Compliance Considerations
- **GDPR**: Data protection and privacy
- **PCI DSS**: Payment card security (if handling card data directly)
- **SOC 2**: Security and availability controls
- **ISO 27001**: Information security management

## 📞 Security Contacts

**Security Team**: security@yourcompany.com
**Incident Response**: incidents@yourcompany.com
**24/7 Support**: +1-XXX-XXX-XXXX

---

## ✅ Security Deployment Verification

Before going live, verify ALL security measures:

- [ ] **Secrets**: All generated securely and different
- [ ] **Network**: Only necessary ports exposed
- [ ] **Authentication**: Strong password policies
- [ ] **Authorization**: Proper role-based access
- [ ] **Encryption**: HTTPS enforced, data encrypted at rest
- [ ] **Monitoring**: Security events logged and monitored
- [ ] **Backup**: Regular backups with encryption
- [ ] **Recovery**: Disaster recovery plan tested

**Security Lead**: _____________________
**Security Review Date**: _____________________
**Security Status**: ✅ Approved / ❌ Requires Changes