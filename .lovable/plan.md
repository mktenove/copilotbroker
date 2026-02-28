

## Audit: Frontend reflection of all implementations

### 1. Subscription Status Lifecycle — **OK**

- **SubscriptionGuard.tsx**: Handles `suspended` (blocking UI with Customer Portal button), `canceled` (redirect to `/planos`), and no-tenant (redirect to `/planos`). Super admins bypass.
- **TenantContext.tsx**: Fetches `status` from `tenants` table and exposes it.
- **stripe-webhook**: Handles `invoice.paid` → active, `invoice.payment_failed` → past_due (3-day grace), `customer.subscription.deleted` → canceled.
- **suspend-past-due**: Cron-triggered function to auto-suspend after grace period.
- **No issues found.**

### 2. Seat Management — **OK**

- **TenantDetailSheet.tsx**: "Limites e Assentos" section with:
  - "Sincronizar com Stripe" button → calls `manage-seats` edge function with `sync_from_stripe`
  - "Atualizar quantity no Stripe" button → calls `manage-seats` with `update_stripe_quantity` (with confirmation dialog)
  - Manual cortesia update (with warning it doesn't touch Stripe)
  - User limit warning when `activeMembers >= maxUsers`
- **manage-seats edge function**: Fully implemented with both actions + audit logging.
- **check_user_limit trigger**: Enforces `USER_LIMIT_EXCEEDED` at DB level.
- **No issues found.**

### 3. Super Admin Route Protection — **OK**

- Routes wrapped in `<ProtectedRoute>` in App.tsx.
- `SuperAdminLayout` checks `role === "admin"` via `useUserRole()`, redirects to `/auth` if unauthorized.
- **No issues found.**

### 4. Billing Events Debug Page — **OK**

- Route registered at `/super-admin/billing-events`.
- Filters (processed status, type), search, reprocess button, payload viewer all present.
- **No issues found.**

### 5. Minor Gap: No sidebar link to Billing Events

The `SuperAdminLayout` NAV_ITEMS only has "Billing / Webhooks" pointing to `/super-admin/billing`. There is **no sidebar navigation item** for the new `/super-admin/billing-events` route. Users must know the URL manually.

**Fix**: Either add a nav item for Billing Events in the sidebar, or add a link/button from the existing Billing page to navigate to Billing Events.

### 6. Minor Gap: `past_due` status not handled in SubscriptionGuard

The `SubscriptionGuard` handles `suspended` and `canceled`, but does **not** show any warning for `past_due` tenants. Users in `past_due` (grace period) can use the app normally with no indication that payment failed. Consider adding a warning banner.

---

### Summary

All core implementations are correctly reflected in the frontend. Two minor gaps:

1. **Add sidebar link or in-page button** to navigate to Billing Events from the Billing page
2. **Add a warning banner** for `past_due` status in SubscriptionGuard (optional — currently they have 3 days before suspension)

### Implementation Steps

1. Add a link from SuperAdminBilling page to `/super-admin/billing-events` (or add nav item)
2. Add an optional `past_due` warning banner in SubscriptionGuard that shows "Pagamento pendente" message but still allows access

