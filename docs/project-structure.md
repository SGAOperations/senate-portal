# Project Structure

This doc explains where code lives in the repo and where new code should go.
If you're adding a file and aren't sure where it belongs, check
[Where does my code go?](#where-does-my-code-go) first.

## Repo layout

```
senate-portal/
├── .github/workflows/     # CI (lint + all tests on every push/PR), DB migrations
├── docs/                  # Project docs (you are here)
└── attendance-manager/    # The Next.js app — everything else lives in here
    ├── prisma/            # schema.prisma + migrations/
    ├── public/            # Static files, including the generated openapi.json
    ├── src/               # All application code (see below)
    ├── eslint.config.ts
    ├── jest.config.js
    ├── tailwind.config.js
    └── package.json
```

Run all `npm` commands from inside `attendance-manager/`.

## `src/` at a glance

The main idea: **server code and browser code live in separate folders.**

```
src/
├── app/            Next.js routes (pages + API endpoints). Kept thin.
├── server/         Server-only code: business logic, database, auth.
├── features/       Browser UI, grouped by feature (voting, meetings, ...).
├── components/     UI shared by every page (header, sidebar, layout).
├── providers/      React context providers (auth, current semester).
├── lib/            Code used by BOTH server and browser (dates, constants, permissions).
├── types/          Shared TypeScript types and Zod schemas.
├── test/           Test helpers.
├── generated/      Prisma client — generated, gitignored, never edit.
├── proxy.ts        Next.js proxy: SGAuth sign-in redirect, refuses cross-origin API writes.
└── __tests__/      Tests for proxy.ts.
```

## Folder by folder

### `app/`: routing only

Next.js maps folders in `app/` to URLs:

- `app/meetings/page.tsx` → the `/meetings` page
- `app/api/meeting/[id]/route.ts` → the `/api/meeting/:id` endpoint

Files here should be **thin**. A page renders one component from `features/`:

```tsx
// app/meetings/page.tsx
import MeetingsPage from '@/features/meetings/components/MeetingsPage';

export default function Meetings() {
  return <MeetingsPage />;
}
```

An API route checks auth and calls a controller:

```ts
// app/api/meeting/route.ts
export async function POST(request: Request) {
  // 401 when signed out, 403 without the capability (src/lib/permissions.ts)
  const { error } = await requireCapability('manageAttendance');
  if (error) return error;
  return MeetingController.createMeeting(request);
}
```

`app/layout.tsx` wraps every page in the providers from `providers/`.
`app/api-docs/` serves the Swagger/Scalar API docs at `/api-docs`.

### `server/`: server-only code

```
server/
├── modules/                 One folder per domain
│   ├── attendance/
│   │   ├── attendance.controller.ts
│   │   ├── attendance.service.ts
│   │   └── __tests__/
│   ├── meeting/  request/  semester/  users/  voting/  voting-record/
├── auth/api-auth.ts         requireAuth(), requireCapability(), getAuthenticatedUser()
├── auth/sgauth.ts           SGAuth session → Actor (positions, capabilities, profile)
├── db/prisma.ts             The shared Prisma client
└── http/api-errors.ts       UserFacingError + toErrorResponse()
```

Each module has two layers:

| Layer | Job | Knows about HTTP? | Talks to the DB? |
|---|---|---|---|
| `*.controller.ts` | Parse and validate the request (Zod), call the service, return a `NextResponse` with the right status code | Yes | No |
| `*.service.ts` | Business rules and Prisma queries. Returns plain data. | No | Yes |

Services can call other services (for example, `MeetingService` uses
`SemesterService`). Controllers shouldn't call Prisma directly.

**Errors:** throw `UserFacingError('message', status)` for errors whose
message is safe to show users. Turn any error into a response with
`toErrorResponse(error, 'fallback message')`. Any other error is logged
and replaced with the fallback, so Prisma output and stack traces never
reach the browser.

**The `server-only` guard:** `db/prisma.ts` starts with
`import 'server-only'`. Every service imports Prisma, so if a
browser component imports anything from `server/` (directly or
indirectly), **the build fails**. That's on purpose: it stops database
code and secrets from ending up in the browser bundle.

### `features/`: browser UI, grouped by feature

```
features/
├── attendance/
│   ├── components/          AttendancePage.tsx, AttendanceHistory.tsx, ...
│   └── attendance-utils.ts  fetch() helpers for this feature
├── dashboard/components/
├── meetings/
│   ├── components/          MeetingsPage.tsx, CreateMeetingModal.tsx, ...
│   ├── meetings-utils.ts
│   └── __tests__/
├── profile/components/      LoginPage.tsx, ProfilePage.tsx
└── voting/
    ├── components/          VotingPage.tsx, ActiveVoteCard.tsx, ...
    ├── hooks/               useActiveVotingEvent(s).ts
    ├── voting-utils.ts
    └── voting-display-utils.ts
```

Everything a feature needs lives in its folder: components, hooks,
helpers and tests. To work on voting, you should rarely have to leave
`features/voting/`.

Feature code talks to the backend **only through `fetch('/api/...')`**,
never by importing from `server/`.

If a component is used by **two or more features**, move it to
`components/`.

### `components/`: shared UI

Only UI that every page uses. Right now that's `components/layout/`
(`Layout`, `Header`, `Sidebar`).

### `providers/`: app-wide React state

`AuthContext.tsx` (the logged-in user) and `SemesterContext.tsx` (the
current semester). Read them with their hooks, such as `useAuth()` and
`useCurrentSemester()`.

### `lib/`: shared by server and browser

```
lib/
├── datetime/            Meeting date/time parsing + formatting, late-request rules
├── constants.ts         VoteType, yesNoOptions, ...
└── permissions.ts       SGAuth position → capability map (UI hides controls; the server re-checks)
```

Code here gets bundled into **both** the server and the browser, so it
must not import from `server/`, use Prisma, or read secrets.

### `types/`: shared types

```
types/
├── index.ts         Re-exports everything. Always import from '@/types'.
├── attendance.ts  meeting.ts  request.ts  semester.ts  user.ts  voting.ts
└── schemas.ts       All Zod schemas
```

- The `*.ts` domain files hold the TypeScript interfaces for API data, such as `MeetingApiData`.
- `schemas.ts` holds the Zod schemas, which do two jobs:
  - Controllers use them to validate requests.
  - `next-openapi-gen` reads them to build the API docs, through route JSDoc tags like `@body PostAttendanceParams`.

  The schemas reference each other in a loop (user ↔ attendance ↔
  request), so keep them all in this one file.

### `test/`

`helpers.ts` has shared test helpers (such as `semesterIdFor`).
`server-only-stub.ts` lets Jest load server code, because the real
`server-only` package throws outside Next.js.

## How a request flows

Here's what happens when the Speaker creates a meeting:

```
features/meetings/components/CreateMeetingModal.tsx
   │  fetch('/api/meeting', { method: 'POST', body })
   ▼
app/api/meeting/route.ts                       ← requireCapability('manageAttendance')
   ▼
server/modules/meeting/meeting.controller.ts   ← validate body with CreateMeetingSchema
   ▼
server/modules/meeting/meeting.service.ts      ← business rules, prisma.meeting.create(...)
   ▼
server/db/prisma.ts → PostgreSQL
```

## Where does my code go?

| I'm adding... | Put it in |
|---|---|
| A new page | `app/<url>/page.tsx` that renders a component from `features/<feature>/components/` |
| A new API endpoint | `app/api/<path>/route.ts` → a controller method → a service method |
| Database logic | `server/modules/<domain>/<domain>.service.ts` |
| A whole new backend domain | `server/modules/<domain>/` with a controller, service and `__tests__/` |
| A component for one feature | `features/<feature>/components/` |
| A hook for one feature | `features/<feature>/hooks/` |
| A component used by many features | `components/` |
| A helper used by server **and** browser | `lib/` |
| A helper only the server uses | `server/` (in the module that needs it) |
| A type for API data | the matching file in `types/` |
| A Zod schema | `types/schemas.ts` |
| A DB schema change | `prisma/schema.prisma` + `npx prisma migrate dev --name <name>` |

## Conventions

- **Imports:** always use the `@/` alias (`@/server/db/prisma`), not
  `../../` paths. Imports between files in the same folder can use `./`.
- **File names:**
  - React components use `PascalCase.tsx` (`CreateMeetingModal.tsx`).
  - Hooks use `useThing.ts`.
  - Everything else uses `kebab-case.ts` (`meeting-date-time.ts`).
  - Backend files use `<domain>.controller.ts` / `<domain>.service.ts`.
- **Tests:** put them in a `__tests__/` folder next to the code they
  test, named `*.test.ts`. CI runs all of them automatically; there's no
  list to update. Tests in `server/` need a database (`.env.test` locally,
  Postgres in CI).
- **New top-level UI folders:** if you add a folder under `src/` that
  contains Tailwind classes, add it to `content` in `tailwind.config.js`.
  Otherwise its styles get dropped from the production build.
- **Don't edit** `src/generated/` (run `npx prisma generate` instead).
  The same goes for `public/openapi.json` (run `npx next-openapi-gen generate`).
