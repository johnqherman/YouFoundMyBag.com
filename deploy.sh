#!/bin/bash
set -e

cd /var/www/youfoundmybag

git fetch origin
git reset --hard origin/master

npm ci

npm run build

pm2 restart ecosystem.config.json --update-env || pm2 start ecosystem.config.json
pm2 save
