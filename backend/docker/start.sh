#!/bin/sh
set -e
cd /var/www/html

PORT="${PORT:-80}"
sed -ri "s/Listen 80/Listen ${PORT}/" /etc/apache2/ports.conf
sed -ri "s/<VirtualHost \\*:80>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf

php artisan package:discover --ansi
if [ "$RESET_DATABASE" = "1" ]; then
  php artisan db:wipe --force
fi
php artisan migrate --force
php artisan storage:link || true

# Render ends the deploy if no port is open within a few minutes.
# Seeding talks to a remote database and is slower than that window,
# so the web server starts first and the seed finishes in the background.
(
  USERS=$(php -r 'require "vendor/autoload.php"; $app = require "bootstrap/app.php"; $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap(); echo App\Models\User::query()->count();')
  if [ "$USERS" = "0" ]; then
    php artisan db:seed --force
  fi
  php artisan config:cache
  php artisan route:cache
  php artisan view:cache
) >> /var/log/seed.log 2>&1 &

exec apache2-foreground
