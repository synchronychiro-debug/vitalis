# Vitalis API Reference (v1)

Base path: `/api/v1`. All responses use the envelope
`{ success: boolean, data?, error?, meta? }`. List endpoints include
`meta: { total, page, limit, totalPages }`.

Authentication is via JWT bearer tokens. Access tokens last 15 minutes;
refresh tokens last 7 days and rotate on each use. Every endpoint is scoped to
the caller's `clinicId` (multi-tenancy) and enforces role-based access.

Interactive OpenAPI docs are served at `/docs` when the API is running.

## Roles

`SUPER_ADMIN`, `ADMIN`, `PROVIDER`, `STAFF`, `CLIENT`. Enum values are uppercase
everywhere (database, API, and shared types).

## Auth — `/auth`

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/login` | public | Body: `clinicId`, `email`, `password` → tokens |
| POST | `/refresh` | public | Rotates the refresh token |
| POST | `/logout` | any | Revokes all refresh tokens for the user |
| GET | `/me` | any | Current user profile |
| POST | `/forgot-password` | public | Always 200; returns `resetToken` outside production |
| POST | `/reset-password` | public | Body: `token`, `newPassword` |

## Users — `/users` (admin)

List/get/create/update users and reset passwords. Only `SUPER_ADMIN` may
create or grant `SUPER_ADMIN`. `POST /users/:id/reset-password` sets a new
password directly.

## Clinics — `/clinics`

`GET /current` (any) and `PATCH /current` (admin) for clinic settings.

## Clients — `/clients` (staff+)

CRUD with `?search=` across name/email. Clients roll up billing and credits.

## Patients — `/patients`

CRUD for staff; read access for `CLIENT` users is scoped to their own animals.
Filters: `species`, `status`, `clientId`, `search`.

## Appointments — `/appointments`

CRUD for staff. On create, `clientId` is derived from the patient so an
appointment can't be tied to the wrong owner. Marking an appointment
`COMPLETED` increments the patient's visit counter once. Providers see the full
clinic schedule and can narrow with `?providerId=`. Filters: `providerId`,
`patientId`, `status`, `from`, `to`.

## Services — `/services`

`GET` for any authenticated user (active only, or `?includeInactive=true`);
create/update is admin-only. Prices are stored in integer cents.

## Packages — `/packages`

List/get for any authenticated user; create/update admin-only. `POST
/packages/:id/purchase` (staff) sells a package to a client, creating a
`ClientPackage` with a computed expiry. Packages and credits attach to the
client account and are shared across all of that client's pets.
