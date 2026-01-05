# Phone OTP Verification & Phone Login - Postman API URLs

**Base URL**: `http://localhost:3000`

---

## 📱 Phone OTP Verification Endpoints

### 1. Send OTP
- **Method**: `POST`
- **URL**: `http://localhost:3000/api/auth/send-otp`
- **Auth**: None (Public)
- **Body** (JSON):
```json
{
  "phone": "+919876543210"
}
```

**Response** (Development mode):
```json
{
  "status": "success",
  "message": "OTP sent successfully to your phone.",
  "data": {
    "otp": "123456"  // Only in development mode
  }
}
```

---

### 2. Verify OTP
- **Method**: `POST`
- **URL**: `http://localhost:3000/api/auth/verify-otp`
- **Auth**: None (Public)
- **Body** (JSON):
```json
{
  "phone": "+919876543210",
  "otp": "123456"
}
```

**Response**:
```json
{
  "status": "success",
  "message": "Phone number verified successfully.",
  "data": {
    "phoneVerified": true
  }
}
```

---

## 🔐 Updated Login Endpoints

### 3. Login with Phone Number
- **Method**: `POST`
- **URL**: `http://localhost:3000/api/auth/login`
- **Auth**: None (Public)
- **Body** (JSON):
```json
{
  "phone": "+919876543210",
  "password": "Password123!"
}
```

**Response**:
```json
{
  "status": "success",
  "message": "Login successful.",
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "phone": "+919876543210",
      "role": "USER",
      "isEmailVerified": false,
      "isPhoneVerified": true,
      "lastActive": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt_access_token",
    "refreshToken": "jwt_refresh_token"
  }
}
```

---

### 4. Login with Email (Existing)
- **Method**: `POST`
- **URL**: `http://localhost:3000/api/auth/login`
- **Auth**: None (Public)
- **Body** (JSON):
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**Response**: Same as phone login

---

## 📝 Complete Authentication Flow

### Registration → Phone Verification → Login Flow:

#### Step 1: Register User
```
POST http://localhost:3000/api/auth/register
{
  "email": "user@example.com",
  "phone": "+919876543210",
  "password": "Password123!"
}
```

#### Step 2: Send OTP
```
POST http://localhost:3000/api/auth/send-otp
{
  "phone": "+919876543210"
}
```

#### Step 3: Verify OTP
```
POST http://localhost:3000/api/auth/verify-otp
{
  "phone": "+919876543210",
  "otp": "123456"
}
```

#### Step 4: Login with Phone
```
POST http://localhost:3000/api/auth/login
{
  "phone": "+919876543210",
  "password": "Password123!"
}
```

OR

#### Step 4 (Alternative): Login with Email
```
POST http://localhost:3000/api/auth/login
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

---

## 🔧 Environment Variables

Make sure your `.env` file has:

```env
# SMS Service (choose one)
SMS_SERVICE=console  # Options: "console", "twilio", "aws-sns"

# For Development (console mode - OTP will be logged)
SMS_SERVICE=console

# For Production with Twilio
SMS_SERVICE=twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# For Production with AWS SNS
SMS_SERVICE=aws-sns
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

---

## 📌 Important Notes

1. **OTP Expiry**: OTP expires in 10 minutes
2. **OTP Format**: 6-digit numeric code
3. **Development Mode**: OTP is returned in response (only in development)
4. **Production Mode**: OTP is sent via SMS, not returned in response
5. **Phone Format**: Use international format with country code (e.g., +919876543210)
6. **Login**: Supports both email and phone number
7. **Phone Verification**: Must verify phone number before using phone login (optional but recommended)

---

## 🧪 Testing in Development

In development mode (`SMS_SERVICE=console`), OTP will be:
- Logged to console: `📱 SMS OTP for +919876543210: 123456`
- Returned in response (for testing)

---

## 🚀 Quick Test Flow

1. **Send OTP**: `POST /api/auth/send-otp` with phone number
2. **Check Console/Response**: Get OTP code
3. **Verify OTP**: `POST /api/auth/verify-otp` with phone and OTP
4. **Login**: `POST /api/auth/login` with phone and password

---

**All Endpoints Ready!** ✅

