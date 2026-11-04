# Database Schema

This doc explains how Senate Portal's data is organised: what each table holds, how the tables
connect, and the rules the database enforces. The source of truth is
`attendance-manager/prisma/schema.prisma`. If this doc and the schema ever disagree, the schema
wins, so please update this doc.

## The big picture

```
                 Role
                  ▲
                  │
Semester ◄── Membership ──► User
   ▲                         │
   │                         │ (each of these belongs to one user)
Meeting ◄────────────────────┤
   │                         │
   ├── AttendanceRecord ─────┤   did this user show up?
   ├── ExcuseRequest ────────┤   is this user excused?
   └── Poll                  │
        ├── PollOption       │
        └── Vote ────────────┘   how did this user vote?
             └──► PollOption
```

In one paragraph: the year is split into **semesters**. Each semester, a **user** holds one
**role** through a **membership**. A semester has **meetings**. At each meeting we keep one
**attendance record** per user, users can file an **excuse request**, and the e-board can run
**polls**. Each poll has a fixed list of **options**, and each user casts at most one **vote** per poll.

## Conventions

| Convention | Example |
|---|---|
| Primary keys are named `<table>Id` and are UUID strings | `meetingId`, `pollId`, `voteId` |
| A foreign key has the same name as the key it points to | `Vote.pollId` → `Poll.pollId` |
| `deletedAt` means *soft delete*: the row stays but the app treats it as gone. `null` = live | `Meeting.deletedAt` |
| Times are stored as full timestamps with time zone (UTC in the DB, shown in America/New_York) | `Meeting.startsAt` |
| Fixed sets of values are Postgres enums | `AttendanceStatus`, `VoteType` |

> **Rule of thumb:** queries for live data should filter `deletedAt: null` on any table that has it.

---

## Tables

### `User`
A person who can log in to the portal.

| Column | Type | Notes |
|---|---|---|
| `userId` | uuid, PK | |
| `supabaseAuthId` | string?, unique | links the row to the Supabase Auth account. Login uses this to find the user |
| `firstName` | string | |
| `lastName` | string | |
| `email` | string, unique | |
| `nuid` | string, unique | Northeastern ID |
| `createdAt` | timestamp | defaults to now |

Passwords are **not** stored here. Supabase Auth handles them.

### `Role`
The kinds of role a member can have.

| Column | Type | Notes |
|---|---|---|
| `roleId` | uuid, PK | |
| `roleType` | enum `RoleType` | `EBOARD` or `MEMBER` |

### `Semester`
A block of the academic year. Every meeting and membership belongs to one.

| Column | Type | Notes |
|---|---|---|
| `semesterId` | uuid, PK | |
| `term` | enum `Term` | `FALL` or `SPRING` |
| `year` | int | |
| `startsOn` | date | |
| `endsOn` | date | |

Rules: (`term`, `year`) is unique, `startsOn ≤ endsOn`, and **semesters may not overlap**. That
means any given day falls in at most one semester, which is how the app finds "the current semester".

### `Membership`
"User X held role Y during semester Z." This is how roles work: **a role is per semester, not for life.**

| Column | Type | Notes |
|---|---|---|
| `userId` | FK → User | |
| `semesterId` | FK → Semester | |
| `roleId` | FK → Role | |

- Primary key = (`userId`, `semesterId`): **one role per user per semester**.
- A user's *current role* is the role on their membership for the semester that contains today.
  No membership this semester = no senate access.
- Removing someone from the senate = deleting their current membership. Their user row and
  history (attendance, votes) stay intact. If they come back later, they just get a new membership.

### `Meeting`
A senate meeting.

| Column | Type | Notes |
|---|---|---|
| `meetingId` | uuid, PK | |
| `semesterId` | FK → Semester | |
| `name` | string | shown in meeting lists |
| `notes` | string | |
| `meetingType` | enum `MeetingType` | `FULL_BODY` or `REGULAR` |
| `startsAt` | timestamptz | |
| `endsAt` | timestamptz | |
| `deletedAt` | timestamptz? | soft delete |

### `AttendanceRecord`
Whether one user attended one meeting.

| Column | Type | Notes |
|---|---|---|
| `attendanceRecordId` | uuid, PK | |
| `userId` | FK → User | |
| `meetingId` | FK → Meeting | |
| `status` | enum `AttendanceStatus` | see below |
| `checkedInAt` | timestamptz? | when they checked in, null if they didn't |
| `deletedAt` | timestamptz? | soft delete |

(`userId`, `meetingId`) is unique: **one record per user per meeting**.

`AttendanceStatus` values:

| Value | Meaning |
|---|---|
| `PRESENT` | attended |
| `PENDING` | an excuse request is waiting for a decision |
| `EXCUSED_ABSENCE` | absent, excuse approved |
| `UNEXCUSED_ABSENCE` | absent, no approved excuse |

### `ExcuseRequest`
A user asking to be excused for a meeting, or to attend in a different way.

| Column | Type | Notes |
|---|---|---|
| `excuseRequestId` | uuid, PK | |
| `userId` | FK → User | who is asking |
| `meetingId` | FK → Meeting | for which meeting |
| `reason` | string | |
| `attendanceMode` | enum `AttendanceMode` | `IN_PERSON`, `ONLINE` or `ABSENT`: how they'll attend |
| `timeAdjustment` | enum `TimeAdjustment`? | `ARRIVING_LATE` or `LEAVING_EARLY`, if relevant |
| `isLate` | bool | true if it was submitted after the normal deadline |
| `deletedAt` | timestamptz? | soft delete |

- (`userId`, `meetingId`) is unique: **one excuse request per user per meeting**.
- A request doesn't hold its own approval state. The e-board decides by setting the
  matching `AttendanceRecord.status` (joined on `userId` + `meetingId`): `PENDING` while waiting,
  then `EXCUSED_ABSENCE` or `UNEXCUSED_ABSENCE`.

### `Poll`
A vote held during a meeting.

| Column | Type | Notes |
|---|---|---|
| `pollId` | uuid, PK | |
| `meetingId` | FK → Meeting | |
| `title` | string | e.g. "Approve budget amendment" |
| `voteType` | enum `VoteType` | see below |
| `openedAt` | timestamptz | when voting started |
| `closedAt` | timestamptz? | null = still open |
| `deletedAt` | timestamptz? | soft delete |

A poll is **open** when `closedAt` is null and `deletedAt` is null. Deleting a meeting closes its open polls.

`VoteType` values: `ROLL_CALL`, `SECRET_BALLOT`, `UNANIMOUS_CONSENT`, `PLACARD`.
For `SECRET_BALLOT`, results are shown without saying who voted for what.

### `PollOption`
The choices you can pick on a poll.

| Column | Type | Notes |
|---|---|---|
| `pollOptionId` | uuid, PK | |
| `pollId` | FK → Poll | |
| `label` | string | e.g. `Yes`, `No`, `Abstain`, a candidate's name |
| `position` | int | display order, lowest first |

- (`pollId`, `label`) is unique.
- **Every poll has options.** They're created together with the poll:
  - `SECRET_BALLOT`: the options the creator enters, plus `No Confidence` and `Abstain`, which are always added.
  - every other vote type: `Yes`, `No`, `Abstain`.

### `Vote`
One user's choice on one poll.

| Column | Type | Notes |
|---|---|---|
| `voteId` | uuid, PK | |
| `pollId` | FK → Poll | |
| `userId` | FK → User | |
| `pollOptionId` | FK → PollOption | the option chosen. It must belong to the same poll |
| `castAt` | timestamptz | defaults to now |
| `deletedAt` | timestamptz? | soft delete |

(`pollId`, `userId`) is unique: **one vote per user per poll**. Results are counted by
grouping live votes on `pollOptionId`.

---

## Enums at a glance

| Enum | Values |
|---|---|
| `RoleType` | `EBOARD`, `MEMBER` |
| `Term` | `FALL`, `SPRING` |
| `MeetingType` | `FULL_BODY`, `REGULAR` |
| `AttendanceStatus` | `PRESENT`, `PENDING`, `EXCUSED_ABSENCE`, `UNEXCUSED_ABSENCE` |
| `AttendanceMode` | `IN_PERSON`, `ONLINE`, `ABSENT` |
| `TimeAdjustment` | `ARRIVING_LATE`, `LEAVING_EARLY` |
| `VoteType` | `ROLL_CALL`, `SECRET_BALLOT`, `UNANIMOUS_CONSENT`, `PLACARD` |

## Common questions

**What is this user's role right now?**
Find the `Semester` where `startsOn ≤ today ≤ endsOn`. Then read their `Membership` for that semester → `Role.roleType`.

**Who is in the senate this semester?**
All users with a `Membership` in the current semester.

**What was this user's attendance this semester?**
`AttendanceRecord` rows for the user, joined to `Meeting` where `meetingId` is in the current semester and `deletedAt` is null.

**Is this absence excused?**
Look at `AttendanceRecord.status`. The `ExcuseRequest` (same `userId` + `meetingId`) explains why.

**What are the results of a poll?**
Count `Vote` rows with that `pollId` and `deletedAt` null, grouped by `pollOptionId`. Then join `PollOption` to get the labels.

## Changing the schema

1. Edit `attendance-manager/prisma/schema.prisma`.
2. Add a migration in `attendance-manager/prisma/migrations/<timestamp>_<ticket>_<name>/migration.sql`.
   When existing data has to be kept (renames, backfills), write the SQL by hand.
3. Migrations run automatically through the `Migrations` GitHub Actions workflow: pushes to `dev` → Preview DB,
   pushes to `main` → Production DB.
4. Update this doc.
