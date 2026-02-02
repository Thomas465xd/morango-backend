# 📋 Morango E-commerce - Backend

> RESTful API for jewelry e-commerce platform built with **Express.js**, **TypeScript**, **MongoDB**, and **MercadoPago**.

## Overview

This is the backend API for **Morango**, a full-stack e-commerce platform providing:

- 🔐 User authentication (JWT + httpOnly cookies)
- 📦 Product catalog management
- 🛒 Order processing & fulfillment
- 💳 MercadoPago payment processing with webhooks
- 👤 Admin dashboard data endpoints
- 📧 Transactional email (password reset, order confirmations)
- ⏰ Background jobs (order expiry, stock reservations)
- 🗄️ MongoDB persistence with Mongoose

**See also:** [Frontend Repository](https://github.com/Thomas465xd/morango-frontend) | [AI Agent Guide](../.github/copilot-instructions.md)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- MongoDB instance (local or Atlas)
- MercadoPago account for payment credentials

### Installation & Development

```bash
# Clone and install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

Server runs on the configured `PORT` (default: 3001).

### Environment Variables

Create `.env` with:

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=mongodb://localhost:27017/morango
# or MongoDB Atlas: mongodb+srv://user:password@cluster.mongodb.net/morango

# Authentication
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRY=7d

# MercadoPago
MP_ACCESS_TOKEN=your_mp_access_token
MP_PUBLIC_KEY=your_mp_public_key
MP_WEBHOOK_SECRET=your_mp_webhook_secret

# Email
RESEND_API_KEY=your_resend_api_key

# CORS
FRONTEND_URL=http://localhost:3000
```

---

## 📁 Project Structure

```txt
server/
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # Express app setup & routing
│   ├── config/
│   │   ├── db.ts             # MongoDB connection
│   │   ├── cors.ts           # CORS configuration
│   │   ├── resend.ts         # Resend API key configuration
│   │   └── mercadopago.ts    # Mercado pago initial config
│   ├── routes/               # Route definitions & endpoints test suites
│   │   ├── __tests__ /        
│   │   |   ├── auth /        # Auth endpoints tests
│   │   |   ├── products /    # Products endpoints tests
│   │   |   ├── orders /      # Orders ndpoints tests
│   │   |   └── payments /        # Payments endpoints tests
│   │   ├── authRouter.ts     # /api/auth/*
│   │   ├── productRouter.ts  # /api/products/*
│   │   ├── orderRouter.ts    # /api/orders/*
│   │   └── paymentRouter.ts  # /api/payments/*
│   ├── controllers/          # Business logic
│   │   ├── authController.ts
│   │   ├── productController.ts
│   │   ├── orderController.ts
│   │   └── paymentController.ts
│   ├── models/               # Mongoose schemas
│   │   ├── User.ts
│   │   ├── Product.ts
│   │   ├── Order.ts
│   │   ├── Payment.ts
│   │   └── Token.ts
│   ├── middleware/
│   │   ├── auth.ts           # JWT verification
│   │   ├── error.ts          # Global error handler
│   │   ├── validation.ts     # Request validation
│   │   └── mercadopago.ts    # Webhook validation
│   ├── errors/               # Custom error classes
│   │   ├── custom-error.ts
│   │   ├── not-found.ts
│   │   ├── conflict-error.ts
│   │   ├── forbidden-error.ts
│   │   └── ...
│   ├── cron/                 # Background jobs
│   │   ├── deleteExpired.ts  # Expire old orders
│   │   ├── index.ts          # Cron job common exports as initCrons function. 
│   │   └── expireOrders.ts   # Delete expired
│   ├── emails/               # Email templates & sending
│   │   ├── resetPassword.ts
│   │   ├── orderConfirmation.ts
│   │   └── ...
│   ├── types/                # TypeScript interfaces
│   │   ├── express.d.ts      # Extend Express Request
│   │   └── validators.ts
│   ├── utils/                # Helper functions
│   │   ├── jwt.ts
│   │   ├── json.ts
│   │   ├── auth.ts
│   │   ├── payment.ts
│   │   ├── order.ts
│   │   ├── product.ts
│   │   └── token.ts
│   └── tests/
│       ├── setup.ts          # Test DB setup (mongodb-memory-server)
│       └── __tests__/        # Test files
├── tsconfig.json
├── package.json
└── .env.example
```

---

## 🔨 Available Scripts

```bash
# Development with hot reload
npm run dev

# Build TypeScript
npm run build

# Run compiled JavaScript
node dist/index.js

# Run tests (watch mode)
npm run tests

# Clear Jest cache
npm run tests-clear-cache
```

---

## 🏗️ Architecture

### Technology Stack

- **Framework:** Express.js 5.x
- **Language:** TypeScript
- **Database:** MongoDB + Mongoose ODM
- **Authentication:** JWT (httpOnly cookies)
- **Validation:** express-validator
- **Payment Processing:** MercadoPago SDK
- **Email:** Resend API
- **Password Hashing:** bcrypt
- **Background Jobs:** node-cron
- **HTTP Logging:** morgan
- **Testing:** Jest + Supertest + mongodb-memory-server

### Request/Response Flow

```txt
Client Request
    ↓
CORS Middleware
    ↓
Body Parser
    ↓
Route Handler
    ↓
Validation Middleware (express-validator)
    ↓
Auth Middleware (JWT verification)
    ↓
Controller (Business Logic)
    ↓
Mongoose Model (Database Query)
    ↓
Response / Custom Error
    ↓
Error Handler Middleware
    ↓
Client Response
```

### Authentication Flow

1. User registers → `authController.createAccount()`
   - Password hashed with bcrypt
   - User created in MongoDB
   - Email confirmation token sent

2. User logs in → `authController.login()`
   - Email & password verified
   - JWT token signed with `JWT_SECRET`
   - Token stored in httpOnly cookie (secure, sameSite)
   - Cookie sent to client

3. Subsequent requests
   - Client includes cookie automatically
   - `auth` middleware extracts & validates JWT
   - `req.user` populated for controllers
   - Protected routes check `req.user` existence

### Payment Flow (MercadoPago)

1. Frontend initializes checkout → `CheckoutPayment` component
2. User completes payment on MercadoPago
3. MercadoPago sends webhook to `/api/payments/webhook`
4. `mercadopago` middleware validates signature
5. `paymentController.handleWebhook()` processes:
   - Creates/updates Payment record
   - Updates Order status: "Esperando Pago" → "Procesando"
   - Commits stock reservation
6. Cron job monitors order expiry (24h default)

### Error Handling

All controllers throw custom error classes:

```typescript
throw new NotFoundError("Order not found");
throw new ConflictError("Email already registered");
throw new ForbiddenError("Insufficient permissions");
throw new RequestValidationError([{ field: "email", message: "Invalid email" }]);
...
```

Error middleware catches and formats responses:

```json
{
    "errors": [
        {
            "message": "Order Not Found"
        }
    ]
}
```

### Database Schema Highlights

**User:**

- Email uniqueness constraint
- Password hashed with bcrypt
- JWT token refresh support

**Product:**

- Stock tracking
- Images stored in Cloudinary
- Pricing in CLP

**Order:**

- Status enum: "Esperando Pago", "Procesando", "En Transito", "Entregado", "Cancelado", "Orden Expirada"
- Stock reservation expires in 24h
- Payment linked via paymentId

---

## 💻 Development Guidelines

### Adding a New Route

1. **Create Controller** in `src/controllers/FeatureController.ts`:

   ```typescript
   export const getFeature = async (req: Request, res: Response) => {
     try {
       const feature = await Feature.findById(req.params.id).exec();
       if (!feature) throw new NotFoundError("Feature not found");
       res.json(feature);
     } catch (error) {
       throw error; // Error middleware handles
     }
   };
   ```

2. **Create Router** in `src/routes/featureRouter.ts`:

   ```typescript
   const router = express.Router();
   
   router.get('/:id', validationMiddleware, featureController.getFeature);
   router.post('/', validateSchema, featureController.createFeature);
   
   export default router;
   ```

3. **Register Router** in `src/server.ts`:

   ```typescript
   app.use('/api/features', featureRouter);
   ```

### Validation Pattern

Use express-validator for schema validation:

```typescript
import { body, validationResult } from 'express-validator';

const validateCreateOrder = [
  body('email').isEmail().normalizeEmail(),
  body('total').isFloat({ gt: 0 }),
];

export const createOrder = [
  ...validateCreateOrder,
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new RequestValidationError(errors.array());
    }
    // Process order...
  }
];
```

### Protected Routes

Require `auth` middleware for endpoints needing authentication. Example:

```typescript
router.post('/orders', currentUser, requireAuth, orderController.createOrder);
router.get('/admin/orders', currentUser, requireAdmin, orderController.getOrdersAdmin);
```

The `currentUser` middleware sets `req.user` if cookie available, if not then pass to the next middleware.
The `requireAuth` middleware should be called after currentUser and checks wether req.user has any info in it, if it does not, then throw a `NotAuthorizedError`.
The `requireAdmin` middleware works the same as requireAuth but checks that the role of the user info set in res.user has a role === "admin" to validate access to the admin resource, if not there then throw 403 `ForbiddenError`.

### Email Sending

Use Resend API in `src/emails/`:

```typescript
export const sendResetPasswordEmail = async (email: string, resetLink: string) => {
  // Send via Resend
};
```

---

## 🔐 Security Considerations

- **JWT Secrets:** Use strong, random values (min 32 chars)
- **Passwords:** Bcrypt with salt rounds ≥ 10
- **Cookies:** httpOnly, secure, sameSite flags enabled
- **CORS:** Restrict to `FRONTEND_URL` environment variable
- **Webhooks:** Validate MercadoPago signature before processing
- **Input Validation:** Always validate & sanitize incoming data
- **Rate Limiting:** Consider implementing for login/register endpoints

---

## 🧪 Testing

Tests use Jest with mongodb-memory-server for isolated database testing:

```bash
npm run tests
```

**Test Setup:**

- `src/tests/setup.ts` initializes in-memory MongoDB
- Each test gets clean database
- No external dependencies needed

---

## 📦 Deployment

### Docker Build

```bash
docker build -t morango-backend .
docker run -p 3001:3001 \
  -e DATABASE_URL=mongodb+srv://user:pass@cluster.mongodb.net/morango \
  -e JWT_SECRET=your_secret \
  -e MP_ACCESS_TOKEN=your_token \
  -e MP_PUBLIC_KEY=your_key \
  -e MP_WEBHOOK_SECRET=your_secret \
  -e RESEND_API_KEY=your_key \
  morango-backend
```

### Environment for Production

- Set `NODE_ENV=production`
- Use MongoDB Atlas URI
- Enable HTTPS/SSL
- Set secure cookie flags
- Implement rate limiting
- Set up logging aggregation

---

## 🔗 External Integrations

1. **MongoDB:** Document database - connection via `Mongoose`
2. **MercadoPago:** Payment processing - SDK integration for webhooks
3. **Resend:** Email delivery service for transactional emails
4. **Cloudinary:** Image hosting (frontend integration, referenced in DB)

---

## 📝 Important Notes

- **Language:** All business logic uses English; UI/email templates in **Spanish**
- **Currency:** Chilean Peso (CLP) - stored and returned as numbers (no special formatting)
- **Timezone:** Ensure consistent UTC timestamps in MongoDB
- **Stock Reservations:** Automatically expire after 24 hours via cron job
- **Order Status:** Immutable transitions - validate status changes in controller

---

**Made with ♥️ Thomas Schrödinger.**
