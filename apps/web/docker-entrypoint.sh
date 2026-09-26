#!/bin/sh
set -e

# Substitution explicite (liste blanche) : sans elle, envsubst remplacerait aussi les variables
# nginx elles-memes ($uri, $host, $remote_addr...) par une chaine vide.
envsubst '${API_UPSTREAM_URL}' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"
