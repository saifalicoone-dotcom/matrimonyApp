# 🚀 Production Deployment Checklist

## 📋 Pre-Deployment Preparation

### 🔐 Security Setup (Critical)
- [ ] **Generate secure passwords**:
  ```bash
  # Database password
  openssl rand -base64 32
  
  # Redis password  
  openssl rand -base64 32
  
  # JWT secrets (different for each)
  openssl rand -base64 32
  ```

- [ ] **Update `.env.production`** with real values:
  - `DB_PASSWORD` - Secure database password
  - `REDIS_PASSWORD` - Secure Redis password
  - `JWT_SECRET` - 32+ character secret
  - `JWT_REFRESH_SECRET` - Different 32+ character secret
  - `RAZORPAY_KEY_ID` - LIVE key (not test)
  - `RAZORPAY_KEY_SECRET` - LIVE secret
  - `R2_*` credentials - Production R2 keys
  - `TWILIO_*` or `AWS_*` - Production SMS credentials

### 🧪 Local Testing
- [ ] Test Docker build locally: `npm run docker:build`
- [ ] Test migration locally: `npm run docker:db:migrate`
- [ ] Verify health checks work: `npm run docker:up` then check `/health`
- [ ] Test all critical flows (auth, chat, payments) in local Docker

### 📁 File Setup
- [ ] Ensure `.env.production` is created with real secrets
- [ ] Verify `.gitignore` excludes `.env*` files
- [ ] Confirm `uploads/` directory exists and is writable
- [ ] Check that `prisma/migrations/` directory exists

## 🚢 Deployment Steps

### 1. Server Preparation
- [ ] **Server Setup**:
  - [ ] Install Docker and Docker Compose
  - [ ] Open ports: 3000 (app), 80/443 (nginx/reverse proxy)
  - [ ] Set up firewall rules
  - [ ] Configure SSL/HTTPS (Let's Encrypt recommended)

- [ ] **Environment Configuration**:
  ```bash
  # Copy production env file
  cp .env.production .env
  
  # Set secure permissions
  chmod 600 .env
  ```

### 2. Database Preparation
- [ ] **PostgreSQL Setup**:
  - [ ] Create production database
  - [ ] Create dedicated database user
  - [ ] Set up proper permissions
  - [ ] Configure backups (pg_dump automated)

- [ ] **Initial Migration**:
  ```bash
  # Build and start services
  npm run docker:build
  npm run docker:up
  
  # Run initial migration
  npm run docker:db:migrate
  ```

### 3. Application Deployment
- [ ] **Deploy Application**:
  ```bash
  # Build with production settings
  npm run docker:build
  
  # Start all services
  npm run docker:up
  
  # Verify services are running
  docker-compose ps
  ```

- [ ] **Verify Health**:
  - [ ] Check container logs: `npm run docker:logs`
  - [ ] Test health endpoint: `curl http://localhost:3000/health`
  - [ ] Verify all services are healthy in docker-compose

### 4. Network Configuration
- [ ] **Reverse Proxy Setup** (Nginx/Apache):
  - [ ] Configure SSL termination
  - [ ] Set up proper headers (X-Forwarded-For, etc.)
  - [ ] Configure rate limiting
  - [ ] Set up gzip compression

- [ ] **Domain Configuration**:
  - [ ] Point domain to server IP
  - [ ] Configure DNS records
  - [ ] Set up SSL certificate

## 🔍 Post-Deployment Verification

### 🔧 Service Verification
- [ ] **Database**:
  - [ ] PostgreSQL is running and accessible
  - [ ] Correct database schema applied
  - [ ] Proper user permissions set

- [ ] **Cache**:
  - [ ] Redis is running with password auth
  - [ ] Memory usage is reasonable
  - [ ] No connection errors

- [ ] **Application**:
  - [ ] Backend API responds correctly
  - [ ] Health checks pass
  - [ ] All environment variables loaded
  - [ ] File uploads work
  - [ ] Socket.io connections work

### 🧪 Functional Testing
- [ ] **Authentication**:
  - [ ] User registration works
  - [ ] OTP login functions
  - [ ] JWT tokens are generated
  - [ ] Session management works

- [ ] **Core Features**:
  - [ ] Profile creation/update
  - [ ] Search functionality
  - [ ] Interest system
  - [ ] Real-time chat
  - [ ] Photo uploads
  - [ ] Payment processing

- [ ] **Security**:
  - [ ] CORS is properly configured
  - [ ] Rate limiting works
  - [ ] No sensitive data in logs
  - [ ] HTTPS enforced

### 📊 Monitoring Setup
- [ ] **Logging**:
  - [ ] Centralized logging configured
  - [ ] Log rotation set up
  - [ ] Error logs monitored

- [ ] **Monitoring**:
  - [ ] Uptime monitoring (UptimeRobot, etc.)
  - [ ] Performance monitoring
  - [ ] Database monitoring
  - [ ] Alerting configured

- [ ] **Backups**:
  - [ ] Automated database backups
  - [ ] File backup strategy
  - [ ] Backup restoration tested

## 🛡️ Security Hardening

### 🔒 Access Control
- [ ] **Server Security**:
  - [ ] SSH key-only authentication
  - [ ] Fail2ban configured
  - [ ] Regular security updates
  - [ ] Minimal necessary ports open

- [ ] **Application Security**:
  - [ ] API keys rotated regularly
  - [ ] Secrets stored securely
  - [ ] Input validation enforced
  - [ ] SQL injection protection verified

### 📈 Performance Optimization
- [ ] **Database**:
  - [ ] Proper indexing
  - [ ] Connection pooling configured
  - [ ] Query performance optimized

- [ ] **Application**:
  - [ ] Caching strategy implemented
  - [ ] Static assets optimized
  - [ ] Response compression enabled

## 🆘 Emergency Procedures

### 🔁 Rollback Plan
- [ ] **Database Rollback**:
  - [ ] Latest backup available
  - [ ] Rollback procedure documented
  - [ ] Test rollback in staging

- [ ] **Application Rollback**:
  - [ ] Previous version tagged in git
  - [ ] Quick deployment process
  - [ ] Health check verification

### 🚨 Incident Response
- [ ] **Monitoring Alerts**:
  - [ ] Critical alerts configured
  - [ ] Response team notified
  - [ ] Escalation procedures

- [ ] **Recovery Process**:
  - [ ] Disaster recovery plan
  - [ ] Contact information updated
  - [ ] Communication plan

## ✅ Final Verification

### 🎯 Go-Live Checklist
- [ ] All pre-deployment tasks completed
- [ ] All services running and healthy
- [ ] All critical features tested
- [ ] Monitoring and alerting active
- [ ] Backup systems verified
- [ ] Security measures in place
- [ ] Documentation updated
- [ ] Team trained on procedures

### 📋 Documentation
- [ ] Deployment documentation complete
- [ ] Runbook for common issues
- [ ] Contact information current
- [ ] Change management process

---

## 🚨 Critical Reminders

⚠️ **DO NOT DEPLOY IF ANY OF THESE FAIL:**
- [ ] Environment variables properly set
- [ ] Database migrations successful
- [ ] Health checks passing
- [ ] Security credentials are secure
- [ ] Backup systems functional
- [ ] Monitoring active

✅ **Ready for Production When:**
All critical items above are checked and verified ✅

---

**Deployment Commander:** _____________________
**Date:** _____________________
**Time Started:** _____________________
**Time Completed:** _____________________