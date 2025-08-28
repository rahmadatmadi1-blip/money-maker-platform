# Panduan Setup Stripe Production Mode

## 🚀 Langkah-langkah Aktivasi Stripe Live Keys

### 1. **Persiapan Akun Stripe**

#### A. Login ke Dashboard Stripe
- Buka [https://dashboard.stripe.com](https://dashboard.stripe.com)
- Login dengan akun Stripe Anda
- Pastikan akun sudah diverifikasi untuk live payments

#### B. Aktivasi Live Mode
- Di dashboard Stripe, toggle dari "Test mode" ke "Live mode"
- Lengkapi informasi bisnis yang diperlukan:
  - Business details
  - Bank account information
  - Tax information
  - Identity verification

### 2. **Mendapatkan Live API Keys**

#### A. Secret Key (Backend)
```bash
# Format: sk_live_...
STRIPE_SECRET_KEY=sk_live_your_actual_live_secret_key
```

#### B. Publishable Key (Frontend)
```bash
# Format: pk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_your_actual_live_publishable_key
```

#### C. Webhook Secret
1. Buka Stripe Dashboard > Developers > Webhooks
2. Create endpoint untuk production:
   - URL: `https://money-maker-backend-production.up.railway.app/api/payments/webhook`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`
3. Copy webhook signing secret:
```bash
STRIPE_WEBHOOK_SECRET=whsec_your_actual_webhook_secret
```

### 3. **Update Environment Variables**

#### A. Railway (Backend)
1. Login ke [Railway Dashboard](https://railway.app)
2. Pilih project "money-maker-backend"
3. Go to Variables tab
4. Add/Update:
```bash
STRIPE_SECRET_KEY=sk_live_your_actual_live_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_actual_live_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_actual_webhook_secret
```

#### B. Vercel (Frontend)
1. Login ke [Vercel Dashboard](https://vercel.com)
2. Pilih project "money-maker-platform"
3. Go to Settings > Environment Variables
4. Add:
```bash
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_your_actual_live_publishable_key
```

### 4. **Update File Konfigurasi Lokal**

#### A. Update .env.production
```bash
# Tambahkan ke .env.production
STRIPE_SECRET_KEY=sk_live_your_actual_live_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_actual_live_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_actual_webhook_secret
```

#### B. Update client/.env.production
```bash
# Tambahkan ke client/.env.production
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_your_actual_live_publishable_key
```

### 5. **Testing Production Setup**

#### A. Test Payment Flow
1. Gunakan kartu kredit real (bukan test cards)
2. Test dengan amount kecil ($0.50 - $1.00)
3. Verifikasi webhook events di Stripe Dashboard

#### B. Monitor Transactions
- Check Stripe Dashboard > Payments
- Verify webhook delivery di Developers > Webhooks
- Monitor application logs di Railway

### 6. **Security Checklist**

- ✅ Pastikan live keys tidak ter-commit ke Git
- ✅ Gunakan environment variables untuk semua keys
- ✅ Enable webhook signature verification
- ✅ Set minimum payment amount ($0.50)
- ✅ Implement proper error handling
- ✅ Add rate limiting untuk payment endpoints

### 7. **Rollback Plan**

Jika ada masalah dengan live mode:
1. Switch kembali ke test keys di environment variables
2. Redeploy aplikasi
3. Test dengan test cards untuk memastikan functionality

### 8. **Monitoring & Alerts**

#### A. Setup Stripe Alerts
- Failed payments > 5% dalam 1 jam
- Webhook delivery failures
- Unusual payment patterns

#### B. Application Monitoring
- Monitor Railway logs untuk payment errors
- Setup uptime monitoring untuk payment endpoints
- Track payment success/failure rates

---

## 🔧 Commands untuk Deploy

```bash
# 1. Update environment variables di Railway dan Vercel
# 2. Redeploy backend
git add .
git commit -m "feat: activate Stripe live mode for production"
git push origin main

# 3. Redeploy frontend (otomatis via Vercel)
# 4. Test payment flow dengan real cards
```

## 📞 Support

Jika mengalami masalah:
1. Check Stripe Dashboard > Logs
2. Check Railway application logs
3. Verify webhook endpoint accessibility
4. Contact Stripe Support jika diperlukan

---

**⚠️ PENTING**: Jangan pernah menggunakan live keys di development environment!