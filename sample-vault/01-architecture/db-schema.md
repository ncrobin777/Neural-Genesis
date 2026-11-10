---
status: draft
type: architecture
module: storage
---

# Database Schema & Data Contracts

## Orders Table Contract
The active schema contract for high-speed cart checkout and order persistence:

```sql
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  total_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT CHECK(status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
^orders-table

## Users Table Contract
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'developer'
);
```
^users-table
