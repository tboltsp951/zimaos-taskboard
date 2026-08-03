# Task Board for ZimaOS

Turns the single-file `task-board.html` into a self-hosted ZimaOS app.
The page keeps all of its behavior — quick-add syntax, subtasks, repeating
tasks, people, weekly digest, activity log — and gains one new thing:
**data is saved to your NAS disk** via a tiny storage bridge, instead of
living only in the browser's localStorage.

## How it works

- `app/server.js` is a dependency-free Node HTTP server.
  - Serves `app/task-board.html` with a small `window.storage` bridge injected.
    The page already checks for `window.storage` first and falls back to
    localStorage, so the bridge just makes the on-NAS store win.
  - Exposes `GET/PUT /__storage__/<key>`, persisted to
    `/data/taskboard.json`.
- `Dockerfile` builds a `node:20-alpine` image.
- `docker-compose.yml` is a ZimaOS/CasaOS app manifest (`x-casaos` metadata)
  that mounts `/DATA/AppData/task-board` into the container.

## Files

```
zimaos-taskboard/
  app/
    task-board.html   the app itself (unchanged)
    server.js         web server + storage bridge
  Dockerfile
  docker-compose.yml  ZimaOS app manifest
  icon.svg            app icon
  thumbnail.svg       store card image
```

## Install on ZimaOS

Two paths — pick one.

### A. Build & run it yourself (no store needed)

Copy this folder to the ZimaOS device (or push to a git repo and clone it),
then over SSH/terminal:

```sh
docker build -t task-board:latest .
docker run -d --name task-board \
  -p 8189:8080 \
  -v /DATA/AppData/task-board:/data \
  --restart unless-stopped \
  task-board:latest
```

Open `http://<zimaos-ip>:8189`.

### B. Add it as an app in the ZimaOS app store

1. Push this repo to GitHub (as `your-github-username/zimaos-taskboard`).
2. Replace every `your-github-username` in `docker-compose.yml` with your
   actual username.
3. Build and push the image so ZimaOS can pull it:
   ```sh
   docker login ghcr.io
   docker build -t ghcr.io/your-github-username/zimaos-taskboard:latest .
   docker push ghcr.io/your-github-username/zimaos-taskboard:latest
   ```
   (Or push to Docker Hub and update the `image:` line accordingly.)
4. In ZimaOS: **Settings → App Store → Add third-party store**, then paste
   the archive URL of your repo:
   `https://github.com/your-github-username/zimaos-taskboard/archive/refs/heads/main.zip`
5. Install **Task Board**. The default host port is **8189**; change it in the
   UI if you prefer.

The icon/thumbnail URLs in the manifest point at raw GitHub files, so they
only resolve once the repo is public.

## Testing locally (no Docker needed)

```sh
node app/server.js          # DATA_DIR defaults to app/data, PORT defaults to 8080
```

Then open `http://localhost:8080`, add a task, and confirm
`app/data/taskboard.json` appears on disk.

## Notes

- The container runs as root so the bind mount at `/DATA/AppData/task-board`
  is always writable. Fine for a single-user home tool.
- Google Fonts (Oswald / IBM Plex) are loaded from the web; the app still
  works offline, it just falls back to system fonts.
- Multi-browser sharing works because storage is server-side now.
