# Dominauts™ Admin Dashboard Setup Guide

## Overview

The Dominauts Admin Dashboard provides comprehensive analytics, user management, and monetization tools for game administrators.

## Features

### 📊 Analytics Dashboard
- **Real-time Metrics**: Online users, active games, pending purchases
- **Revenue Analytics**: Daily revenue, ARPU, conversion rates
- **User Metrics**: DAU, MAU, retention rates
- **Engagement Analytics**: Session duration, game completion rates
- **Visual Charts**: Revenue trends, activity heatmaps, user funnels

### 👥 User Management
- Search and filter users
- View detailed user profiles
- Ban/suspend users with reasons
- Send email notifications
- View user transaction history

### 💳 Transaction Management
- View all transactions
- Process refunds through Stripe
- Transaction filtering and search
- Export transaction data

### 📧 Email Integration (Resend)
- Automated email notifications
- Refund confirmations
- User communication
- Ban/suspension notifications

## Setup Instructions

### 1. Environment Variables

Add the following to your `.env.local` or Vercel environment variables:

```env
# Resend Email Service
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=support@dominauts.com
RESEND_ADMIN_EMAIL=admin@dominauts.com

# Admin Configuration
ADMIN_URL=https://admin.dominauts.com
ADMIN_SECRET_KEY=your_admin_secret_key_minimum_32_chars

# Stripe (for refunds)
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
```

### 2. Database Setup

Run the admin migrations in Supabase:

```bash
# Run migrations
supabase migration up
```

### 3. Create Admin User

In Supabase SQL Editor:

```sql
-- Make a user an admin
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-admin@email.com';
```

### 4. Resend Setup

1. Sign up at [Resend](https://resend.com)
2. Verify your domain
3. Get your API key
4. Add the API key to environment variables

### 5. Deploy Admin API

The admin API endpoints are already configured in `/api/admin/`:
- `/api/admin/dashboard` - Main dashboard data
- `/api/admin/refund` - Process refunds
- `/api/admin/users` - User management

## Accessing the Admin Dashboard

1. **Login**: Use your admin credentials
2. **Navigate**: Go to `/admin` or click Admin in the menu
3. **Authentication**: Admin role is verified server-side

## Admin Actions

### Processing Refunds

```javascript
// Admin dashboard refund flow
1. Navigate to Transactions tab
2. Find the transaction
3. Click "Refund" button
4. Enter refund reason
5. Confirm refund
```

### Banning Users

```javascript
// User ban flow
1. Navigate to Users tab
2. Search for user
3. Click "Ban" button
4. Enter ban reason and duration
5. User receives email notification
```

### Sending Emails

```javascript
// Email communication
1. Navigate to Users tab
2. Select user
3. Click "Email" button
4. Compose message
5. Send via Resend
```

## Security

### Authentication
- JWT-based authentication
- Admin role verification
- Server-side validation

### Rate Limiting
- 100 requests per minute per IP
- Configurable limits

### Audit Trail
- All admin actions logged
- IP address tracking
- Timestamp recording

## API Endpoints

### GET /api/admin/dashboard
```javascript
// Headers
Authorization: Bearer <token>

// Query params
?from=2024-01-01&to=2024-12-31

// Response
{
  revenue: {...},
  users: {...},
  games: {...},
  engagement: {...}
}
```

### POST /api/admin/dashboard
```javascript
// Refund request
{
  action: "refund",
  transactionId: "txn_123",
  reason: "Customer request"
}

// Ban user
{
  action: "ban",
  userId: "user_123",
  banReason: "Terms violation",
  duration: 7 // days
}

// Send email
{
  action: "email",
  userId: "user_123",
  subject: "Account Update",
  message: "Your account has been updated..."
}
```

## Monitoring

### Key Metrics to Track
- **Revenue**: Daily, weekly, monthly
- **User Growth**: New users, retention
- **Engagement**: Session duration, games played
- **Monetization**: Conversion rate, ARPU

### Alerts to Configure
- Revenue drops > 20%
- Server errors > 1%
- Refund rate > 5%
- User complaints

## Troubleshooting

### Common Issues

1. **Admin access not working**
   - Check user role in database
   - Verify JWT token
   - Check RLS policies

2. **Emails not sending**
   - Verify Resend API key
   - Check domain verification
   - Review email logs

3. **Refunds failing**
   - Check Stripe API key
   - Verify payment intent ID
   - Review Stripe logs

4. **Charts not loading**
   - Check data queries
   - Verify date ranges
   - Review console errors

## Support

For admin dashboard issues:
- Check logs in Supabase
- Review Vercel function logs
- Contact support@dominauts.com

## Updates

The admin dashboard is continuously improved with:
- New analytics metrics
- Enhanced user management
- Better visualization
- Performance optimizations