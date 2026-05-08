# InsightLM (Client)

Next.js UI for InsightLM.

## Dev

```bash
cd client
npm install
npm run dev
```

By default, the client calls the backend at `http://localhost:8000/api`.

## Config

| Env var | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL (example: `http://localhost:8000/api`) |

Example:

```bash
export NEXT_PUBLIC_API_URL=http://localhost:8000/api
npm run dev
```

## Notes

- The tab icon/favicon is served from `public/favicon.svg` and wired via metadata in `app/layout.tsx`.
