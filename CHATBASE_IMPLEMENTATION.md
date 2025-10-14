# Chatbase AI Bot Implementation

## Overview

This document describes the Chatbase AI bot integration for Sunville Bakery website.

## Architecture

1. **Widget Embed**: Chatbase widget loads automatically on all pages via script in `app/layout.tsx`
2. **Server-Side Hash Generation**: API endpoint at `/api/chatbase/identify` generates secure HMAC-SHA256 hashes
3. **Client Utility**: `lib/chatbase.ts` provides functions to identify users from the client side
4. **Identity Verification**: Uses HMAC-SHA256 to securely verify user identities

## Configuration

### Environment Variables

Add to `.env.local` (DO NOT commit this file):

```
CHATBASE_SECRET_KEY=your-secret-key-here
```

Get your secret key from:
1. Go to [Chatbase Dashboard](https://www.chatbase.co/dashboard)
2. Select your AI Agent
3. Navigate to **Deploy** → **Chat widget** → **Embed** tab
4. Copy the verification secret key

## Usage

### Basic Usage (No Authentication)

The widget loads automatically on all pages. Users can interact with it without authentication.

### Authenticated Usage (Future Enhancement)

When you implement user authentication, use the identity verification:

```typescript
import { identifyUserToChatbase } from '@/lib/chatbase'

// After user logs in
await identifyUserToChatbase('user-123', {
  name: 'John Doe',
  email: 'john@example.com',
  // Add any relevant metadata (max 1000 chars total)
})
```

### Clear Identity (On Logout)

```typescript
import { clearChatbaseIdentity } from '@/lib/chatbase'

// When user logs out
clearChatbaseIdentity()
```

## Security

- Secret key is stored server-side only (never exposed to client)
- Hashes are generated on the server using HMAC-SHA256
- User identity verification ensures secure authenticated sessions

## Testing

1. Visit any page on the website
2. The Chatbase widget should appear in the bottom-right corner
3. Click to open and test the chat functionality

## Support

- Chatbase Documentation: https://docs.chatbase.co
- Identity Verification Guide: https://docs.chatbase.co/developer-guides/identity-verification
