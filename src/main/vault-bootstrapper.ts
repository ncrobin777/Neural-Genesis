import fs from 'fs'
import path from 'path'

export function bootstrapDefaultVault(vaultPath: string): void {
  const dirs = [
    '.genesis',
    '00-constitution',
    '01-architecture',
    '02-specs',
    '03-scratchpad'
  ]

  for (const d of dirs) {
    const full = path.join(vaultPath, d)
    if (!fs.existsSync(full)) {
      fs.mkdirSync(full, { recursive: true })
    }
  }

  // 1. 00-constitution/instructions.md
  const instructionsPath = path.join(vaultPath, '00-constitution', 'instructions.md')
  if (!fs.existsSync(instructionsPath)) {
    fs.writeFileSync(
      instructionsPath,
      `---
locked: true
scope: global
version: 1.0.0
---

# Global Engineering Constitution

## 1. Clean Code & Zero-Bloat Mandate
- Implement strict TypeScript with zero \`any\` types.
- Favor pure functions, deterministic logic, and clear single-responsibility architecture.
- Preserve all existing comments and documentation.

## 2. Testing & Verification Standard
- Every feature or bugfix must be verified through automated command checks (\`[cmd: ...]\`).
- No pull request or completion tick is valid until the verification exit code is 0.

## 3. UI/UX Excellence
- UIs must adhere to the high-craft design tokens: Carbon & Emerald palette, 1px crisp borders, and zero layout shift.
`,
      'utf-8'
    )
  }

  // 2. 01-architecture/db-schema.md
  const dbSchemaPath = path.join(vaultPath, '01-architecture', 'db-schema.md')
  if (!fs.existsSync(dbSchemaPath)) {
    fs.writeFileSync(
      dbSchemaPath,
      `---
type: architecture
module: storage
---

# Database Schema & Data Contracts

## Orders Table Contract
The active schema contract for high-speed cart checkout and order persistence:

\`\`\`sql
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  total_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT CHECK(status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
\`\`\`
^orders-table

## Users Table Contract
\`\`\`sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'developer'
);
\`\`\`
^users-table
`,
      'utf-8'
    )
  }

  // 3. 01-architecture/api-contracts.md
  const apiContractsPath = path.join(vaultPath, '01-architecture', 'api-contracts.md')
  if (!fs.existsSync(apiContractsPath)) {
    fs.writeFileSync(
      apiContractsPath,
      `---
type: architecture
module: api
---

# API Contracts & Webhook Signatures

## Stripe Webhook Handler
\`\`\`typescript
export interface StripeCheckoutPayload {
  sessionId: string;
  amountSubtotal: number;
  paymentStatus: 'paid' | 'unpaid';
  customerDetails: { email: string };
}
\`\`\`
^stripe-webhook

## Auth JWT Contract
\`\`\`typescript
export interface AuthJwtClaims {
  sub: string;
  role: 'admin' | 'user';
  exp: number;
}
\`\`\`
^auth-jwt
`,
      'utf-8'
    )
  }

  // 4. 02-specs/checkout-screen.md
  const checkoutSpecPath = path.join(vaultPath, '02-specs', 'checkout-screen.md')
  if (!fs.existsSync(checkoutSpecPath)) {
    fs.writeFileSync(
      checkoutSpecPath,
      `---
status: ready
target: src/pages/Checkout.tsx
mounted: true
---

<!-- mcp:ignore -->
## Rough Notes & Brainstorming
- Consider adding Apple Pay or 1-click checkout in v2.
- Let's make sure the loading spinner looks silky smooth.
<!-- /mcp:ignore -->

# Feature Spec: Checkout Screen & Payment Pipeline

## Screen Requirements
Render the active customer order summary using the database order table schema:
![[01-architecture/db-schema#^orders-table]]

Integrate payment event processing using the official contract:
![[01-architecture/api-contracts#^stripe-webhook]]

## Acceptance Criteria
- [x] [cmd: node -v] Verify Node.js runtime environment is active
- [ ] [cmd: npm --version] Verify package manager is accessible
- [ ] [cmd: git status] Verify working repository is clean
- [ ] Implement secure order summary card component
`,
      'utf-8'
    )
  }

  // 5. 02-specs/user-profile.md
  const userProfilePath = path.join(vaultPath, '02-specs', 'user-profile.md')
  if (!fs.existsSync(userProfilePath)) {
    fs.writeFileSync(
      userProfilePath,
      `---
status: draft
mounted: false
---

# Feature Spec: User Profile & Settings

## Requirements
Manage user avatars and notification preferences. References [[01-architecture/api-contracts#^auth-jwt]].

## Acceptance Criteria
- [ ] User profile updates reflect across session
`,
      'utf-8'
    )
  }

  // 6. 03-scratchpad/brainstorm-ideas.md
  const brainstormPath = path.join(vaultPath, '03-scratchpad', 'brainstorm-ideas.md')
  if (!fs.existsSync(brainstormPath)) {
    fs.writeFileSync(
      brainstormPath,
      `# Scratchpad: Architecture Brainstorming

This file is excluded from MCP payloads.

- Idea 1: Local vector search with SQLite-vec.
- Idea 2: Interactive JSON Canvas view.
`,
      'utf-8'
    )
  }
}
