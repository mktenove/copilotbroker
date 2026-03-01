

## Problem

The `/super-admin` route is wrapped in `ProtectedRoute`, which redirects unauthenticated users to `/auth`. This means a super admin must first log in at `/auth`, then navigate to `/super-admin` — and if they log in at `/auth`, it may interfere with the admin/broker session.

The old `SuperAdmin.tsx` page already had self-contained auth (showing `SuperAdminLogin` inline), but the newer `SuperAdminLayout` does not — it just does `Navigate to="/auth"`.

## Plan

### 1. Remove `ProtectedRoute` from `/super-admin` route in `App.tsx`

Change the super-admin route from:
```tsx
<Route path="/super-admin" element={<ProtectedRoute><SuperAdminLayout /></ProtectedRoute>}>
```
to:
```tsx
<Route path="/super-admin" element={<SuperAdminLayout />}>
```

### 2. Update `SuperAdminLayout` to handle auth internally

Instead of redirecting to `/auth` when unauthenticated or non-admin, the layout will:

- Check if there's an active session
- If no session → show `SuperAdminLogin` component inline (with `onAuthenticated` callback to re-check)
- If session exists but role is not `admin` → show `SuperAdminLogin` with an access denied message
- If session and role is `admin` → render the layout normally

This mirrors the pattern already used in the old `SuperAdmin.tsx` page, making the super admin login completely independent from `/auth`.

### Files to modify
- `src/App.tsx` — remove `ProtectedRoute` wrapper from super-admin route
- `src/components/super-admin/SuperAdminLayout.tsx` — add self-contained auth check with `SuperAdminLogin` fallback

