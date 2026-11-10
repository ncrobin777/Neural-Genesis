---
status: draft
type: architecture
module: api
---

# API Contracts & Webhook Signatures

## Stripe Webhook Handler
```typescript
export interface StripeCheckoutPayload {
  sessionId: string;
  amountSubtotal: number;
  paymentStatus: 'paid' | 'unpaid';
  customerDetails: { email: string };
}
```
^stripe-webhook

## Auth JWT Contract
```typescript
export interface AuthJwtClaims {
  sub: string;
  role: 'admin' | 'user';
  exp: number;
}
```
^auth-jwt
