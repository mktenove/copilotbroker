

## Fix: Leads not loading due to ambiguous broker relationship

### Problem
After adding the `corretor_atribuido_id` column to the `leads` table (for the roleta feature), there are now **two** foreign keys from `leads` to `brokers`:
- `leads.broker_id -> brokers.id`
- `leads.corretor_atribuido_id -> brokers.id`

PostgREST returns a **300 error** because it can't determine which relationship to use when the query says `broker:brokers(...)`.

### Solution
Disambiguate the relationship by specifying the foreign key name explicitly in all affected queries.

### Files to change

**1. `src/hooks/use-kanban-leads.ts` (line 23)**
Change:
```
broker:brokers(id, name, slug)
```
To:
```
broker:brokers!leads_broker_id_fkey(id, name, slug)
```

**2. `src/pages/Admin.tsx` (line 119)**
Change:
```
broker:brokers(name, slug)
```
To:
```
broker:brokers!leads_broker_id_fkey(name, slug)
```

These are the only two files querying leads with a broker join. The other files (`GVFormSection`, `AdminWhatsApp`, `use-whatsapp-campaigns`) query different tables where the relationship is unambiguous.
