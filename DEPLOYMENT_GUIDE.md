# 🚀 Panduan Deployment Money Maker Platform

## 📋 Persiapan Deployment

### Kredensial Akun:
- **Email**: rahmadatmadi1@gmail.com
- **Username**: rahmat atmadi
- **Password**: r@03071976

## 🌐 Frontend Deployment (Vercel)

### 1. Daftar ke Vercel
1. Buka https://vercel.com
2. Klik "Sign Up" dan pilih "Continue with GitHub"
3. Gunakan kredensial di atas untuk GitHub
4. Authorize Vercel untuk mengakses repositories

### 2. Deploy Frontend
1. Klik "New Project" di Vercel dashboard
2. Import repository `FB` (folder client)
3. Configure project:
   - **Framework Preset**: Create React App
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
4. Add Environment Variables:
   - `REACT_APP_API_URL`: `https://money-maker-backend.onrender.com`
5. Deploy!

## ⚙️ Backend Deployment (Render)

### 1. Daftar ke Render
1. Buka https://render.com
2. Klik "Get Started" dan pilih "GitHub"
3. Gunakan kredensial di atas untuk GitHub
4. Authorize Render untuk mengakses repositories

### 2. Setup Database
1. Di Render dashboard, klik "New +" → "PostgreSQL"
2. Nama: `money-maker-db`
3. Database Name: `moneymaker`
4. User: `moneymaker_user`
5. Region: pilih yang terdekat
6. Plan: **Free**
7. Create Database
8. **Simpan Connection String** dari dashboard

### 3. Deploy Backend
1. Klik "New +" → "Web Service"
2. Connect repository `FB`
3. Configure service:
   - **Name**: `money-maker-backend`
   - **Environment**: `Node`
   - **Region**: sama dengan database
   - **Branch**: `main`
   - **Root Directory**: `/` (root)
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `MONGODB_URI`: `[Connection String dari step 2]`
   - `JWT_SECRET`: `your-super-secret-jwt-key-production-2024`
   - `CLIENT_URL`: `https://[your-vercel-app].vercel.app`
   - `ADMIN_EMAIL`: `rahmadatmadi1@gmail.com`
   - `ADMIN_PASSWORD`: `r@03071976`
5. Deploy!

## 🔄 Update URLs Setelah Deployment

### 1. Update Frontend Environment
1. Di Vercel dashboard → Settings → Environment Variables
2. Update `REACT_APP_API_URL` dengan URL backend Render
3. Redeploy frontend

### 2. Update Backend CORS
1. Di Render dashboard → Environment Variables
2. Update `CLIENT_URL` dengan URL frontend Vercel
3. Redeploy backend

## ✅ Verifikasi Deployment

### Checklist:
- [ ] Frontend dapat diakses di URL Vercel
- [ ] Backend dapat diakses di URL Render
- [ ] Database terhubung (cek logs Render)
- [ ] CORS configured dengan benar
- [ ] Login admin berfungsi
- [ ] API endpoints merespons dengan benar

## 🛠️ Troubleshooting

### Frontend Issues:
- **Build Error**: Cek environment variables di Vercel
- **API Connection**: Pastikan `REACT_APP_API_URL` benar
- **Routing Issues**: Pastikan `vercel.json` sudah di-commit

### Backend Issues:
- **Database Connection**: Cek `MONGODB_URI` di environment variables
- **CORS Error**: Pastikan `CLIENT_URL` sesuai dengan URL Vercel
- **Port Issues**: Render menggunakan port 10000 secara default

## 💰 Biaya

- **Vercel Free Tier**: $0/bulan
  - 100 deployments/hari
  - 1M requests/bulan
  - 100GB bandwidth/bulan

- **Render Free Tier**: $0/bulan
  - 512MB RAM
  - 750 hours/bulan
  - PostgreSQL 1GB storage
  - Auto-sleep setelah 15 menit inaktif

**Total: $0/bulan** 🎉

## 🔗 URLs Setelah Deployment

- **Frontend**: https://[project-name].vercel.app
- **Backend**: https://money-maker-backend.onrender.com
- **Database**: Internal Render PostgreSQL

## 📞 Support

Jika ada masalah, cek:
1. Logs di Vercel/Render dashboard
2. Environment variables sudah benar
3. Repository sudah ter-push ke GitHub
4. Build commands sudah sesuai