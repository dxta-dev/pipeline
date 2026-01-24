#!/bin/sh

set -eu

USER_NAME=${USERNAME}
PASSWD=${PASSWORD}

echo "Generating password for user ${USER_NAME}"

CRYPTPASS=$(openssl passwd -apr1 "${PASSWD}")

printf "%s:%s\n" "${USER_NAME}" "${CRYPTPASS}" > /etc/nginx/.htpasswd
