DashboardBa Deploy Notlarç (Ubuntu)

1) Dosyalarç aá
unzip dashboardba.zip -d /var/www/dashboardba

2) API
cd /var/www/dashboardba/api
npm install
pm2 start /var/www/dashboardba/deploy/ecosystem.config.cjs
pm2 save

3) Nginx
- /var/www/dashboardba/deploy/nginx.conf iáindeki server_name ve path'leri dÅzenle
- Sonra:
sudo cp /var/www/dashboardba/deploy/nginx.conf /etc/nginx/sites-available/dashboardba
sudo ln -s /etc/nginx/sites-available/dashboardba /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

Notlar:
- API portu: 3001
- Frontend root: /var/www/dashboardba/frontend/public
- API endpointleri: /api/*
- Uploads: /uploads/*
