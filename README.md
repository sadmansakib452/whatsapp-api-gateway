# Description

backend created using nestjs

## WhatsApp Gateway (Assessment)

This project includes a **WhatsApp message gateway** that:

- Authenticates with WhatsApp Web using **QR code**
- Streams QR + status in real time using **Socket.IO**
- Persists session locally (no re-scan needed after restart)
- Exposes REST endpoints to check status and send a message

## Config

Stripe webhook:

```
http://{domain_name}/api/payment/stripe/webhook
```

for development run stripe cli:

```
stripe listen --forward-to localhost:4000/api/payment/stripe/webhook
```

trigger a event for testing:

```
stripe trigger payment_intent.succeeded
```

## Installation

Install all dependencies

```
yarn install
```

## Setup

Copy .env.example to .env and config according to your needs.

Migrate database:

```bash
npx prisma migrate dev
```

Seed dummy data to database

```
yarn cmd seed
```

## Running:

```bash
# development
yarn start

# watch mode
yarn start:dev

# production mode
yarn start:prod

# watch mode with swc compiler (faster)
yarn start:dev-swc
```

For docker:

```
docker compose up
```

## WhatsApp endpoints

### Status

`GET /api/whatsapp/status`

Returns the current WhatsApp client status and whether a QR is available.

### Send message

`POST /api/whatsapp/send`

Headers (optional but recommended):

- `x-api-key: <WHATSAPP_API_KEY>` (only required if you set `WHATSAPP_API_KEY` in `.env`)

Body:

```json
{
  "phone": "8801XXXXXXXXX",
  "message": "Hello from my WhatsApp gateway"
}
```

Notes:

- The backend converts numbers to WhatsApp chat id format (`<digits>@c.us`).
- WhatsApp must be in `READY` state (QR scanned).

## WhatsApp Socket.IO

Connect to namespace `/whatsapp` and listen for:

- `status` → `{ "status": "AUTH_REQUIRED" | "QR_AVAILABLE" | "READY" | ... }`
- `qr` → `{ "qr": "<qr-string>" }`

You can render the QR using any QR library (e.g. `qrcode` in a small web page).

## Demo video checklist

Record this flow:

1. Start server
2. Connect Socket.IO client and show `qr` event
3. Scan QR from phone
4. Show `status` becomes `READY`
5. Call `POST /api/whatsapp/send` and show the message is received on WhatsApp

## Api documentation

Swagger: http://{domain_name}/api/docs

## Tech used

- Typescript
- Nest.js
- Prisma
- Postgres
- Socket.io
- Bullmq
- Redis
- etc.
