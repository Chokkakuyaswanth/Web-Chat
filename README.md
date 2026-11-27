# Web-Chat

Web-Chat is a real-time group chat app with a React frontend and an Express, Socket.IO, and MongoDB backend. Users can create named rooms, join with a shared password, see who is online, and read messages sent before they joined.

## Run locally

Install Node.js 22.9 or newer and start MongoDB. The default MongoDB URI is `mongodb://127.0.0.1:27017/chat`.

In one terminal, run the backend from the repository root.

```sh
cd server
npm ci
npm start
```

In a second terminal, run the frontend from the repository root.

```sh
cd front-end
npm ci
npm run dev
```

Open `http://localhost:5173`. Create a room in one browser tab, then use a second tab or browser session to join with the same password. The server listens on port 3002 by default.

## Configuration

Copy the relevant `.env.example` files to `.env` if you need to override a default.

| File | Variable | Purpose |
| --- | --- | --- |
| `server/.env` | `PORT` | Backend HTTP and Socket.IO port |
| `server/.env` | `MONGODB_URI` | MongoDB connection URI |
| `server/.env` | `FRONTEND_ORIGIN` | Comma-separated frontend origins for REST and Socket.IO |
| `server/.env` | `ROOM_SESSION_SECRET` | Optional signing secret. Set a long random value to keep existing room sessions valid across server restarts. |
| `front-end/.env` | `VITE_BACKEND_URL` | Backend URL for REST and Socket.IO. Set it before building the frontend. |

For a hosted frontend, use an HTTPS backend URL and set the backend's allowed origin to the hosted frontend URL.

## Room behavior

- The server hashes room passwords with bcrypt. The frontend keeps a signed one-hour room credential in browser session storage for page reloads and reconnects.
- A disconnected tab rejoins when its socket reconnects and reloads the saved history. If the credential expires before a reconnect, sign in with the room password again.
- Messages are stored in MongoDB while the room exists. When the last user disconnects, the server waits 60 seconds before deleting the empty room and its messages. A user rejoining in time cancels the cleanup. Presence and cleanup timers run in the server process.

## Checks

From `front-end/`, run `npm run lint` and `npm run build`. Run `npm run preview` to serve the production build at `http://localhost:4173` while the backend is running.
