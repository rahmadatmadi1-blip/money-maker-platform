# 🚂 Railway Deployment Guide - Money Maker Platform Backend

## 🎯 **Kenapa Railway?**
- ✅ **$5 kredit gratis** setiap bulan
- ✅ **Tidak perlu kartu kredit** untuk signup
- ✅ **Deploy langsung dari GitHub**
- ✅ **Auto-sleep** untuk menghemat kredit
- ✅ **Interface yang user-friendly**

## 📋 **Persiapan**

### 1. **Pastikan Repository GitHub Siap**
- Repository: `money-maker-platform`
- Branch: `main`
- File `package.json` ada di root directory
- File `server/index.js` sebagai entry point

### 2. **Environment Variables yang Diperlukan**
```env
MONGODB_URI=mongodb+srv://rahmadafriyanto:MoneyMaker2024!@cluster0.mongodb.net/money-maker?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
JWT_EXPIRE=7d
PORT=3000
NODE_ENV=production
CLIENT_URL=https://money-maker-platform.vercel.app
```

## 🚀 **Langkah-Langkah Deployment**

### **Step 1: Daftar di Railway**
1. Buka https://railway.app
2. Klik **"Start a New Project"**
3. Login dengan **GitHub account**
4. Authorize Railway untuk akses repository

### **Step 2: Create New Project**
1. Klik **"New Project"**
2. Pilih **"Deploy from GitHub repo"**
3. Cari dan pilih repository **"money-maker-platform"**
4. Klik **"Deploy Now"**

### **Step 3: Konfigurasi Service**
1. Railway akan otomatis detect Node.js project
2. Tunggu initial deployment selesai (2-3 menit)
3. Klik pada service yang baru dibuat

### **Step 4: Set Environment Variables**
1. Di dashboard service, klik tab **"Variables"**
2. Tambahkan satu per satu:

```
MONGODB_URI = mongodb+srv://rahmadafriyanto:MoneyMaker2024!@cluster0.mongodb.net/money-maker?retryWrites=true&w=majority
JWT_SECRET = your-super-secret-jwt-key-here-make-it-long-and-random
JWT_EXPIRE = 7d
PORT = 3000
NODE_ENV = production
CLIENT_URL = https://money-maker-platform.vercel.app
```

### **Step 5: Configure Build & Start Commands**
1. Klik tab **"Settings"**
2. Scroll ke **"Build & Deploy"**
3. Set:
   - **Build Command**: `npm install`
   - **Start Command**: `node server/index.js`
4. Klik **"Save"**

### **Step 6: Generate Domain**
1. Klik tab **"Settings"**
2. Scroll ke **"Domains"**
3. Klik **"Generate Domain"**
4. Copy URL yang dihasilkan (contoh: `https://money-maker-backend-production.up.railway.app`)

### **Step 7: Redeploy**
1. Kembali ke tab **"Deployments"**
2. Klik **"Redeploy"** untuk apply environment variables
3. Tunggu deployment selesai (3-5 menit)

## ✅ **Verifikasi Deployment**

### **Test Endpoints**
1. **Health Check**: `https://your-railway-url.up.railway.app/api/test`
2. **Auth Endpoint**: `https://your-railway-url.up.railway.app/api/auth/register`

### **Expected Response**
```json
{
  "message": "Money Maker API is running!",
  "timestamp": "2024-01-XX",
  "environment": "production"
}
```

## 🔧 **Troubleshooting**

### **Build Gagal**
- Cek **"Build Logs"** di tab Deployments
- Pastikan `package.json` ada di root
- Pastikan semua dependencies terinstall

### **Start Command Error**
- Pastikan path `server/index.js` benar
- Cek struktur folder di repository
- Pastikan PORT environment variable di-set

### **Database Connection Error**
- Verify MONGODB_URI di tab Variables
- Pastikan MongoDB Atlas cluster aktif
- Cek network access di MongoDB Atlas

### **CORS Error**
- Pastikan CLIENT_URL sesuai dengan Vercel URL
- Cek CORS configuration di backend

## 💰 **Monitoring Kredit**

### **Cek Usage**
1. Klik **"Usage"** di sidebar
2. Monitor **"Execution Time"** dan **"Network"**
3. $5 kredit = ~750 jam runtime

### **Tips Menghemat Kredit**
- Service auto-sleep setelah tidak ada traffic
- Optimize database queries
- Gunakan caching jika memungkinkan

## 🔄 **Auto-Deploy dari GitHub**

Railway otomatis deploy setiap kali ada push ke branch `main`:
1. Push code ke GitHub
2. Railway detect changes
3. Auto-build dan deploy
4. Zero-downtime deployment

## 📊 **Monitoring & Logs**

### **View Logs**
1. Klik tab **"Logs"**
2. Real-time application logs
3. Filter by severity level

### **Metrics**
1. Tab **"Metrics"** untuk performance
2. CPU, Memory, Network usage
3. Response time monitoring

---

## 🎉 **Selesai!**

Backend Money Maker Platform sekarang running di Railway! 

**Next Steps:**
1. Update REACT_APP_API_URL di Vercel
2. Test full application flow
3. Monitor logs dan performance

**Railway URL Format:**
`https://[service-name]-production.up.railway.app`