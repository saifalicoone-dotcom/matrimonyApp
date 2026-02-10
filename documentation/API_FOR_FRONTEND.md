## Base

- Base URL: `http://localhost:5000`
- Auth: `Authorization: Bearer <accessToken>` (for all "Protected" endpoints)

---

## Auth

- **POST `/api/auth/register`**

  - Body: `{ email, phone?, password, ... }`
  - Response: user + tokens

- **POST `/api/auth/login`**

  - Body: `{ emailOrPhone, password }`
  - Response: `{ accessToken, refreshToken, user }`

- **POST `/api/auth/refresh`**
  - Body: `{ refreshToken }`
  - Response: new `accessToken`

---

## Me (profile + settings)

- **GET `/api/users/me/profile`** – Show logged-in user's profile on dashboard
- **POST/PUT `/api/users/me/profile`** – Create/Update profile form

- **GET `/api/users/me/settings`** – Settings page
- **PATCH `/api/users/me/password`** – Change password
- **PATCH `/api/users/me/email`**, `/phone`, `/privacy`, `/deactivate`
- **DELETE `/api/users/me`** – Delete account

---

## Other Users

- **GET `/api/users/:userId/profile`** – Public profile view page
- **GET `/api/users/:userId/photos`**
  - Use for profile gallery:
  - Response data:
    - `photos` – array
    - `hasPrivatePhotos` – boolean
    - `accessGranted` – boolean
    - `requestStatus` – `"NONE" | "PENDING" | "REJECTED" | "ACCEPTED"`
    - `canRequestAccess` – boolean
- **POST `/api/users/:userId/photos/request-access`** – "Request Photo Access" button click
- **GET `/api/users/:id/contact`** – Show contact details if unlocked

---

## Photos (me)

- **GET `/api/users/me/photos`** – My photos gallery
- **POST `/api/users/me/photos`** – Upload (FormData, key: `photo`)
- **PATCH `/api/users/me/photos/:photoId/privacy`** – Toggle private/public
- **PATCH `/api/users/me/photos/:photoId/primary`** – Set as main DP
- **PATCH `/api/users/me/photos/reorder`** – Drag-sort save
- **GET `/api/users/me/photos/access-requests`** – Page of requests
- **PATCH `/api/users/me/photos/access-requests/:requestId/accept` / `reject`** – Owner decide

---

## Interests & Shortlist

- **POST `/api/interests`** – "Send Interest" button
- **GET `/api/interests`** – Tabs: sent / received
- **PATCH `/api/interests/:interestId/accept` / `reject`** – Accept/Reject

- **POST `/api/shortlist`** – "Add to Shortlist"
- **GET `/api/shortlist`** – Shortlist page
- **GET `/api/shortlist/:userId/check`** – Show "Shortlisted" badge
- **DELETE `/api/shortlist/:userId`** – Remove from shortlist

---

## Chat / Messages

- **REST:**

  - **GET `/api/messages/conversations`** – Conversations list for sidebar
  - **GET `/api/messages/:userId`** – History with user
  - **POST `/api/messages`** – Fallback send message (mostly socket.io se karoge)

- **Socket.io:** (see `SOCKET_CHAT_INTEGRATION_GUIDE.md`)
  - Connect with JWT
  - Events: `message:send`, `message:received`, etc.

---

## Wallet & Payments

- **GET `/api/wallet`** – Show wallet balance
- **POST `/api/wallet/add-money`** – Add balance (mock/simple)

- **POST `/api/payments/create-order`** – Razorpay order for subscription/wallet
- **POST `/api/payments/verify`** – After Razorpay success callback, verify & credit
- **GET `/api/payments/status/:transactionId`** – Show payment status

---

## Notifications

- **GET `/api/users/me/notifications`** – Notification list
- **GET `/api/users/me/notifications/unread-count`** – Badge count
- **PATCH `/api/users/me/notifications/:id/read`** – Mark single as read
- **PATCH `/api/users/me/notifications/mark-all-read`** – "Mark all as read"
- **DELETE `/api/users/me/notifications/:id`** – Remove notification

---

## Search & Recommendations

- **GET `/api/search/users`**
  - Query params: filters + `page`, `limit`
- **GET `/api/recommendations`**
  - For "Recommended Matches" section

---

## Reports

- **POST `/api/reports`** – "Report Profile" button
- **GET `/api/reports/my-reports`** – My reports page
- **Admin-only**:
  - **GET `/api/reports/admin`**
  - **GET `/api/reports/:reportId`**
  - **PATCH `/api/reports/:reportId/review`**
