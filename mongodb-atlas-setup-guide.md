# MongoDB Atlas Setup Guide - Langkah Selanjutnya

## Anda Sudah Masuk MongoDB Atlas! 🎉

Sekarang ikuti langkah-langkah berikut untuk menyelesaikan setup:

### 1. Lengkapi Form Personalisasi (Halaman Saat Ini)

**GETTING TO KNOW YOU:**
- **Primary Goal:** Pilih "Learn MongoDB" atau "Build a new application"
- **Experience with MongoDB:** Pilih sesuai pengalaman Anda (misal: "I'm new to MongoDB")

**GETTING TO KNOW YOUR PROJECT:**
- **Programming Language:** Pilih **"JavaScript"** atau **"Node.js"**
- **Data Types:** Pilih **"Relational"** dan **"Document"**

Kemudian klik **"Finish"** atau **"Continue"**

### 2. Buat Cluster Database

Setelah form selesai, Anda akan diarahkan ke dashboard:

1. **Pilih "Build a Database"** atau **"Create Cluster"**
2. **Pilih Plan:** Pilih **"M0 Sandbox (FREE)"**
3. **Cloud Provider:** Pilih **"AWS"**
4. **Region:** Pilih region terdekat (misal: Singapore ap-southeast-1)
5. **Cluster Name:** Biarkan default atau ganti dengan `money-maker-cluster`
6. Klik **"Create Cluster"**

### 3. Setup Database Access (Security)

#### A. Buat Database User:
1. Di sidebar kiri, klik **"Database Access"**
2. Klik **"Add New Database User"**
3. **Authentication Method:** Pilih **"Password"**
4. **Username:** `moneymaker-admin`
5. **Password:** Buat password yang kuat (simpan password ini!)
6. **Database User Privileges:** Pilih **"Read and write to any database"**
7. Klik **"Add User"**

#### B. Setup Network Access:
1. Di sidebar kiri, klik **"Network Access"**
2. Klik **"Add IP Address"**
3. Pilih **"Allow Access from Anywhere"** (0.0.0.0/0)
4. Klik **"Confirm"**

### 4. Dapatkan Connection String

1. Kembali ke **"Database"** di sidebar
2. Tunggu cluster selesai dibuat (status: hijau)
3. Klik tombol **"Connect"** pada cluster Anda
4. Pilih **"Connect your application"**
5. **Driver:** Pilih **"Node.js"**
6. **Version:** Pilih versi terbaru
7. **Copy connection string** yang muncul

**Format connection string:**
```
mongodb+srv://moneymaker-admin:<password>@money-maker-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

### 5. Siapkan Connection String untuk Render

Ganti `<password>` dengan password user yang Anda buat:
```
mongodb+srv://moneymaker-admin:PASSWORD_ANDA@money-maker-cluster.xxxxx.mongodb.net/money-maker-db?retryWrites=true&w=majority
```

**PENTING:** Tambahkan `/money-maker-db` sebelum tanda `?` untuk menentukan nama database.

### 6. Simpan Informasi Penting

**Catat informasi berikut untuk deployment:**
- ✅ MongoDB Connection String (sudah siap)
- ✅ Database Name: `money-maker-db`
- ✅ Username: `moneymaker-admin`
- ✅ Password: [password yang Anda buat]

---

## Langkah Selanjutnya

Setelah mendapatkan connection string:
1. **Deploy Backend ke Render** dengan environment variables
2. **Update Frontend di Vercel** dengan URL backend baru
3. **Test aplikasi** end-to-end

**Status:** 🔄 Sedang setup MongoDB cluster...

---

*Panduan ini dibuat otomatis untuk membantu deployment Money Maker Platform*