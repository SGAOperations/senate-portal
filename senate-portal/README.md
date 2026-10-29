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
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="What was outputted in your Authentication Keys/Publishable"
```

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
