# 🚀 SwiftPharma System Startup Guide

## ✅ System Status: FULLY OPERATIONAL

All services are running and verified:

- ✅ MongoDB: Running on localhost:27017
- ✅ Backend API: Running on http://localhost:5000
- ✅ Frontend: Running on http://localhost:5173
- ✅ Database: Seeded with 6 products across 3 categories

---

## 🎯 How to Launch Everything (Fresh Start)

### Step 1: Start MongoDB (Background)

```powershell
Start-Process "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" `
  -ArgumentList "--dbpath C:\data\db" `
  -WindowStyle Hidden
Start-Sleep -Seconds 2
```

### Step 2: Seed the Database

```powershell
cd "C:\Users\PAARTH DUTTA\Downloads\SWIFTPHARMA\server"
node scripts/seedProducts.js
```

### Step 3: Start Backend API (New Window)

```powershell
Start-Process powershell -ArgumentList `
  "-NoExit", `
  "-Command", `
  "cd 'C:\Users\PAARTH DUTTA\Downloads\SWIFTPHARMA\server'; npm start" `
  -WindowStyle Normal
```

Expected output:

```
✅ MongoDB connected successfully
🚀 SwiftPharma API running on http://localhost:5000
📋 Health check: http://localhost:5000/health
```

### Step 4: Start Frontend Dev Server (New Window)

```powershell
Start-Process powershell -ArgumentList `
  "-NoExit", `
  "-Command", `
  "cd 'C:\Users\PAARTH DUTTA\Downloads\SWIFTPHARMA\client'; npm run dev -- --host" `
  -WindowStyle Normal
```

Expected output:

```
VITE v7.2.7  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  expose as local network:   http://[your-ip]:5173/
```

---

## 🌐 Access Points

| Service      | URL                                        | Status                |
| ------------ | ------------------------------------------ | --------------------- |
| Frontend     | http://localhost:5173                      | ✅ 200 OK             |
| Backend API  | http://localhost:5000                      | ✅ Listening          |
| Health Check | http://localhost:5000/health               | ✅ OK                 |
| Products API | http://localhost:5000/api/products?limit=3 | ✅ Returns 6 products |
| MongoDB      | localhost:27017                            | ✅ Running            |

---

## 📦 What Was Fixed & Verified

### ✅ Backend API

- **Status**: Fully operational
- **Port**: 5000 (0.0.0.0 binding)
- **Database**: Connected to MongoDB locally
- **Seed Data**: 6 products across 3 categories
  - Fever & Pain Relief: Crocin 500mg, Dolo 650
  - Diabetes Care: Metformin 500mg, Glimiprex-M1
  - Heart Health: Atenolol 50, Telmisartan 40

### ✅ Frontend Dev Server

- **Status**: Fully operational
- **Port**: 5173
- **Binding**: 0.0.0.0 (accessible from any interface)
- **Vite Version**: 7.2.7
- **Live Reload**: Enabled

### ✅ Database

- **MongoDB Version**: 8.2.3
- **Location**: C:\data\db
- **Collections**: categories, products
- **Products Seeded**: 6 with full details (name, brand, price, stock, category)

---

## 🔄 Filter System Status

### Fixed Issues:

- ✅ Filter defaults corrected (otcOnly now defaults to false)
- ✅ Brand filter logic working (Branded/Generic/All)
- ✅ Price range filter responsive
- ✅ Age group filter operational
- ✅ Product type filter functional

### Image Handling:

- ✅ Fallback to placeholder.com if external images fail
- ✅ Error handler added to img elements
- ✅ No broken image links

---

## 🛠️ Manual Verification Commands

### Test Backend API

```powershell
Invoke-RestMethod -Uri 'http://localhost:5000/api/products?limit=1' -Method Get | ConvertTo-Json
```

### Test Frontend Accessibility

```powershell
Invoke-WebRequest -Uri 'http://localhost:5173/' -UseBasicParsing
```

### Check Port Status

```powershell
netstat -ano | Select-String '5000'  # Backend
netstat -ano | Select-String '5173'  # Frontend
netstat -ano | Select-String '27017' # MongoDB
```

### Check Running Processes

```powershell
Get-Process | Where-Object {$_.ProcessName -like '*node*' -or $_.ProcessName -like '*mongod*'}
```

---

## ⚠️ Troubleshooting

### Backend Not Starting

- Check MongoDB is running: `Get-Process mongod`
- Verify .env file exists in `/server` directory
- Check port 5000 is not in use: `netstat -ano | Select-String '5000'`
- Run: `npm install` in server directory if dependencies missing

### Frontend Not Displaying

- Clear browser cache (Ctrl+Shift+Delete)
- Check Vite is on port 5173: `netstat -ano | Select-String '5173'`
- Verify API proxy in vite.config.js points to http://localhost:5000

### Images Not Loading

- Check browser console for CORS errors
- Verify placeholder.com is accessible
- Images fallback to placeholder if external source fails

### MongoDB Connection Issues

- Check MongoDB is running: `Get-Process mongod`
- Verify data directory exists: `Test-Path C:\data\db`
- Check MongoDB logs in background window
- Restart MongoDB: Kill process and restart

---

## 📋 Final Checklist

- [x] MongoDB running and connected
- [x] Database seeded with 6 products
- [x] Backend API listening on port 5000
- [x] Frontend dev server listening on port 5173
- [x] API responding with product data
- [x] Frontend accessible via browser
- [x] Filters functional with correct defaults
- [x] Image fallback handler in place
- [x] All routes properly bound
- [x] Error handlers configured

---

## 🎉 Ready to Use!

Your SwiftPharma application is now **fully launched and operational**!

Open your browser and navigate to: **http://localhost:5173**

Enjoy! 🚀
