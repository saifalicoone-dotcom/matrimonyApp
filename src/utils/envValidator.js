// Environment Variables Validation Utility
// This module validates all required environment variables on startup

const requiredEnvVars = [
  // Server Configuration
  'PORT',
  'NODE_ENV',
  
  // Database
  'DATABASE_URL',
  
  // Redis
  'REDIS_URL',
  
  // Authentication
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  
  // SMS Service (at least one configuration)
  // Note: SMS_SERVICE determines which specific vars are required
  'SMS_SERVICE',
  
  // Payment Gateway
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
  
  // File Storage
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_ENDPOINT'
];

const optionalEnvVars = [
  'CLIENT_URL',
  'JWT_EXPIRES_IN',
  'JWT_REFRESH_EXPIRES_IN',
  'LOG_LEVEL',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'R2_PUBLIC_URL'
];

// SMS Service specific validations
const smsServiceConfigs = {
  twilio: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'],
  'aws-sns': ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'],
  console: [] // No additional requirements
};

function validateEnvironmentVariables() {
  console.log('🔍 Validating environment variables...');
  
  const errors = [];
  const warnings = [];
  
  // Check required environment variables
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      errors.push(`❌ Missing required environment variable: ${envVar}`);
    } else {
      console.log(`✅ ${envVar}: ${process.env[envVar].substring(0, 30)}${process.env[envVar].length > 30 ? '...' : ''}`);
    }
  }
  
  // Validate SMS service configuration
  const smsService = process.env.SMS_SERVICE;
  if (smsService) {
    if (smsServiceConfigs[smsService]) {
      const requiredSMSVars = smsServiceConfigs[smsService];
      for (const envVar of requiredSMSVars) {
        if (!process.env[envVar]) {
          errors.push(`❌ Missing ${smsService} SMS service variable: ${envVar}`);
        }
      }
    } else {
      warnings.push(`⚠️  Unknown SMS_SERVICE value: ${smsService}. Using console mode.`);
    }
  } else {
    warnings.push('⚠️  SMS_SERVICE not configured. Defaulting to console mode.');
  }
  
  // Validate database URL format
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      if (url.protocol !== 'postgresql:') {
        warnings.push('⚠️  DATABASE_URL protocol is not postgresql://');
      }
    } catch (error) {
      errors.push('❌ Invalid DATABASE_URL format');
    }
  }
  
  // Validate Redis URL format
  if (process.env.REDIS_URL) {
    try {
      const url = new URL(process.env.REDIS_URL);
      if (url.protocol !== 'redis:') {
        warnings.push('⚠️  REDIS_URL protocol is not redis://');
      }
    } catch (error) {
      errors.push('❌ Invalid REDIS_URL format');
    }
  }
  
  // Check for deprecated or unused variables
  const deprecatedVars = [
    'DEV_SHOW_OTP' // This variable is mentioned in the env file but not used in code
  ];
  
  for (const envVar of deprecatedVars) {
    if (process.env[envVar]) {
      warnings.push(`⚠️  Deprecated environment variable found: ${envVar} (no longer used)`);
    }
  }
  
  // Summary
  console.log('\n📋 Validation Summary:');
  console.log(`✅ Required variables validated: ${requiredEnvVars.length - errors.filter(e => e.includes('Missing')).length}/${requiredEnvVars.length}`);
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(warning => console.log(`  ${warning}`));
  }
  
  if (errors.length > 0) {
    console.log('\n❌ Errors (Application will not start):');
    errors.forEach(error => console.log(`  ${error}`));
    console.log('\nPlease fix the above errors in your .env file and restart the application.');
    process.exit(1);
  }
  
  console.log('\n✅ All required environment variables are properly configured!\n');
  return true;
}

function getMissingVariables() {
  const missing = [];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }
  
  // Check SMS service specific requirements
  const smsService = process.env.SMS_SERVICE;
  if (smsService && smsServiceConfigs[smsService]) {
    const requiredSMSVars = smsServiceConfigs[smsService];
    for (const envVar of requiredSMSVars) {
      if (!process.env[envVar]) {
        missing.push(envVar);
      }
    }
  }
  
  return missing;
}

function getEnvironmentStatus() {
  const status = {
    required: {},
    optional: {},
    missing: getMissingVariables()
  };
  
  // Categorize all environment variables
  [...requiredEnvVars, ...optionalEnvVars].forEach(envVar => {
    const isRequired = requiredEnvVars.includes(envVar);
    const value = process.env[envVar];
    
    if (isRequired) {
      status.required[envVar] = {
        value: value || null,
        present: !!value,
        isRequired: true
      };
    } else {
      status.optional[envVar] = {
        value: value || null,
        present: !!value,
        isRequired: false
      };
    }
  });
  
  return status;
}

module.exports = {
  validateEnvironmentVariables,
  getMissingVariables,
  getEnvironmentStatus
};