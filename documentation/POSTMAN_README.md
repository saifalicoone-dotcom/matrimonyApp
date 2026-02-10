# Postman Collection for Matrimonial App

This Postman collection contains all the APIs for the matrimonial application with comprehensive examples.

## Setup Instructions

1. **Import Collection:**
   - Open Postman
   - Click "Import" 
   - Select the `Matrimonial_API_Collection.postman_collection.json` file
   - The collection will be imported with all APIs organized by category

2. **Configure Environment Variables:**
   After importing, you'll need to set up the following variables:
   - `base_url`: Your API base URL (default: `http://localhost:3000`)
   - `access_token`: JWT access token (obtained after login)
   - `refresh_token`: JWT refresh token (obtained after login)
   - `user_id`: Target user ID for various operations
   - `target_user_id`: User ID for interactions (interests, messages, etc.)
   - `interest_id`: Interest ID for acceptance/rejection
   - `transaction_id`: Transaction ID for payment operations
   - `subscription_id`: Subscription ID for subscription operations

## API Categories

### 1. Authentication
- **Register with OTP**: Start OTP-based registration process
- **Complete Registration**: Complete registration with OTP verification
- **Login with OTP**: Start OTP-based login process
- **Complete Login**: Complete login with OTP verification
- **Send OTP**: Send OTP for phone verification
- **Verify OTP**: Verify OTP for phone verification
- **Refresh Token**: Get new access token using refresh token
- **Logout**: Logout (client-side token removal)

### 2. Profile Management
- **Create/Update Profile**: Create or update user profile with comprehensive details
- **Get My Profile**: Retrieve current user's profile
- **Get User Profile by ID**: Retrieve another user's profile (with visibility checks)

### 3. Search & Recommendations
- **Search Users**: Advanced search with filters (age, gender, location, etc.)
- **Get Recommendations**: Get personalized match recommendations

### 4. Interest Management
- **Send Interest**: Send interest to another user (₹5 deduction)
- **Accept Interest**: Accept received interest
- **Reject Interest**: Reject received interest
- **Get Sent Interests**: View interests you've sent
- **Get Received Interests**: View interests you've received

### 5. Messaging
- **Send Message**: Send message to a user (requires accepted interest)
- **Get Messages with User**: Get conversation history with a specific user

### 6. Shortlist
- **Add to Shortlist**: Add user to favorites
- **Get Shortlisted Users**: View your shortlisted users
- **Remove from Shortlist**: Remove user from favorites

### 7. Blocking
- **Block User**: Block a user from contacting you
- **Get Blocked Users**: View users you've blocked
- **Unblock User**: Unblock a previously blocked user

### 8. Payments & Wallet
- **Create Payment Order**: Create Razorpay order for adding money
- **Verify Payment**: Verify payment and update wallet balance
- **Get Payment Status**: Check status of a payment transaction
- **Get Wallet Balance**: Retrieve current wallet balance
- **Add Money to Wallet**: Add funds to wallet (mock for testing)
- **Get Transaction History**: View wallet transaction history with pagination
- **Get Transaction Receipt**: Get details of specific transaction

### 9. Subscriptions
- **Get Subscription Plans**: View available subscription tiers
- **Purchase Subscription**: Buy a subscription plan
- **Verify Subscription Payment**: Confirm subscription payment
- **Get My Subscription**: View current subscription status
- **Get Subscription History**: View subscription history with pagination

### 10. Health Check
- **Basic Health Check**: Simple health status
- **Detailed Health Check**: Comprehensive health status with service details

## Testing Workflow

### 1. User Registration Flow
1. **Register with OTP** → Get OTP on console (development mode)
2. **Complete Registration** → Use OTP to complete registration
3. **Create Profile** → Set up your profile details

### 2. User Login Flow
1. **Login with OTP** → Get OTP on console
2. **Complete Login** → Use OTP to get access tokens
3. Set `access_token` and `refresh_token` variables in Postman

### 3. Profile Interaction Flow
1. **Search Users** → Find potential matches
2. **Get User Profile** → View detailed profile
3. **Send Interest** → Express interest (requires tokens)
4. **Send Message** → Communicate (after interest acceptance)

### 4. Profile Management
1. **Get My Profile** → View your own profile
2. **Update Profile** → Modify your profile details

### 5. Payment & Subscription Flow
1. **Get Wallet** → Check current balance
2. **Create Payment Order** → Initiate wallet top-up
3. **Verify Payment** → Confirm payment and update balance
4. **Purchase Subscription** → Buy a subscription plan
5. **Verify Subscription Payment** → Activate subscription
6. **Send Interest** → Send interest (₹5 deducted automatically)

## Important Notes

### Authentication
- All protected endpoints require `Authorization: Bearer {{access_token}}` header

### Payment Processing
- Payment operations require valid Razorpay credentials in `.env`
- Webhook endpoint `/api/payments/webhook` should be configured with Razorpay dashboard
- Wallet balance required for sending interests (₹5 fee)
- Access tokens expire in 7 days, refresh tokens in 30 days
- Use the Refresh Token endpoint to get new access tokens

### OTP Handling (Development Mode)
- In development, OTPs are logged to console instead of sent via SMS
- Default OTP for testing: `123456`
- You can modify SMS service in `.env` file

### Payment Integration
- Interest sending deducts ₹5 from user's wallet
- Wallet balance required for sending interests
- Payment gateway integrated with Razorpay

### Redis Caching
- Profile data, search results, and recommendations are cached
- Cache invalidation happens automatically on updates
- Application works even when Redis is unavailable (fallback to database)

### Rate Limiting
- OTP requests are rate-limited (5 attempts per 5 minutes)
- Payment-related rate limits follow Razorpay policies
- Failed OTP attempts may result in temporary blocking
- Phone numbers blocked for 1 hour after too many failed attempts

## Error Handling

The API returns consistent error responses:
```json
{
  "status": "error",
  "message": "Error description",
  "error": "Technical error details"
}
```

Common status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid token)
- `403`: Forbidden (access denied)
- `404`: Not Found
- `409`: Conflict (duplicate data)
- `429`: Too Many Requests (rate limiting)
- `500`: Internal Server Error

## Environment Setup

### Development Environment
```
base_url = http://localhost:3000
SMS_SERVICE = console
NODE_ENV = development
```

### Production Environment
```
base_url = https://your-domain.com
SMS_SERVICE = twilio/aws-sns
NODE_ENV = production
```

## Testing Tips

1. **Start with Authentication**: Always begin with registration/login to get tokens
2. **Use Variables**: Set Postman variables to avoid manual token updates
3. **Check Responses**: Pay attention to response structure and status codes
4. **Test Edge Cases**: Try invalid data, missing fields, and boundary conditions
5. **Monitor Cache**: Notice when responses come from cache (`fromCache: true`)

## Support

For issues with the API collection:
1. Check that all services are running (Docker setup)
2. Verify environment variables are correctly set
3. Ensure database migrations have been run
4. Check server logs for detailed error information