# Panduan Setup Custom Domain di Vercel

## 🌐 Konfigurasi Custom Domain untuk Money Maker Platform

### 1. **Persiapan Domain**

#### A. Beli Domain (Rekomendasi)
- **Namecheap**: Harga terjangkau, interface mudah
- **GoDaddy**: Provider populer dengan support 24/7
- **Cloudflare Registrar**: Harga wholesale, gratis SSL
- **Google Domains**: Integrasi dengan Google services

#### B. Saran Nama Domain
```
moneymakerplatform.com
moneymaker-pro.com
earnwithus.com
revenuehub.io
profitplatform.co
```

### 2. **Setup Domain di Vercel**

#### A. Login ke Vercel Dashboard
1. Buka [https://vercel.com](https://vercel.com)
2. Login dengan akun Anda
3. Pilih project "money-maker-platform"

#### B. Add Custom Domain
1. Go to Settings > Domains
2. Click "Add Domain"
3. Enter domain name (contoh: `moneymakerplatform.com`)
4. Click "Add"

### 3. **Konfigurasi DNS Records**

#### A. Root Domain (moneymakerplatform.com)
```
Type: A
Name: @
Value: 76.76.19.19
TTL: 3600
```

#### B. WWW Subdomain (www.moneymakerplatform.com)
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

#### C. Alternative: CNAME untuk Root (jika provider mendukung)
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
TTL: 3600
```

### 4. **Verifikasi Domain**

#### A. DNS Propagation Check
- Tunggu 24-48 jam untuk propagasi DNS
- Check status di [https://dnschecker.org](https://dnschecker.org)
- Vercel akan otomatis detect dan verify domain

#### B. SSL Certificate
- Vercel otomatis generate SSL certificate
- Certificate akan active dalam 24 jam
- Check status di Vercel Dashboard > Domains

### 5. **Update Environment Variables**

#### A. Update CLIENT_URL di Railway
```bash
# Di Railway environment variables
CLIENT_URL=https://moneymakerplatform.com
```

#### B. Update CORS Settings
```javascript
// Di server/index.js atau server.js
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://money-maker-platform.vercel.app',
    'https://moneymakerplatform.com',
    'https://www.moneymakerplatform.com'
  ],
  credentials: true
};
```

### 6. **Redirect Configuration**

#### A. WWW to Non-WWW (Recommended)
```json
// Di vercel.json
{
  "redirects": [
    {
      "source": "https://www.moneymakerplatform.com/:path*",
      "destination": "https://moneymakerplatform.com/:path*",
      "permanent": true
    }
  ]
}
```

#### B. HTTP to HTTPS (Otomatis oleh Vercel)
- Vercel otomatis redirect HTTP ke HTTPS
- Tidak perlu konfigurasi tambahan

### 7. **Testing Custom Domain**

#### A. Basic Functionality Test
```bash
# Test domain accessibility
curl -I https://moneymakerplatform.com

# Test SSL certificate
openssl s_client -connect moneymakerplatform.com:443
```

#### B. Application Test
1. Buka `https://moneymakerplatform.com`
2. Test login/register functionality
3. Test payment flow
4. Verify API calls ke Railway backend

### 8. **SEO & Analytics Update**

#### A. Google Analytics
```javascript
// Update GA tracking untuk domain baru
gtag('config', 'GA-XXXXXXXXX', {
  page_title: 'Money Maker Platform',
  page_location: 'https://moneymakerplatform.com'
});
```

#### B. Google Search Console
1. Add property untuk domain baru
2. Verify ownership via DNS atau HTML file
3. Submit sitemap: `https://moneymakerplatform.com/sitemap.xml`

### 9. **Branding Updates**

#### A. Update Meta Tags
```html
<!-- Di public/index.html -->
<meta property="og:url" content="https://moneymakerplatform.com" />
<meta property="og:site_name" content="Money Maker Platform" />
<link rel="canonical" href="https://moneymakerplatform.com" />
```

#### B. Update Email Templates
```javascript
// Update semua email templates dengan domain baru
const emailTemplate = {
  from: 'noreply@moneymakerplatform.com',
  replyTo: 'support@moneymakerplatform.com'
};
```

### 10. **Monitoring & Maintenance**

#### A. Domain Expiry Monitoring
- Set reminder 30 hari sebelum expiry
- Enable auto-renewal di domain registrar
- Monitor DNS health dengan tools seperti Pingdom

#### B. SSL Certificate Monitoring
- Vercel otomatis renew SSL certificates
- Monitor certificate expiry dengan SSL monitoring tools

---

## 🚀 Deployment Commands

```bash
# 1. Update CORS settings
git add server/index.js
git commit -m "feat: add custom domain to CORS settings"

# 2. Update vercel.json untuk redirects
git add vercel.json
git commit -m "feat: add www to non-www redirect"

# 3. Push changes
git push origin main

# 4. Update Railway environment variables
# CLIENT_URL=https://moneymakerplatform.com
```

## 📋 Checklist

- [ ] Domain purchased dan configured
- [ ] DNS records setup correctly
- [ ] Domain verified di Vercel
- [ ] SSL certificate active
- [ ] CORS settings updated
- [ ] Environment variables updated
- [ ] Redirects configured
- [ ] Application tested on new domain
- [ ] Analytics updated
- [ ] SEO settings updated

---

**💡 Tips**: 
- Gunakan domain .com untuk kredibilitas maksimal
- Setup email forwarding: admin@domain.com → your-email@gmail.com
- Consider CDN setup untuk performa global yang lebih baik