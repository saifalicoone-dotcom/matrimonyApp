# Razorpay Payment Gateway Integration Guide

## Overview
Real payment gateway integration using Razorpay for wallet top-ups in the matrimonial application.

## Setup Instructions

### 1. Get Razorpay Credentials

1. Sign up at [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Go to Settings → API Keys
3. Generate API Keys (Key ID and Key Secret)
4. For webhooks, go to Settings → Webhooks and create a webhook URL

### 2. Environment Variables

Add these to your `.env` file:

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret  # Optional, for webhook verification
```

### 3. Database Migration

Run Prisma migration to add payment tracking fields:

```bash
npx prisma migrate dev --name add_razorpay_payment_fields
npx prisma generate
```

## API Endpoints

### 1. Create Payment Order
**POST** `/api/payments/create-order`

**Request:**
```json
{
  "amount": 100
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Payment order created successfully.",
  "data": {
    "order": {
      "id": "order_xxxxx",
      "amount": 100,
      "currency": "INR",
      "receipt": "wallet_xxx_1234567890"
    },
    "key": "rzp_test_xxxxx",
    "transactionId": "uuid"
  }
}
```

### 2. Verify Payment
**POST** `/api/payments/verify`

**Request:**
```json
{
  "razorpay_order_id": "order_xxxxx",
  "razorpay_payment_id": "pay_xxxxx",
  "razorpay_signature": "signature_xxxxx",
  "transactionId": "uuid"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Payment verified and wallet updated successfully.",
  "data": {
    "wallet": {
      "id": "uuid",
      "balance": 100
    },
    "transaction": {
      "id": "uuid",
      "amount": 100,
      "status": "SUCCESS"
    }
  }
}
```

### 3. Get Payment Status
**GET** `/api/payments/status/:transactionId`

**Response:**
```json
{
  "status": "success",
  "data": {
    "transaction": {
      "id": "uuid",
      "amount": 100,
      "status": "SUCCESS",
      "razorpayOrderId": "order_xxxxx",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### 4. Webhook Handler
**POST** `/api/payments/webhook`

This endpoint is called by Razorpay when payment events occur. No authentication required (uses signature verification).

## Frontend Integration

### Step 1: Include Razorpay Checkout Script
```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

### Step 2: Create Order and Open Checkout
```javascript
// 1. Create order on your backend
const response = await fetch('/api/payments/create-order', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ amount: 100 })
});

const { data } = await response.json();

// 2. Open Razorpay Checkout
const options = {
  key: data.key, // Razorpay Key ID
  amount: data.order.amount * 100, // Amount in paise
  currency: data.order.currency,
  name: 'Matrimonial App',
  description: 'Wallet Top-up',
  order_id: data.order.id,
  handler: async function (response) {
    // 3. Verify payment on your backend
    const verifyResponse = await fetch('/api/payments/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
        transactionId: data.transactionId
      })
    });

    const result = await verifyResponse.json();
    if (result.status === 'success') {
      // Payment successful - update UI
      console.log('Payment successful!', result.data);
    }
  },
  prefill: {
    name: 'User Name',
    email: 'user@example.com',
    contact: '9999999999'
  },
  theme: {
    color: '#3399cc'
  }
};

const razorpay = new Razorpay(options);
razorpay.open();
```

## Payment Flow

1. **User initiates payment:**
   - Frontend calls `POST /api/payments/create-order`
   - Backend creates Razorpay order and pending transaction

2. **User completes payment:**
   - Razorpay checkout opens
   - User pays via card/UPI/netbanking
   - Razorpay processes payment

3. **Payment verification:**
   - Frontend receives payment response
   - Frontend calls `POST /api/payments/verify`
   - Backend verifies signature and updates wallet

4. **Webhook (optional backup):**
   - Razorpay sends webhook to `/api/payments/webhook`
   - Backend verifies webhook signature
   - Updates wallet if payment was successful

## Security Features

- ✅ Signature verification for all payments
- ✅ Webhook signature verification
- ✅ Transaction ownership validation
- ✅ Database transactions for atomicity
- ✅ Balance validation (never goes negative)

## Testing

### Test Mode
Use Razorpay test keys for development:
- Test Key ID: `rzp_test_xxxxx`
- Test Key Secret: `test_xxxxx`

### Test Cards
- Success: `4111 1111 1111 1111`
- Failure: `4000 0000 0000 0002`
- CVV: Any 3 digits
- Expiry: Any future date

## Error Handling

### Common Errors

1. **INSUFFICIENT_BALANCE**: Wallet balance is less than required amount
2. **PAYMENT_VERIFICATION_FAILED**: Signature verification failed
3. **INVALID_AMOUNT**: Amount must be at least ₹1

## Notes

- Minimum payment amount: ₹1
- All amounts are in INR (Indian Rupees)
- Razorpay charges apply (check Razorpay pricing)
- Webhook is optional but recommended for production

