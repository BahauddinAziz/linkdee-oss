# LinkedReach

> **Open-source LinkedIn outreach platform** — self-hostable, multi-user, built on top of the [Unipile API](https://unipile.com).

Run LinkedIn outreach campaigns (connection requests & direct messages) with safe jitter-based pacing, real-time progress tracking, CSV lead imports, automatic profile enrichment, campaign scheduling, and webhook-driven live updates.

---

## ✨ Features

- **Multi-user** — sign up, each user has their own Unipile API keys & accounts
- **LinkedIn Account Linking** — connect via Unipile's Hosted Auth Wizard (no raw credentials stored)
- **Campaign Builder** — connection request campaigns & direct message campaigns
- **CSV Lead Import** — bulk-import leads; compatible with LinkedIn, Apollo.io, Phantombuster exports
- **Profile Enrichment** — auto-extract first name from LinkedIn profile via Unipile API
- **Human Jitter Engine** — randomised pacing delays to mimic natural behaviour
- **Daily Action Caps** — per-campaign daily limits with automatic midnight resets
- **Campaign Scheduling** — set a future start time for any campaign
- **Webhook Listener** — real-time Unipile events (account status, message replies, connections accepted)
- **Live Log Terminal** — real-time scrolling execution log per campaign

---

## 🏗 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vite + React 18, React Router v6, Vanilla CSS |
| Backend | Node.js 20 + Express 5 (ES Modules) |
| Database | PostgreSQL 16 via Prisma ORM |
| Auth | JWT (access + refresh token) |
| Scheduling | node-cron |
| File Parsing | csv-parse |

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 20
- PostgreSQL 16 running locally (or a hosted instance)
- A [Unipile](https://unipile.com) account with a DSN and Access Token

### 1. Clone & install

```bash
git clone https://github.com/your-org/linkedreach.git
cd linkedreach
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### 2. Configure environment

```bash
cp .env.example backend/.env
```

Edit `backend/.env` and fill in:
- `DATABASE_URL` — your PostgreSQL connection string
- `JWT_SECRET` and `JWT_REFRESH_SECRET` — random 64-char hex strings
- `ENCRYPTION_KEY` — exactly 64 hex characters (32 bytes)
- `FRONTEND_URL` — defaults to `http://localhost:5173`

> Generate secrets quickly:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

### 3. Run database migrations

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Start the dev servers

**Backend** (port 3000):
```bash
cd backend && npm run dev
```

**Frontend** (port 5173):
```bash
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📂 Project Structure

```
linkedreach/
├── .env.example          # Environment variable template
├── .gitignore
├── package.json          # Root workspace config
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── server.js
│       ├── config/
│       ├── lib/          # jwt, crypto, prisma client
│       ├── middleware/   # auth, errorHandler
│       ├── routes/
│       ├── controllers/
│       └── services/     # unipileClient, campaignWorker, scheduler, csvParser
└── frontend/
    └── src/
        ├── api/
        ├── context/
        ├── hooks/
        ├── components/
        │   ├── Layout/
        │   ├── ui/
        │   ├── campaigns/
        │   └── leads/
        └── pages/
```

---

## 🔐 Security Notes

- Unipile access tokens are encrypted at rest (AES-256-CBC) — never stored in plain text
- JWTs use short-lived access tokens (15 min) + long-lived refresh tokens (7 days) in `HttpOnly` cookies
- All API endpoints are ownership-scoped — users can only access their own data
- Never commit your `.env` file — it is gitignored by default

---

## 🤝 Contributing

Contributions are very welcome! Please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.
