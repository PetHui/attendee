# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run start    # Run production server
npm run lint     # ESLint
```

No test framework is configured.

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase project credentials
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (used server-side for public registration)
- `RESEND_API_KEY` — Transactional email service
- `NEXT_PUBLIC_APP_URL` — App base URL (e.g. `http://localhost:3000`)

## Architecture

This is a multi-tenant event management and attendee registration SaaS built with Next.js (App Router), Supabase (PostgreSQL + Auth + Realtime), and Resend for email.

### Tenancy Model
Organizations are the top-level tenant. Users belong to an organization with a role (`owner | admin | staff`). Events, participants, and fields are scoped to an organization. Supabase RLS enforces all isolation — users can only access their organization's data.

### Route Structure
- `/login` — Public, Supabase Auth
- `/[orgSlug]/[eventId]` — Public registration page (no auth required)
- `/dashboard/**` — Protected, event management for staff
- `/checkin/[id]` — Protected, QR scanner interface
- `/api/**` — API routes (mix of public and auth-required)

Middleware at `middleware.ts` protects `/dashboard` and `/checkin` routes by checking the Supabase session.

### Supabase Client Usage
There are two client factories in `lib/supabase/`:
- `client.ts` — browser client (for client components)
- `server.ts` — exports `createClient()` (uses cookies, for Server Components/API routes) and `createServiceClient()` (service role, bypasses RLS — used only in the public registration API route)

### Registration Flow
1. Staff creates an event with custom registration fields (text, select, checkbox) via `field-builder.tsx`
2. Fields are stored in `registration_fields` with `sort_order` for drag-and-drop reordering (@dnd-kit)
3. Attendees register at `/{orgSlug}/{eventId}` — `POST /api/register` writes a `participants` row and `participant_field_values` rows, then sends a confirmation email with an embedded QR code (generated via the `qrcode` package)
4. Email delivery uses `lib/email.ts` with Resend; it auto-detects name/email fields by matching field labels

### Check-in Flow
- Staff navigate to `/checkin/[id]` and scan QR codes with `html5-qrcode`
- `POST /api/checkin` looks up the participant by QR code UUID and sets `checked_in_at`
- The UI subscribes to Supabase Realtime on the `participants` table for live counter updates

### Database Schema (key tables)
```
organizations         → id, name, slug
users                 → id, organization_id, role, email, name  (extends auth.users)
events                → id, organization_id, title, status (draft|published|closed|archived), ...
registration_fields   → id, event_id, label, field_type (text|select|checkbox), required, options (JSON), sort_order
participants          → id, event_id, qr_code (UUID), checked_in_at, checked_in_by
participant_field_values → id, participant_id, field_id, value
```

Migration lives in `supabase/migrations/001_initial.sql`.

### Language
All UI text and user-facing strings are in Swedish.
