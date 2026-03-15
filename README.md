# WhatsApp API Gateway (NestJS)

This project is a **NestJS backend** that exposes a REST + Socket.IO API on top of a **local WhatsApp Web session**.

It lets you:

- Authenticate WhatsApp Web using a **QR code** (scanned from your phone)
- Stream the QR + connection status in **real time** via Socket.IO
- **Persist session** so you don’t need to re-scan after restart
- Send WhatsApp messages using a simple **HTTP API**

---

## Features

- **WhatsApp Web integration**
  - Uses `whatsapp-web.js` with `LocalAuth` to control a local WhatsApp Web session.
  - Session is stored on disk, so restarts do not require a new QR scan.

- **Realtime QR & status via Socket.IO**
  - Namespace: `/whatsapp`
  - Events:
    - `status` – current WhatsApp client status (`AUTH_REQUIRED`, `QR_AVAILABLE`, `READY`, etc.)
    - `qr` – raw QR string to be displayed or passed to a QR generator.

- **REST API**
  - `GET /api/whatsapp/status` – check client status.
  - `POST /api/whatsapp/send` – send a message to a WhatsApp number.

- **Reliability & safety**
  - Input validation via DTOs (`class-validator`).
  - Centralized HTTP error formatting.
  - Basic in-memory **rate limiting** and **concurrency limiting** per instance.
  - Optional API key guard using `x-api-key`.

---

## Requirements

- Node.js (LTS recommended, e.g. 20+)
- Yarn
- A phone with WhatsApp installed
- Chrome/Chromium-capable environment (used by `whatsapp-web.js` via Puppeteer)

---

## Installation

```bash
yarn install
```

---

## Environment variables

Copy `.env.example` to `.env` and adjust as needed:

```bash
cp .env.example .env
```

At minimum, for the WhatsApp gateway:

- **`PORT`**
  Port where the Nest app listens.  
  Example:
  ```env
  PORT=4001
  ```

- **`WHATSAPP_SESSION_PATH`** (optional)  
  Directory where WhatsApp session data is stored (for LocalAuth).  
  Default in code:
  ```env
  WHATSAPP_SESSION_PATH=.whatsapp-session
  ```

- **`WHATSAPP_API_KEY`** (optional but recommended)  
  If set, `POST /api/whatsapp/send` requires header `x-api-key` to match.  
  Example:
  ```env
  WHATSAPP_API_KEY=my-super-secret-key
  ```
  If left empty / undefined, the endpoint can be called without `x-api-key` (useful for local testing).

Other variables in `.env.example` (DB, mail, etc.) are used by the wider boilerplate but are **not required** just to test the WhatsApp gateway.

---

## Running the app

### Development

```bash
yarn start
# or
yarn start:dev
```

The app will start on `http://localhost:${PORT}` (default 4000 or as set in `.env`).

### Docker (optional)

```bash
docker compose up
```

---

## WhatsApp QR & Socket.IO

### 1. Realtime QR viewer page

After the backend is running, open:

```text
http://localhost:${PORT}/public/whatsapp-qr.html
```

This page:

- Connects to Socket.IO namespace `/whatsapp`
- Shows:
  - Socket connection status
  - WhatsApp client status (`AUTH_REQUIRED`, `QR_AVAILABLE`, `READY`, etc.)
  - The **raw QR string** when available (you can paste this into any QR generator)

### 2. Generating the QR image

Use any QR generator that supports **free text** (not only URLs). For example:

- `https://www.the-qrcode-generator.com/` (Text mode)
- `https://www.qr-code-generator.com/` (Text / Free text)

Steps:

1. Copy the raw QR string from `whatsapp-qr.html`.
2. Paste into the QR generator (Text mode).
3. Show the generated QR code on screen.

On your phone:

1. Open WhatsApp → **Linked devices** → **Link a device**.
2. Scan the generated QR code.

When authentication succeeds, the backend logs:

- `WhatsApp authenticated`
- `WhatsApp client is ready`

and the status endpoint will report `READY`.

---

## WhatsApp REST API

### 1. Check status

**Endpoint**

```http
GET /api/whatsapp/status
```

**Example response**

```json
{
  "success": true,
  "data": {
    "status": "READY",
    "has_qr": false
  }
}
```

`status` can be:

- `INIT`
- `AUTH_REQUIRED`
- `QR_AVAILABLE`
- `READY`
- `DISCONNECTED`
- `ERROR`

`has_qr` is `true` when a QR is currently available (before you authenticate).

---

### 2. Send message

**Endpoint**

```http
POST /api/whatsapp/send
Content-Type: application/json
x-api-key: <WHATSAPP_API_KEY>      # only if you set it in .env
```

**Body**

```json
{
  "phone": "8801XXXXXXXXX",
  "message": "Hello from my WhatsApp gateway"
}
```

Notes:

- `phone` should include country code and digits (non-digits are stripped).  
  The service converts this into WhatsApp chat ID format: `<digits>@c.us`.
- WhatsApp must be in `READY` state (see `/api/whatsapp/status`).

**Success response**

```json
{
  "success": true,
  "message": "Message sent successfully"
}
```

**Possible error responses**

- `400 Bad Request`
  - Missing `phone` or `message`
  - Invalid phone number
- `503 Service Unavailable`
  - WhatsApp client not initialized
  - WhatsApp not ready (QR not scanned)
  - WhatsApp is busy (too many concurrent sends)
- `429 Too Many Requests`
  - Per-instance rate limit exceeded (too many sends in a short window)
- `500 Internal Server Error`
  - Unexpected failure; see server logs for details

All errors are returned in a consistent JSON shape:

```json
{
  "success": false,
  "message": "..."
}
```

(or a structured `message` object, depending on the specific exception).

## API documentation (Swagger)

Default Swagger UI:

```text
http://{domain_name}/api/docs
```

You can use this to explore other modules in the project (auth, admin, etc.), but the WhatsApp gateway endpoints are the primary focus for this assessment.

---

## Tech stack

- **Node.js / NestJS** – application framework
- **TypeScript**
- **WhatsApp Web integration** – `whatsapp-web.js`
- **Socket.IO** – realtime QR + status streaming
- **Prisma** (with Postgres) – data layer (used by other modules)
- **BullMQ / Redis ready** – for background jobs (not strictly required for WhatsApp gateway)
- **Docker** – containerized local environment

 