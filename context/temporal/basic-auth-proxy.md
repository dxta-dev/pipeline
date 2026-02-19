# Temporal Basic Auth Proxy

The basic-auth proxy image at `temporal/Dockerfile.basic-auth` wraps
`nginx:alpine` to protect upstream services (like Temporal UI) with HTTP Basic
auth. The container renders `nginx.conf` and regenerates `/etc/nginx/.htpasswd`
at startup so `PROXY_PASS`, `PORT`, `USERNAME`, and `PASSWORD` can be supplied
via runtime environment variables.

## Invariants

- `/docker-entrypoint.d/10-gen-passwd.sh` overwrites `/etc/nginx/.htpasswd` on
  each container start.
- `/docker-entrypoint.d/20-render-nginx-conf.sh` renders the nginx config from
  `/etc/nginx/nginx.conf.template` at runtime.
- The proxy relies on `envsubst` (gettext) and `openssl` being installed in the
  image.

## Contracts

- `PROXY_PASS` and `PORT` must be set (defaults: `http://host.docker.internal:3000`,
  `4000`).
- `USERNAME` and `PASSWORD` must be set (defaults: `user`, `password`).
- The nginx template continues to reference `${PORT}` and `${PROXY_PASS}` and
  uses `/etc/nginx/.htpasswd` for `auth_basic_user_file`.

## Rationale

- Rendering config and credentials at startup keeps secrets out of build
  artifacts and enables per-environment overrides without rebuilding images.

## Lessons

- Use nginx's `/docker-entrypoint.d` hooks to run runtime scripts in the base
  image rather than baking auth files at build time.

## Code Example

```dockerfile
FROM nginx:alpine AS runtime

ARG PROXY_PASS=http://host.docker.internal:3000
ARG PORT=4000
ARG USERNAME=user
ARG PASSWORD=password

COPY ./temporal/basic-auth/nginx.conf.template /etc/nginx/nginx.conf.template
RUN apk add --no-cache gettext openssl

ENV PROXY_PASS=${PROXY_PASS}
ENV PORT=${PORT}
ENV USERNAME=${USERNAME}
ENV PASSWORD=${PASSWORD}

COPY --chmod=755 ./temporal/basic-auth/render-nginx-conf.sh /docker-entrypoint.d/20-render-nginx-conf.sh
COPY --chmod=755 ./temporal/basic-auth/gen_passwd.sh /docker-entrypoint.d/10-gen-passwd.sh
```

```sh
#!/bin/sh
set -eu
envsubst '$PROXY_PASS $PORT' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
```

## Diagram

```mermaid
flowchart TD
  container[nginx container] --> entrypoint[docker-entrypoint.sh]
  entrypoint --> renderConf[20-render-nginx-conf.sh]
  entrypoint --> genPass[10-gen-passwd.sh]
  renderConf --> nginxConf[/etc/nginx/nginx.conf]
  genPass --> htpasswd[/etc/nginx/.htpasswd]
```

## Related

- [Temporal Railway images](railway-images.md)
- [Docker images](../tooling/docker-images.md)
- [SCE overview](../overview.md)
