# Custom Domain Setup Guide

## Overview
Panduan lengkap untuk mengatur custom domain pada aplikasi Money Maker Platform menggunakan Vercel dan Railway.

## Prerequisites
- Domain yang sudah dibeli (contoh: yourdomain.com)
- Akses ke DNS management provider domain
- Akun Vercel dan Railway yang sudah terkonfigurasi
- Aplikasi sudah di-deploy di Vercel (frontend) dan Railway (backend)

## Quick Setup

### 1. Automated Setup
```bash
# Jalankan script otomatis
npm run setup-domain

# Ikuti prompt untuk memasukkan:
# - Domain name (contoh: yourdomain.com)
# - API URL (contoh: https://api.yourdomain.com)
```

### 2. Manual Setup

#### A. Konfigurasi Domain di Vercel
1. Login ke [Vercel Dashboard](https://vercel.com/dashboard)
2. Pilih project Money Maker Platform
3. Go to **Settings** → **Domains**
4. Add domain:
   - `yourdomain.com`
   - `www.yourdomain.com`

#### B. DNS Configuration
Tambahkan DNS records di provider domain Anda:

**Root Domain (A Record):**
```
Type: A
Name: @
Value: 76.76.19.19
TTL: 3600
```

**WWW Subdomain (CNAME):**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

**API Subdomain (CNAME):**
```
Type: CNAME
Name: api
Value: your-railway-app.railway.app
TTL: 3600
```

#### C. Update Environment Variables

**Railway (Backend):**
```bash
CLIENT_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

**Vercel (Frontend):**
```bash
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_CLIENT_URL=https://yourdomain.com
```

## Verification Steps

### 1. DNS Propagation Check
```bash
# Check DNS propagation
nslookup yourdomain.com
nslookup www.yourdomain.com
nslookup api.yourdomain.com
```

### 2. SSL Certificate
- Vercel akan otomatis generate SSL certificate
- Tunggu 5-10 menit untuk aktivasi
- Check di browser: https://yourdomain.com

### 3. Functionality Test
```bash
# Test frontend
curl -I https://yourdomain.com

# Test API
curl -I https://api.yourdomain.com/api/health

# Test redirects
curl -I https://www.yourdomain.com
```

## Advanced Configuration

### Custom Redirects
Edit `vercel.json` untuk custom redirects:
```json
{
  "redirects": [
    {
      "source": "/home",
      "destination": "/dashboard",
      "permanent": true
    }
  ]
}
```

### Security Headers
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        }
      ]
    }
  ]
}
```

## SEO & Analytics Setup

### Google Analytics
1. Update tracking ID di `public/index.html`
2. Update domain di Google Analytics dashboard

### Google Search Console
1. Add property: `https://yourdomain.com`
2. Verify ownership via DNS TXT record
3. Submit sitemap: `https://yourdomain.com/sitemap.xml`

## Troubleshooting

### Common Issues

**1. DNS Not Propagating**
```bash
# Check different DNS servers
nslookup yourdomain.com 8.8.8.8
nslookup yourdomain.com 1.1.1.1
```

**2. SSL Certificate Issues**
- Wait 24 hours for full propagation
- Check Vercel dashboard for certificate status
- Try force refresh: `vercel --prod`

**3. CORS Errors**
```javascript
// Update server CORS configuration
app.use(cors({
  origin: [
    'https://yourdomain.com',
    'https://www.yourdomain.com'
  ],
  credentials: true
}));
```

**4. API Connection Issues**
- Verify Railway environment variables
- Check API subdomain DNS
- Test API endpoint directly

### Debug Commands
```bash
# Check domain status
npm run setup-domain -- --check yourdomain.com

# Analyze bundle after domain setup
npm run analyze

# Performance test with new domain
npm run lighthouse
```

## Maintenance

### Domain Renewal
- Set calendar reminder 30 days before expiry
- Monitor domain status monthly

### SSL Certificate
- Vercel handles automatic renewal
- Monitor certificate expiry in dashboard

### Performance Monitoring
```bash
# Regular performance checks
npm run lighthouse
npm run analyze:size
```

## Deployment Checklist

- [ ] Domain purchased and DNS configured
- [ ] Vercel domain added and verified
- [ ] Railway environment variables updated
- [ ] SSL certificate active
- [ ] Redirects working (www → non-www)
- [ ] API endpoints accessible
- [ ] CORS configured properly
- [ ] Google Analytics updated
- [ ] Search Console configured
- [ ] Performance tested
- [ ] Error monitoring active

## Support

Jika mengalami masalah:
1. Check dokumentasi lengkap di `CUSTOM_DOMAIN_SETUP.md`
2. Run diagnostic: `npm run setup-domain -- --debug`
3. Check Vercel dan Railway logs
4. Contact support dengan error details

---

**Note:** Proses DNS propagation bisa memakan waktu 24-48 jam. Bersabar dan test secara berkala.