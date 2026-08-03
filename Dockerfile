# Lightweight runtime for the Task Board web app + storage bridge.
FROM node:20-alpine

ENV NODE_ENV=production
ENV PORT=8080
ENV DATA_DIR=/data

WORKDIR /app

# Only the app runtime is copied in; everything else (Dockerfile, compose,
# icons, README) stays out of the image to keep it small.
COPY app/ /app/

# Persistence lives on a volume mounted at /data by docker-compose.
RUN mkdir -p /data

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
