# 🚀 Panduan Deployment Online - Money Maker Platform

## 📋 Overview
Kita akan deploy aplikasi Money Maker Platform secara online menggunakan:
- **Backend**: Railway (gratis dengan $5 kredit/bulan) <mcreference link="https://muhammadjufry.medium.com" index="5">5</mcreference>
- **Frontend**: Vercel (gratis untuk hobby projects) <mcreference link="https://refine.dev/blog/5-top-free-react-hosting-platforms/" index="4">4</mcreference>
- **Database**: MongoDB Atlas (sudah dikonfigurasi)

## 🎯 Langkah 1: Deploy Backend ke Railway

### A. Persiapan Repository
1. Pastikan semua perubahan sudah di-commit ke Git
2. Push ke GitHub repository

### B. Setup Railway
1. Buka https://railway.app
2. Sign up/Login dengan GitHub account
3. Klik "New Project" → "Deploy from GitHub repo"
4. Pilih repository "money-maker-platform"
5. Railway akan auto-detect Node.js project

### C. Environment Variables di Railway
Tambahkan environment variables berikut di Railway dashboard:

```env
MONGODB_URI=mongodb+srv://moneymaker-admin:MoneyMaker2024!@cluster0.mongodb.net/money-maker-db?retryWrites=true&w=majority
JWT_SECRET=money-maker-super-secret-jwt-key-production-2024-very-long-and-secure
JWT_EXPIRE=7d
PORT=3000
NODE_ENV=production
CLIENT_URL=https://money-maker-platform.vercel.app
PAYMENT_ENCRYPTION_KEY=payment-encryption-key-production-2024-super-secure-key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### D. Deployment Settings
- **Build Command**: `npm install`
- **Start Command**: `npm start` (akan menjalankan `node server.js`)
- **Root Directory**: `/` (root project)

## 🎯 Langkah 2: Deploy Frontend ke Vercel

### A. Persiapan
1. Install Vercel CLI: `npm install -g vercel`
2. Login ke Vercel: `vercel login`

### B. Deploy ke Vercel
1. Jalankan command: `cd client && vercel --prod`
2. Atau gunakan Vercel dashboard:
   - Import project dari GitHub
   - Pilih folder `client` sebagai root directory
   - Framework preset: Create React App

### C. Environment Variables di Vercel
Tambahkan di Vercel dashboard:

```env
REACT_APP_API_URL=https://your-railway-app.railway.app
REACT_APP_CLIENT_URL=https://money-maker-platform.vercel.app
REACT_APP_APP_NAME=Money Maker Platform
REACT_APP_VERSION=1.0.0
REACT_APP_ENVIRONMENT=production
```

**⚠️ PENTING**: Ganti `your-railway-app.railway.app` dengan URL Railway yang sebenarnya!

## 🎯 Langkah 3: Update CORS dan Client URL

Setelah mendapat URL Railway, update environment variables:

### Di Railway:
```env
CLIENT_URL=https://money-maker-platform.vercel.app
```

### Di Vercel:
```env
REACT_APP_API_URL=https://your-actual-railway-url.railway.app
```

## 🎯 Langkah 4: Testing

1. **Test Backend**: Buka `https://your-railway-url.railway.app/api/health`
2. **Test Frontend**: Buka `https://money-maker-platform.vercel.app`
3. **Test Payment**: Coba fitur pembayaran di halaman `/payments`

## 🔧 Troubleshooting

### CORS Issues
Jika ada CORS error, pastikan:
- `CLIENT_URL` di Railway sesuai dengan URL Vercel
- Tidak ada trailing slash di URL

### Database Connection
Jika database tidak connect:
- Pastikan MongoDB Atlas whitelist IP Railway
- Cek format `MONGODB_URI`

### Payment Issues
- Pastikan `PAYMENT_ENCRYPTION_KEY` sudah diset
- Cek Stripe keys (test/production)

## 📱 URLs Hasil Deployment

- **Frontend**: https://money-maker-platform.vercel.app
- **Backend**: https://your-railway-app.railway.app
- **API Docs**: https://your-railway-app.railway.app/api

## 💡 Tips

1. **Railway Sleep Mode**: Aplikasi akan sleep setelah tidak digunakan 30 menit
2. **Vercel Build Time**: Build React bisa memakan waktu 2-3 menit
3. **Environment Updates**: Setiap update env vars perlu redeploy
4. **Monitoring**: Gunakan Railway dashboard untuk monitoring logs

---

**🎉 Selamat! Aplikasi Money Maker Platform sudah online dan siap digunakan!**