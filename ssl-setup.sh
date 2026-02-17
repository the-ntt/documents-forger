#!/bin/bash
# Run once after first deploy to get SSL certificates
# Prerequisites: DNS must point to this server, port 80 must be accessible

DOMAIN="${1:?Usage: ./ssl-setup.sh your-domain.com your@email.com}"
EMAIL="${2:?Usage: ./ssl-setup.sh your-domain.com your@email.com}"

echo "Obtaining SSL certificate for ${DOMAIN}..."

docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "${EMAIL}" \
  --agree-tos \
  --no-eff-email \
  -d "${DOMAIN}"

echo "SSL certificate obtained. Now:"
echo "1. Update docker/nginx.conf: replace YOUR_DOMAIN_HERE with ${DOMAIN}"
echo "2. Uncomment the SSL server block in nginx.conf"
echo "3. Reload nginx: docker compose exec nginx nginx -s reload"
