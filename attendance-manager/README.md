This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/create-next-app).

## Getting Started

First, install dependencies:

```bash
npm install
```

Next, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/route.ts`. The page auto-updates as you edit the file.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## API Routes

This directory contains example API routes for the headless API app.

For more details, see [route.js file convention](https://nextjs.org/docs/app/api-reference/file-conventions/route).

## Getting Up To Date DB Schema

The second you pull from main, in order to be up to date with any database changes (while on NUWave campus wifi), make sure you run:

```sh
npx prisma db pull

```

Followed by:

```sh
npx prisma generate
```

## Running the Database Locally

First, ensure that Docker is running. Easiest way to do this is with the Docker Desktop App

Next, run the commands:

1.

```sh
npx prisma generate
```

2.

```sh
npx supabase start
```

Next, update your .env file with

```sh
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
SGAUTH_URL="http://auth.sga.localhost:3000"
SGAUTH_COOKIE_NAME="sgauth-local.session_token"
NEXT_PUBLIC_SGAUTH_URL="http://auth.sga.localhost:3000"
```

Sign-in goes through SGAuth, so run SGAuth locally on `auth.sga.localhost:3000`, run the portal on another port (`npm run dev -- -p 3001`), and browse to it at `http://senate.sga.localhost:3001`, never bare `localhost`: the SGAuth cookie's domain is `sga.localhost`. Dev and preview deployments point at `https://auth-dev.northeasternsga.com` with `SGAUTH_COOKIE_NAME="__Secure-sgauth-dev.session_token"`; production uses `https://auth.northeasternsga.com` and the default cookie name. See the [SDK README](https://github.com/SGAOperations/auth-sdk#environment-variables).

The first time someone signs in, the portal links them to their existing profile by email, or asks for their NUID to create one. NUIDs stay in the portal and are never sent to SGAuth.

### Permissions

The portal has no roles of its own. What someone may do comes from their SGAuth positions, mapped in [`src/lib/permissions.ts`](src/lib/permissions.ts):

| Capability | Positions |
| --- | --- |
| Vote | `senator` |
| Be on the roster (own attendance, excusal requests) | `senator`, `parliamentarian`, `vice-president-of-*`, `student-body-president`, `executive-vice-president` |
| Approve or deny requests, take attendance, run meetings | `speaker-of-the-senate`, `senate-operations-coordinator` |
| Host votes (no vote of their own) | `speaker-of-the-senate`, `senate-operations-coordinator`, `vice-president-of-operational-affairs`, `senate-operations-coordinator` |
| Manage semesters | `speaker-of-the-senate`, `vice-president-of-operational-affairs`, `senate-operations-coordinator` |
| Read attendance and non-secret votes | `speaker-of-the-senate`, `senate-operations-coordinator`, `vice-president-of-operational-affairs`, `student-body-president`, `executive-vice-president` |
| Superadmin (all of the above but voting and the roster, plus editing member profiles) | `digital-innovation-manager`, `digital-innovation-senateportal-team-lead`, `vice-president-of-operational-affairs`, `senate-operations-coordinator` |

Only people on the roster have a portal profile (and give an NUID). Staff who only administer the portal sign in without one. The roster is read from the positions recorded at each member's last sign-in, so a position change shows on the roster once that person next signs in; members who have not signed in since the move to SGAuth stay on it until they do.

Next, start the application

```sh
npm run dev
```

Finally, run:

```sh
npx prisma migrate dev --name 'name of migration'
```

Optionally, to confirm the db is up, run and ensure it works with

```sh
run npx prisma studio
```

## Migrations with Prisma

Migrations are helpful as they can be used to ensure safe updates to our database.

To run a migration, run

```sh
npx prisma migrate dev --name 'name of migration'
```

This will create a migration file, which will be applied to our database. We can use this migration to safely update our production database as well.

If you the prisma/schema.prisma to reflect the generated/prisma/schema.prisma, run `npx prisma generate`

To check that the database is valid, run npx prettier validate

### Running Tests

Once you're in the backend folder (and connected to the database), you can also run our endpoint tests through Jest by running the following command:

```bash
npx jest --runInBand
```

### Styling

If you want to clean up your code, running Prettier can be a great help!

Start by going into a specific directory, such as `src/components`, just so you dont run it on the entire repo

```bash
npx prettier "**/*.{js,jsx,ts,tsx,json,css,md}" --write
```

### Swagger Docs

You can view all of our REST endpoints by simply going to [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

To generate new Swagger Docs, run

```bash
npx next-openapi-gen generate
```
