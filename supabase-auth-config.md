# Supabase Authentication Setup

## 1. Enable Email Authentication

In your Supabase Dashboard:

1. Go to **Authentication > Settings**
2. Under **Auth Providers**, make sure **Email** is enabled
3. **Disable** "Confirm email" if you want to allow immediate sign-ups without email confirmation ⭐ **RECOMMENDED FOR DEVELOPMENT**
4. **Enable** "Confirm email" if you want users to confirm their email (recommended for production)

## 2. Configure Email Settings (Optional)

If you want custom email templates:
1. Go to **Authentication > Settings > Email Templates**
2. Customize the "Confirm signup" template

## 3. Enable Google OAuth (Optional)

If you want Google sign-in to work:
1. Go to **Authentication > Settings > Auth Providers**
2. Enable **Google**
3. You'll need to set up Google OAuth credentials in Google Cloud Console

## 4. Test Authentication

The app now supports:
- ✅ **Email/password sign up**
- ✅ **Email/password sign in**
- ✅ **Google OAuth** (if configured)
- ✅ **Email confirmation** (if enabled)

## 5. Row Level Security

The database already has RLS policies that will work with authenticated users. Once someone signs up/signs in, their data will be properly scoped to their user ID.

## Current Setup

- **Default**: Email confirmation is probably enabled
- **Behavior**: Users will need to check their email after sign up
- **Fallback**: App works fine without authentication (localStorage only)

## Ready to Test!

Your authentication is now fully implemented! Users can:
1. Create accounts with email/password
2. Sign in with existing accounts
3. Use Google OAuth (if you configure it)
4. All data automatically syncs to Supabase when authenticated
5. Data remains in localStorage when not authenticated