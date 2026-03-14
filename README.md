# Hezzni Deployment Guide

## Domain Mapping

- `admin.hezzni.com`: frontend build output from `frontend/dist`
- `api.admin.hezzni.com`: Node.js backend from `backend`
- `uploads/`: shared uploaded files served by the backend at `/uploads/*`

## Recommended Plesk Layout

Keep this structure on the server:

```text
project-root/
  backend/
  frontend/
  uploads/
  README.md
```

This repository is now configured to prefer `project-root/uploads` automatically. If you need a different uploads location on Plesk, set `UPLOADS_DIR` in `backend/.env`.

## What To Upload

### Frontend domain: `admin.hezzni.com`

Upload the contents of `frontend/dist` to the document root for the frontend domain, usually `httpdocs/`.

Build command:

```bash
cd frontend
npm install
npm run build
```

Upload this output:

```text
frontend/dist/*
```

The build now copies `.htaccess` into `frontend/dist`, so upload that file together with the rest of the build output. It keeps React routes like `/drivers` or `/dashboard` working after a page refresh.

Do not upload the raw `frontend/src` files to the public web root.

### Backend domain: `api.admin.hezzni.com`

Use Plesk Node.js support for the `backend` folder.

- Application root: `backend`
- Application startup file: `server.js`
- Node version: `18+`
- Install command: `npm install`

The backend serves uploaded files from `/uploads`, so the backend domain should be the one that has access to the shared `uploads` folder.

## Where `uploads` Should Go

Upload the `uploads` folder beside `backend` and `frontend`, not inside the frontend build.

Correct:

```text
project-root/uploads/drivers
project-root/uploads/passengers
```

Why:

- uploaded images are served from `https://api.admin.hezzni.com/uploads/...`
- the backend writes files into the shared uploads folder
- the frontend only reads those URLs; it should not store uploads itself

If your Plesk setup forces a different folder, set `UPLOADS_DIR` in `backend/.env` to an absolute path or a path relative to `backend`.

Examples:

```env
UPLOADS_DIR=../uploads
```

or

```env
UPLOADS_DIR=C:/Inetpub/vhosts/your-domain/project-root/uploads
```

## Where `README.md` Should Go

`README.md` does not need to be uploaded for the site to run. It is documentation only.

- keep it in the project root for your own reference
- do not place it in the frontend `httpdocs`
- do not place it inside the backend public files unless you intentionally want it downloadable

## Required Environment Values

### Frontend

Production is already configured to call the backend domain:

```env
VITE_API_URL=https://api.admin.hezzni.com
```

### Backend

At minimum, set these in `backend/.env`:

```env
PORT=5000
DB_HOST=your-db-host
DB_PORT=3306
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password
JWT_SECRET=replace-with-a-strong-random-secret
ADMIN_EMAIL=your-admin-email
ADMIN_PASSWORD=your-admin-password
```

Optional:

```env
UPLOADS_DIR=../uploads
```

You can start from `backend/.env.example` and then fill in the real values in `backend/.env` or in the Plesk environment variables UI.

## Plesk Setup

### Frontend domain: `admin.hezzni.com`

1. Open Plesk.
2. Go to `Websites & Domains`.
3. Click `admin.hezzni.com`.
4. Open `Files` for that domain.
5. Open `httpdocs`.
6. Delete the default placeholder files if Plesk created any.
7. Build the frontend with `npm run build` inside `frontend`.
8. Upload the contents of `frontend/dist` into `admin.hezzni.com/httpdocs`.
9. Confirm these files exist in `httpdocs`: `index.html`, `assets/`, `.htaccess`.
10. Open `Hosting & DNS` or `Apache & nginx Settings` only if needed; the included `.htaccess` should handle React route refreshes.

### Backend domain: `api.admin.hezzni.com`

1. Open Plesk.
2. Go to `Websites & Domains`.
3. Click `api.admin.hezzni.com`.
4. Open `Node.js`.
5. Enable Node.js for the domain if it is not already enabled.
6. Set `Document root` to the backend app public root used by your Plesk setup.
7. Set `Application mode` to `Production`.
8. Set `Application root` to the folder that contains the uploaded `backend` project.
9. Set `Application startup file` to `server.js`.
10. Choose Node.js `18+`.
11. Click `Enable Node.js` or `Save`.
12. Open `Files` for `api.admin.hezzni.com`.
13. Upload the full `backend` folder to the backend app location.
14. Upload the shared `uploads` folder beside `backend`, not inside `frontend/dist`.
15. In `Node.js`, open the environment variables section.
16. Add `PORT`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
17. Add `UPLOADS_DIR=../uploads` if `uploads` is beside `backend`.
18. Click `NPM Install` in Plesk, or run `npm install` for the backend app from the Plesk UI.
19. Click `Restart App`.
20. Visit `https://api.admin.hezzni.com/` and confirm it returns the API status response.

### Shared uploads folder

1. In Plesk `Files`, go to the parent folder that contains both `backend` and `uploads`.
2. Confirm the layout looks like this:

```text
project-root/
  backend/
  uploads/
```

3. Confirm uploaded files are reachable from the backend domain at `/uploads/...`.
4. Example test URL: `https://api.admin.hezzni.com/uploads/drivers/driver-placeholder.png`

## Deployment Steps

1. Upload `backend` to the backend domain app location.
2. Upload `uploads` beside `backend`.
3. In Plesk, configure the Node.js app for `api.admin.hezzni.com` using `backend/server.js`.
4. Run `npm install` in `backend`.
5. Set the backend environment variables in Plesk.
6. Build the frontend locally or on the server with `npm run build` inside `frontend`.
7. Upload the contents of `frontend/dist` to `admin.hezzni.com/httpdocs`.
8. Confirm `https://api.admin.hezzni.com/` responds and `https://api.admin.hezzni.com/uploads/...` serves files.

## Local Development

### Backend

```bash
cd backend
npm install
node server.js
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```
