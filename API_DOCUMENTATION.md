# API Documentation - Authentication Endpoints

## Base URL
```
http://localhost:3000/api
```

---

## Authentication Endpoints

### 1. User Registration

**Endpoint:** `POST /api/auth/register`

**Description:** Register a new user account

**Access:** Public

**Request Body:**
```json
{
  "email": "user@example.com",
  "phone": "+919876543210",  // Optional
  "password": "password123"
}
```

**Validation:**
- `email` - Required, must be valid email format
- `password` - Required, minimum 6 characters
- `phone` - Optional, must be valid phone format

**Success Response (201):**
```json
{
  "status": "success",
  "message": "User registered successfully.",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "phone": "+919876543210",
      "role": "USER",
      "isEmailVerified": false,
      "isPhoneVerified": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**
- `400` - Validation error (missing/invalid fields)
- `409` - User already exists (duplicate email/phone)
- `500` - Server error

---

### 2. User Login

**Endpoint:** `POST /api/auth/login`

**Description:** Login user and receive JWT tokens

**Access:** Public

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Login successful.",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "phone": "+919876543210",
      "role": "USER",
      "isEmailVerified": false,
      "isPhoneVerified": false,
      "lastActive": "2024-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**
- `400` - Missing email/password
- `401` - Invalid credentials
- `403` - Account inactive
- `500` - Server error

---

### 3. User Logout

**Endpoint:** `POST /api/auth/logout`

**Description:** Logout user (client-side token removal)

**Access:** Protected (requires authentication)

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Logout successful."
}
```

**Note:** Since JWT is stateless, logout is primarily handled client-side by removing the token. This endpoint can be used for logging or future token blacklisting.

---

### 4. Refresh Token

**Endpoint:** `POST /api/auth/refresh`

**Description:** Refresh access token using refresh token

**Access:** Public

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Token refreshed successfully.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**
- `400` - Missing refresh token
- `401` - Invalid or expired refresh token
- `500` - Server error

---

## Authentication

Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

**Token Format:**
- Access Token: Expires in 7 days (default)
- Refresh Token: Expires in 30 days (default)

**Token Payload:**
```json
{
  "userId": 1,
  "email": "user@example.com",
  "role": "USER"
}
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "status": "error",
  "message": "Human-readable error message",
  "error": "Detailed error description (optional)"
}
```

---

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required/failed)
- `403` - Forbidden (insufficient permissions/account inactive)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error

