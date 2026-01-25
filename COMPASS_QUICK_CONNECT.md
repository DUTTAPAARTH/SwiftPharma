# 🔌 MongoDB Compass - Quick Connect

## ⚡ Connection Details

Copy this connection string and paste it into MongoDB Compass:

```
mongodb://localhost:27017
```

Or use these individual settings:

- **Host**: `localhost`
- **Port**: `27017`
- **Authentication**: None (leave empty)

---

## ✅ Verify MongoDB is Running

Before opening Compass, verify MongoDB is ready:

```powershell
netstat -ano | Select-String '27017'
```

**Expected Output:**

```
TCP    127.0.0.1:27017    0.0.0.0:0    LISTENING    [PID]
```

---

## 🗄️ What to Expect

Once connected, you'll see:

### Database: `swiftpharma`

**Collection: `categories`** (3 documents)

- Fever & Pain Relief
- Diabetes Care
- Heart Health

**Collection: `products`** (6 documents)

```json
{
  "_id": "...",
  "name": "Crocin 500mg Tablet",
  "brand": "GSK",
  "price": 32,
  "stock": 200,
  "category": "...",
  "prescriptionRequired": false,
  "isRx": false
}
```

And 5 more products:

- Dolo 650
- Metformin 500mg
- Glimiprex-M1
- Atenolol 50
- Telmisartan 40

---

## 📥 Download & Install Compass

**Option A: Direct Download**
https://www.mongodb.com/products/compass

**Option B: Windows Package Manager**

```powershell
winget install MongoDB.Compass
```

**Option C: Chocolatey**

```powershell
choco install mongodb-compass
```

---

## 🎯 Quick Steps

1. Install MongoDB Compass
2. Open MongoDB Compass
3. Paste connection string: `mongodb://localhost:27017`
4. Click **Connect**
5. Browse your data! 🎉

---

## 🆘 Can't Connect?

1. Check MongoDB is running:

   ```powershell
   Get-Process mongod
   ```

2. If not running, start it:

   ```powershell
   Start-Process "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" `
     -ArgumentList "--dbpath C:\data\db" `
     -WindowStyle Hidden
   ```

3. Try connection again with `mongodb://127.0.0.1:27017` if localhost fails

---

**MongoDB Compass is the visual way to manage your SwiftPharma database!** 🗄️
