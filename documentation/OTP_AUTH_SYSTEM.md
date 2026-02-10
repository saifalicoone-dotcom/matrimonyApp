# OTP-Based Authentication System

## Overview
This document describes the OTP (One-Time Password) based authentication system implemented for the matrimonial application. The system replaces traditional password-based authentication with phone number-based OTP authentication.

## Features

### 1. OTP-Based Registration
- Users can register using only their phone number
- OTP is sent to the phone number for verification
- After OTP verification, user account is created
- Email is optional during registration

### 2. OTP-Based Login
- Users can login using only their phone number
- OTP is sent to the phone number for verification
- After OTP verification, JWT tokens are issued
- No password required for login

### 3. Redis Integration
- OTP codes are cached in Redis for fast retrieval
- Session management using Redis
- Rate limiting for OTP requests
- Automatic cleanup of expired OTPs

### 4. Security Features
- Rate limiting to prevent abuse
- Temporary blocking after failed attempts
- Expiration of OTPs after specified time
- Secure storage of OTPs

## API Endpoints

### Registration Flow
- `POST /api/auth/register-otp` - Initiate registration with OTP
- `POST /api/auth/complete-registration` - Complete registration with OTP

### Login Flow
- `POST /api/auth/login-otp` - Initiate login with OTP
- `POST /api/auth/complete-login` - Complete login with OTP

### Health Checks
- `GET /health` - Basic health check
- `GET /health/detail` - Detailed health check

## Implementation Details

### OTP Generation and Storage
1. When an OTP is requested, it's generated and stored in both PostgreSQL and Redis
2. The OTP is valid for 10 minutes by default
3. Redis provides faster access for verification
4. Database ensures persistence and backup verification

### Rate Limiting
- Maximum 5 OTP requests per phone number per 5 minutes
- Failed attempts are tracked separately (5 failed attempts per hour leads to temporary block)
- Temporary block lasts for 1 hour

### Security Measures
- Phone numbers are validated using regex patterns
- OTPs are 6-digit numeric codes
- Each OTP can only be used once
- Old unused OTPs are cleaned up automatically

## Configuration

### Environment Variables
- `REDIS_URL` - Redis connection URL (defaults to `redis://localhost:6379`)
- `NODE_ENV` - Environment (development/production)

### SMS Service Configuration
The system supports multiple SMS services:
- Console logging (for development)
- Twilio
- AWS SNS

Configure using `SMS_SERVICE` environment variable.

## Data Models

### OTP Table Changes
Added `purpose` field to track the reason for OTP generation:
- `registration` - For user registration
- `login` - For user login
- `verification` - For phone verification

## Error Handling

### Common Error Codes
- `400` - Invalid input (phone format, OTP format)
- `404` - User not found
- `409` - User already exists
- `429` - Rate limit exceeded or phone blocked
- `500` - Internal server error

## Testing

A test script is provided at `test-otp-auth.js` to verify the complete flow.

## Performance Benefits

1. **Fast Verification**: Redis caching enables rapid OTP verification
2. **Reduced Database Load**: Frequent OTP checks use Redis instead of database
3. **Scalability**: Distributed session management with Redis
4. **Security**: Rate limiting prevents brute-force attacks

## Future Enhancements

1. Add support for multiple phone number verification
2. Implement backup authentication methods
3. Add analytics for OTP success/failure rates
4. Enhanced fraud detection mechanisms