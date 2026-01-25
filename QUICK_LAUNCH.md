# ⚡ SwiftPharma Quick Launch Commands

## 🚀 One-Command Launch (Copy & Paste)

### Windows PowerShell - Start Everything

```powershell
# ✅ Kill any existing processes
Get-Process node, mongod -ErrorAction SilentlyContinue | Stop-Process -Force 2>$null;

# ✅ Start MongoDB
Start-Process "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" `
  -ArgumentList "--dbpath C:\data\db" -WindowStyle Hidden;
Start-Sleep 2;

# ✅ Seed database
cd "C:\Users\PAARTH DUTTA\Downloads\SWIFTPHARMA\server"
node scripts/seedProducts.js

# ✅ Start Backend (in new window)
Start-Process powershell -ArgumentList `
  "-NoExit", `
  "-Command", `
  "cd 'C:\Users\PAARTH DUTTA\Downloads\SWIFTPHARMA\server'; npm start" `
  -WindowStyle Normal

# ✅ Start Frontend (in another new window)
Start-Process powershell -ArgumentList `
  "-NoExit", `
  "-Command", `
  "cd 'C:\Users\PAARTH DUTTA\Downloads\SWIFTPHARMA\client'; npm run dev -- --host" `
  -WindowStyle Normal

# ✅ Wait and open browser
Start-Sleep 5
Start-Process "http://localhost:5173"
```

---

## ✅ Verification Commands

### Check if services are running:

```powershell
# Check Backend
netstat -ano | Select-String '5000'  # Should show TCP listening

# Check Frontend
netstat -ano | Select-String '5173'  # Should show TCP listening

# Check MongoDB
Get-Process mongod  # Should show mongod process
```

### Test API:

```powershell
Invoke-RestMethod -Uri 'http://localhost:5000/api/products?limit=1' -Method Get | ConvertTo-Json
```

### Test Frontend:

```powershell
Invoke-WebRequest -Uri 'http://localhost:5173/' -UseBasicParsing
```

---

## 🌐 Access URLs

| Service      | URL                                | What to Do                        |
| ------------ | ---------------------------------- | --------------------------------- |
| Frontend     | http://localhost:5173              | Open in browser, browse products  |
| Backend      | http://localhost:5000              | API endpoint, don't open directly |
| API Products | http://localhost:5000/api/products | See all products as JSON          |
| Health Check | http://localhost:5000/health       | Verify backend is running         |

---

## 📊 What's Running

### Window 1: MongoDB

- Started in background (hidden)
- Listens on port 27017
- Database: `swiftpharma`

### Window 2: Backend API

- Express server on port 5000
- Connected to MongoDB
- Serving API endpoints

### Window 3: Frontend

- Vite dev server on port 5173
- React application
- Hot-reload enabled

---

## 🔥 Troubleshooting

### Backend not responding

```powershell
# Restart backend - press Ctrl+C in backend window, then:
npm start
```

### Frontend showing 404

```powershell
# Clear Vite cache and rebuild
rm -Recurse -Force node_modules/.vite
npm run dev -- --host
```

### Products not showing

```powershell
# Re-seed the database
cd server
node scripts/seedProducts.js
```

### Port already in use

```powershell
# Kill the process using that port (example: port 5000)
Get-Process | Where-Object {$_.Id -eq (Get-NetTCPConnection -LocalPort 5000).OwningProcess} | Stop-Process
```

---

## 📱 Product Categories

**Fever & Pain Relief** (2 products)

- Crocin 500mg - ₹32
- Dolo 650 - ₹45

**Diabetes Care** (2 products)

- Metformin 500mg - ₹28 (Rx)
- Glimiprex-M1 - ₹65 (Rx)

**Heart Health** (2 products)

- Atenolol 50 - ₹22 (Rx)
- Telmisartan 40 - ₹40 (Rx)

---

## 🎯 Next Steps

1. Open browser: **http://localhost:5173**
2. Browse product categories
3. Apply filters (brand, price, etc.)
4. View product details
5. Add to cart
6. Enjoy! 🎉

---

## 💾 Important Paths

```
Project Root: C:\Users\PAARTH DUTTA\Downloads\SWIFTPHARMA
Backend:      C:\Users\PAARTH DUTTA\Downloads\SWIFTPHARMA\server
Frontend:     C:\Users\PAARTH DUTTA\Downloads\SWIFTPHARMA\client
Database:     C:\data\db
MongoDB:      C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe
```

---

## ⏱️ Expected Startup Times

- MongoDB starts: 2-3 seconds
- Seed completes: <1 second
- Backend starts: 3-5 seconds
- Frontend starts: 5-8 seconds
- **Total**: ~15-20 seconds

---

## 🆘 Emergency Reset

If something goes wrong, run this to reset everything:

```powershell
# Kill all processes
Get-Process node, mongod -ErrorAction SilentlyContinue | Stop-Process -Force

# Delete database
Remove-Item -Recurse -Force C:\data\db

# Then run the full launch commands again
```

---

**System Status**: ✅ READY TO USE

Open **http://localhost:5173** and start shopping! 🛍️
