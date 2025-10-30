# Security Policy

## Overview

This document outlines the security measures, best practices, and incident response procedures for the SBS (OptiTrack) project.

---

## 🔒 Security Measures Implemented

### 1. **Environment Variable Security**

- ✅ All sensitive credentials stored in `.env` files
- ✅ `.env` files excluded from version control via `.gitignore`
- ✅ `.env.example` provided as template (without actual credentials)
- ✅ Environment variable validation using Zod schemas

**Important:** Never commit `.env` files or hardcode credentials in source code.

### 2. **Password Security**

- ✅ Passwords hashed using bcrypt with 12 salt rounds
- ✅ Password strength validation enforced:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
- ✅ Protection against common weak passwords
- ✅ Account lockout after 5 failed login attempts (15-minute lockout)

### 3. **Authentication & Authorization**

- ✅ JWT-based authentication with 24-hour expiration
- ✅ Token blacklisting on logout
- ✅ Role-based access control (Admin, Technicien, Lecteur)
- ✅ Session validation on each request
- ✅ Secure token storage (httpOnly cookies recommended for production)

### 4. **Rate Limiting**

- ✅ General API: 1000 requests per 15 minutes
- ✅ Auth endpoints: 5 attempts per 15 minutes
- ✅ Automatic IP-based throttling
- ✅ Failed login attempt tracking

### 5. **Input Validation & Sanitization**

- ✅ Express Validator for input validation
- ✅ NoSQL injection prevention with express-mongo-sanitize
- ✅ HTTP Parameter Pollution (HPP) protection
- ✅ XSS prevention through input sanitization
- ✅ CSRF protection ready (implement tokens in production)

### 6. **Security Headers**

- ✅ Helmet.js for security headers
- ✅ Content Security Policy (CSP)
- ✅ HTTP Strict Transport Security (HSTS)
- ✅ X-Content-Type-Options: nosniff
- ✅ X-Frame-Options: DENY
- ✅ Referrer-Policy: strict-origin-when-cross-origin

### 7. **CORS Configuration**

- ✅ Whitelist-based origin validation
- ✅ Credentials support for authenticated requests
- ✅ Restricted HTTP methods
- ✅ Development vs. production environment handling

### 8. **Database Security**

- ✅ Parameterized queries via Prisma ORM
- ✅ SQL injection prevention
- ✅ Password fields never returned in API responses
- ✅ Soft deletes for sensitive data
- ✅ Audit logging for all critical operations

### 9. **File Upload Security**

- ✅ File type validation
- ✅ File size limits (10MB max)
- ✅ Secure file storage location
- ✅ Unique filename generation

### 10. **Logging & Monitoring**

- ✅ Winston logger for structured logging
- ✅ HTTP request logging with Morgan
- ✅ Failed login attempt tracking
- ✅ Security event logging
- ✅ Error logging with context

---

## 🚨 Critical Security Checklist

### Before Deployment

- [ ] All `.env` files removed from git history
- [ ] Strong, unique credentials generated for production
- [ ] Database passwords rotated
- [ ] JWT secrets rotated
- [ ] SMTP credentials updated
- [ ] HTTPS enabled
- [ ] CSP headers configured for production domains
- [ ] Rate limiting configured appropriately
- [ ] Firewall rules configured
- [ ] Database backups automated
- [ ] Security monitoring enabled
- [ ] Incident response plan documented

### Regular Security Tasks

**Daily:**
- [ ] Review failed login attempts
- [ ] Check for suspicious activity in logs
- [ ] Monitor rate limit violations

**Weekly:**
- [ ] Run `npm audit` to check for vulnerabilities
- [ ] Review access logs
- [ ] Check for unauthorized access attempts

**Monthly:**
- [ ] Update dependencies
- [ ] Review and update firewall rules
- [ ] Test backup restoration
- [ ] Security training for team

**Quarterly:**
- [ ] Rotate credentials
- [ ] Security audit
- [ ] Penetration testing
- [ ] Review and update security policies

---

## 🔐 Credential Management

### Generate New Credentials

```bash
# JWT Secret (64 bytes)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Session Secret (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Database Password
openssl rand -base64 32
```

### Store Credentials Securely

**Development:**
- Store in `.env` file (never commit)
- Use `.env.example` as template

**Production:**
- Use environment variables
- Use secrets management services:
  - AWS Secrets Manager
  - Azure Key Vault
  - HashiCorp Vault
  - Google Cloud Secret Manager

### Rotate Credentials

**When to rotate:**
- Suspected compromise
- Employee departure
- Every 90 days (best practice)
- After security incident

**How to rotate:**
1. Generate new credentials
2. Update production environment variables
3. Deploy changes
4. Invalidate old credentials
5. Monitor for issues

---

## 🛡️ Incident Response Plan

### 1. Detection

**Indicators of compromise:**
- Unusual login patterns
- Multiple failed authentication attempts
- Unexpected database queries
- Unusual network traffic
- Alerts from monitoring systems

### 2. Containment

**Immediate actions:**
1. Isolate affected systems
2. Block suspicious IP addresses
3. Revoke compromised credentials
4. Enable maintenance mode if necessary

### 3. Investigation

**Gather evidence:**
- Review application logs
- Check database audit logs
- Analyze network traffic
- Identify attack vector
- Determine scope of breach

### 4. Eradication

**Remove threat:**
- Patch vulnerabilities
- Remove malicious code
- Update all credentials
- Strengthen security controls

### 5. Recovery

**Restore services:**
- Restore from clean backups
- Verify system integrity
- Monitor for re-infection
- Gradually restore services

### 6. Post-Incident

**Learn and improve:**
- Document incident
- Conduct post-mortem
- Update security policies
- Implement preventive measures
- Train team on lessons learned

---

## 📧 Security Contact

**Report security vulnerabilities to:**
- Email: [Your Security Email]
- Response time: Within 24 hours
- Encryption: Use PGP key if available

**Please include:**
- Description of vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

---

## 🔍 Security Testing

### Automated Testing

```bash
# Dependency vulnerability scanning
npm audit
npm audit fix

# Run security tests
npm run test:security

# Code quality and security linting
npm run lint
```

### Manual Testing

**Authentication:**
- [ ] Test password strength validation
- [ ] Verify account lockout mechanism
- [ ] Test session expiration
- [ ] Verify token invalidation on logout

**Authorization:**
- [ ] Test role-based access control
- [ ] Verify unauthorized access prevention
- [ ] Test privilege escalation prevention

**Input Validation:**
- [ ] Test XSS prevention
- [ ] Test SQL injection prevention
- [ ] Test file upload security
- [ ] Test parameter tampering

**Rate Limiting:**
- [ ] Verify rate limit enforcement
- [ ] Test bypass attempts
- [ ] Verify IP-based throttling

---

## 📚 Security Resources

### Dependencies

```json
{
  "helmet": "Security headers",
  "cors": "CORS configuration",
  "express-rate-limit": "Rate limiting",
  "express-mongo-sanitize": "NoSQL injection prevention",
  "hpp": "HTTP Parameter Pollution prevention",
  "bcryptjs": "Password hashing",
  "jsonwebtoken": "JWT authentication",
  "express-validator": "Input validation",
  "zod": "Schema validation"
}
```

### Documentation

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

---

## 📝 Compliance

### GDPR Compliance

- [ ] User consent management
- [ ] Right to access data
- [ ] Right to deletion
- [ ] Data portability
- [ ] Data encryption
- [ ] Privacy policy
- [ ] Terms of service

### Data Protection

- [ ] Data encrypted at rest
- [ ] Data encrypted in transit (HTTPS)
- [ ] Secure data backups
- [ ] Data retention policies
- [ ] Access logging
- [ ] Audit trails

---

## 🚀 Deployment Security

### Pre-Deployment Checklist

```bash
# 1. Update dependencies
npm update
npm audit fix

# 2. Run tests
npm test

# 3. Build for production
npm run build

# 4. Verify environment variables
node -e "require('./src/config/env')"

# 5. Check for exposed secrets
git secrets --scan

# 6. Security scan
npm audit --production
```

### Production Environment

```bash
# Set production environment
export NODE_ENV=production

# Use strong secrets
export JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

# Enable HTTPS
export FORCE_HTTPS=true

# Restrict CORS
export ALLOWED_ORIGINS=https://yourdomain.com

# Configure logging
export LOG_LEVEL=warn
```

---

## 📊 Security Metrics

### Key Performance Indicators (KPIs)

- Failed login attempts per day
- Rate limit violations per day
- Average response time
- Security incidents per month
- Time to patch vulnerabilities
- Dependency vulnerabilities count
- Code coverage for security tests

### Monitoring

- Failed authentication attempts
- Unusual API access patterns
- Database query anomalies
- File upload patterns
- Error rate spikes
- Slow query detection

---

## ✅ Security Audit Results

**Last Audit:** [Date]
**Next Scheduled Audit:** [Date]

### Findings Summary

- **Critical:** 0
- **High:** 0
- **Medium:** 0
- **Low:** 0
- **Info:** 0

### Recommendations Implemented

1. ✅ Added comprehensive input validation
2. ✅ Implemented rate limiting
3. ✅ Enhanced password security
4. ✅ Added security headers
5. ✅ Configured CORS properly
6. ✅ Implemented account lockout
7. ✅ Added audit logging
8. ✅ Secured Docker configuration

---

## 📞 Emergency Contacts

**Security Team:**
- Lead: [Name] - [Email] - [Phone]
- Backup: [Name] - [Email] - [Phone]

**Infrastructure Team:**
- Lead: [Name] - [Email] - [Phone]

**Management:**
- CTO: [Name] - [Email] - [Phone]

---

**Document Version:** 1.0  
**Last Updated:** October 28, 2025  
**Next Review:** January 28, 2026
