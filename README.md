# SGA Senate Portal

The purpose of this application is to streamline the attendance system at SGA (Student Government Association).

## Tech Stack

Common:

- [TypeScript](https://www.typescriptlang.org/)

Frontend:

- Framework: [React](https://react.dev/)
- Styling: [Tailwind CSS](https://tailwindcss.com/docs/installation)

Backend:

- Framework: [Next.js](https://nextjs.org/docs)
- ORM: [Prisma](https://www.prisma.io/docs)
- Database: [PostgreSQL](https://www.postgresql.org/docs/) (hosted on [Supabase](https://supabase.com/docs))

Hosting/Deployment:
- [Vercel](https://vercel.com/docs)

Authentication: Supabase Auth

Components: TBD

## Setting up the development environment

Prerequisites: make sure everything is installed

1. [node/npm](https://nodejs.org/en)
   - To check if it's installed: `node -v` and `npm -v`
   - To install: for [mac/linux](https://github.com/nvm-sh/nvm) and [windows](https://github.com/coreybutler/nvm-windows) (setup instructions are in the link under the `Installing and Updating` and `Installation & Upgrades` sections, respectively)
   (For some reason, node version 25 does not support us. Please use node version 24)

First, clone the repo and `cd` into the directory

```bash
git clone https://github.com/SGAOperations/senate-portal.git
cd senate-portal
cd senate-portal
```

Then, install the dependencies

```bash
npm install
```

## Running the app

To run both the frontend and backend run 
```bash
npm run dev
```

## Linting/Prettier
To run Prettier
```bash
npx prettier . --write
```

## Docker
Ensure [Docker](https://www.docker.com/products/docker-desktop/) is downloaded and running

## Meet the Team

```
Jake Wu-Chen
Yujin Park
Anusha Narang
Daniel Kaplan
Logan Ravinuthala
Natalia Ivanov
Mahika Sharma
Grace Sosa
```

## Todos
https://linear.app/nusga/team/ATM/active 
