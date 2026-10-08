# Getting started (beginner friendly)

This guide gets CampusKonnect running on your own computer, step by step. You do **not** need to know SQL.

## Key ideas in 1 minute

| Word                      | What it means here                                                                                                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Database (PostgreSQL)** | The program that permanently stores users, listings, messages… Think of it as a set of very reliable spreadsheets.                                                           |
| **SQL**                   | The language for talking to the database. **You never write it yourself.** Prisma does it for you.                                                                           |
| **Prisma**                | A tool in this project that creates the tables (`db:migrate`), fills demo data (`db:seed`) and shows the data in your browser (`db:studio`).                                 |
| **Docker**                | Runs programs inside ready-made, isolated "boxes" (containers). We _can_ use it to run PostgreSQL with one command, instead of installing PostgreSQL by hand. It's optional. |
| **Server (API)**          | The backend in `server/`. It runs on http://localhost:4000.                                                                                                                  |
| **Client (web app)**      | The website in `client/`. It runs on http://localhost:5173, and this is what you open in the browser.                                                                        |

## Step 1: Install the tools (once)

1. **Node.js 22 LTS** from https://nodejs.org (choose "LTS"). Check by running `node -v` in a terminal; it should print `v22…`.
2. **Git** from https://git-scm.com.
3. A code editor, e.g. **VS Code** from https://code.visualstudio.com.

On Windows, use **PowerShell** or the VS Code terminal for the commands below.

## Step 2: Download the project

```bash
git clone https://github.com/dheerajcse9-tech/campusKonnect.git
cd campusKonnect
git checkout claude/awesome-archimedes-e97y6b
npm install
```

`npm install` downloads all the libraries the project needs. It can take a few minutes.

## Step 3: Get a database (pick ONE option)

### Option A: Free cloud database with Neon (easiest, nothing to install)

1. Sign up at https://neon.tech, then create a project and choose the region **Singapore**.
2. On the project dashboard, click **Connect** and copy the connection string. It looks like
   `postgresql://user:password@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
3. Create the settings file:
   ```bash
   cp server/.env.example server/.env
   ```
   (On Windows PowerShell: `Copy-Item server/.env.example server/.env`)
4. Open `server/.env` in your editor and replace the `DATABASE_URL=` line with your Neon string.
5. _(Only needed for the automated tests in Step 6)_ In Neon → **Databases** → **New database**, create one named `campuskonnect_test`. Then open `server/.env.test` and set `DATABASE_URL` to the same connection string, but with `/neondb` replaced by `/campuskonnect_test`.

### Option B: Docker (database runs on your computer)

1. Install **Docker Desktop** from https://www.docker.com/products/docker-desktop and start it. On Windows it may ask you to enable WSL 2; accept and restart.
2. In the project folder:
   ```bash
   docker compose up -d
   cp server/.env.example server/.env
   ```
   That one command downloads and starts PostgreSQL with user `campus` and password `campus`, which already matches `server/.env`. `-d` means "run in the background".
3. _(Only needed for the automated tests)_ create the test database:
   ```bash
   docker compose exec postgres createdb -U campus campuskonnect_test
   ```

Useful Docker commands: `docker compose ps` (is it running?), `docker compose stop` (stop it), `docker compose up -d` (start it again). Your data is kept between restarts.

### Option C: Install PostgreSQL directly

Install PostgreSQL 16 from https://www.postgresql.org/download/. During setup, remember the password you choose for the `postgres` user. Then put this in `server/.env` (replace `YOURPASSWORD`):

```
DATABASE_URL=postgresql://postgres:YOURPASSWORD@localhost:5432/campuskonnect?schema=public
```

## Step 4: Create the tables and demo data

```bash
npm run db:migrate -w server     # creates all tables (if asked for a migration name, just press Enter)
npm run db:seed -w server        # adds demo students, listings, a chat and community posts
```

The seed prints the demo accounts. **The password for all of them is `Password123`:**

| Email                | Role                                           |
| -------------------- | ---------------------------------------------- |
| `admin@college.edu`  | Admin (can open the Admin dashboard)           |
| `asha@college.edu`   | Student (seller with an approved deal)         |
| `vikram@college.edu` | Student (has a pending request on his cycle)   |
| `neha@college.edu`   | Student (buyer, asked a question in Community) |
| `arjun@college.edu`  | Student                                        |

Run `npm run db:seed -w server -- --force` any time to wipe everything and start fresh.

## Step 5: Run the app

Open **two terminals** in the project folder:

```bash
# Terminal 1: the server (API)
npm run dev:server
```

```bash
# Terminal 2: the website
npm run dev:client
```

Now open **http://localhost:5173** in your browser. 🎉

Keep both terminals open while you use the app. Press `Ctrl + C` in a terminal to stop it.

## Step 6: Try it out (manual test checklist)

Tip: to be two people at once, use a normal window for one user and an **incognito/private window** for the other.

**Buying (two users)**

1. Window 1: sign in as `neha@college.edu`, open **Hero Sprint cycle**, click **Request to buy** and send it.
2. Window 2 (incognito): sign in as `vikram@college.edu`. The 🔔 shows a notification. Open it and click **Approve**.
3. Both users now see each other's phone and email, and can **Chat**. Send messages both ways; they appear within a few seconds.
4. Vikram clicks **Mark as completed**, and the cycle becomes _Sold_.

**Renting:** sign in as `neha`, open **Casio fx-991EX calculator**, then **Request to rent** and pick dates.

**Selling:** click **+ Sell or rent**, add a photo, fill in the form and publish. Then edit it, mark it sold, and relist it.

**Ask a Senior:** go to **Community**, then **Ask or share**, and post a doubt. Answer it from another account and upvote the best answer.

**Sign up as a new student**

1. Click **Join free** and register with any `…@college.edu` email (only this domain is allowed locally; see `ALLOWED_EMAIL_DOMAINS` in `server/.env`).
2. No real email is sent locally. Instead, **look in Terminal 1 (the server)** for a line containing `verify-email?token=…`, copy that link and open it in the browser.
3. Sign in.

**Moderation**

1. As a student, open any listing and click **Report**.
2. Sign in as `admin@college.edu`, then go to the avatar menu → **Admin dashboard** → **Reports** → **Take action**.
3. Check **Audit log**: every admin action is recorded there.

**Other things to check:** dark mode (🌙 icon), the phone layout (make the browser window narrow), and **Profile**: change your photo or password, or delete the account.

## Step 7: Look at the data without SQL

```bash
npm run db:studio -w server
```

This opens **Prisma Studio** at http://localhost:5555, a spreadsheet-style view of every table (User, Listing, TransactionRequest, Message…). You can browse, filter and even edit rows there.

## Step 8: Run the automated tests

Make sure you created the test database (Step 3), then:

```bash
npm test
```

This runs about 110 automated checks: logging in, permissions, the buy/rent flow, chat, moderation, security rules and more. At the end you should see something like `Tests 101 passed` for the server and `Tests 10 passed` for the client. The tests use the separate `campuskonnect_test` database, so your demo data is never touched.

Other checks:

```bash
npm run lint         # code style problems
npm run typecheck    # TypeScript type errors
npm run build        # production build of server and website
```

## Troubleshooting

| Problem                                                      | Fix                                                                                                                                          |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `Can't reach database server`                                | The database isn't running. Docker: open Docker Desktop and run `docker compose up -d`. Neon: check the `DATABASE_URL` in `server/.env`.     |
| `Invalid environment configuration` when starting the server | You're missing `server/.env`. Run `cp server/.env.example server/.env` again.                                                                |
| Port `4000` or `5173` already in use                         | Another copy is still running. Close the other terminal, or press `Ctrl + C` there.                                                          |
| "Please verify your email first"                             | Use a demo account, or open the verification link printed in the server terminal.                                                            |
| "Too many attempts" when logging in                          | The safety limit allows 10 login attempts per account every 15 minutes. Wait, or restart the server (`Ctrl + C`, then `npm run dev:server`). |
| Tests fail with a database error                             | The test database `campuskonnect_test` doesn't exist, or `server/.env.test` points to the wrong place (Step 3).                              |
| Uploaded photos don't appear                                 | The server (Terminal 1) must be running. Locally, photos are saved in `server/uploads/`. In production, Cloudinary stores them.              |
