# 🗄️ MongoDB Compass Connection Guide

## ✅ MongoDB Status

- **Version**: 8.2.3
- **Location**: C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe
- **Status**: ✅ RUNNING on port 27017
- **Database**: swiftpharma
- **Collections**: categories, products
- **Total Documents**: 9 (3 categories + 6 products)

---

## 📥 Installation

### Option 1: Download & Install Manually

1. Visit: https://www.mongodb.com/products/compass
2. Download "MongoDB Compass" (not the CLI version)
3. Run the installer
4. Choose installation location (default is fine)
5. Complete the installation

### Option 2: Install via Chocolatey (if you have it)

```powershell
choco install mongodb-compass
```

### Option 3: Install via winget

```powershell
winget install MongoDB.Compass
```

---

## 🔗 Connection Setup in Compass

### Step 1: Launch MongoDB Compass

- Find and click the MongoDB Compass icon on your desktop or start menu

### Step 2: Connection Screen

You'll see the "New Connection" dialog with these options:

**Connection String**:

```
mongodb://localhost:27017
```

(This is the default - you can leave it as is)

**Or use Advanced Connection Options**:

- Host: `localhost`
- Port: `27017`
- Username: (leave blank)
- Password: (leave blank)

### Step 3: Click "Connect"

That's it! You should now be connected to your local MongoDB instance.

---

## 📊 What You'll See After Connecting

### Database Structure:

```
Databases
└── swiftpharma
    ├── categories (Collection)
    │   └── 3 documents
    │       ├── {name: "Fever & Pain Relief", ...}
    │       ├── {name: "Diabetes Care", ...}
    │       └── {name: "Heart Health", ...}
    │
    └── products (Collection)
        └── 6 documents
            ├── {name: "Crocin 500mg", brand: "GSK", price: 32, ...}
            ├── {name: "Dolo 650", brand: "Micro Labs", price: 45, ...}
            ├── {name: "Metformin 500mg", brand: "USV", price: 28, ...}
            ├── {name: "Glimiprex-M1", brand: "Sun Pharma", price: 65, ...}
            ├── {name: "Atenolol 50", brand: "IPCA", price: 22, ...}
            └── {name: "Telmisartan 40", brand: "Cipla", price: 40, ...}
```

---

## 🎯 How to Use Compass

### Browse Collections

1. Click on **swiftpharma** → **products** to see all products
2. Click on **categories** to see all categories

### View Document Details

1. Click on any product or category document
2. Compass shows the full JSON structure

### Search/Filter

1. Click the **Filter** button
2. Enter a MongoDB query like: `{ "brand": "GSK" }`
3. Click **Apply** to filter

### Example Queries:

```javascript
// Find products under ₹50
{ "price": { "$lt": 50 } }

// Find Rx products only
{ "isRx": true }

// Find products by specific brand
{ "brand": "GSK" }

// Find products in stock
{ "stock": { "$gt": 0 } }
```

### Edit Documents

1. Click the pencil icon on any document
2. Make changes directly
3. Click **Update** to save

### Add New Documents

1. Click the **+ INSERT DOCUMENT** button
2. Write your document in JSON format
3. Click **Insert**

---

## 🔧 Compass Features You'll Love

✅ **Visual Data Browser** - See your data structure at a glance
✅ **Query Builder** - Build MongoDB queries visually
✅ **Schema Analysis** - Understand your data types
✅ **Document Editor** - Edit documents directly
✅ **Import/Export** - Backup your data
✅ **Performance Monitoring** - See database statistics
✅ **Server Status** - Monitor MongoDB health
✅ **Read/Write Performance** - Track database operations

---

## 🆘 Troubleshooting

### "Unable to Connect" Error

**Problem**: Compass can't connect to MongoDB

**Solutions**:

1. ✅ Make sure MongoDB is running

   ```powershell
   Get-Process mongod
   ```

2. ✅ Check the connection string is correct

   - Should be: `mongodb://localhost:27017`
   - Not: `mongodb://127.0.0.1:27017` (try this if localhost fails)

3. ✅ Verify port 27017 is listening

   ```powershell
   netstat -ano | Select-String '27017'
   ```

4. ✅ Restart MongoDB
   ```powershell
   Get-Process mongod | Stop-Process -Force
   Start-Process "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" `
     -ArgumentList "--dbpath C:\data\db" `
     -WindowStyle Hidden
   Start-Sleep 2
   ```

---

## 📝 Next Steps

1. **Install MongoDB Compass** from https://www.mongodb.com/products/compass
2. **Launch the application**
3. **Connect to**: `mongodb://localhost:27017`
4. **Explore your data** in the swiftpharma database
5. **View the 6 seeded products** in the products collection
6. **Browse the 3 categories** in the categories collection

---

## 🎓 Learning Resources

- Official Compass Docs: https://www.mongodb.com/docs/compass/current/
- MongoDB Query Language: https://www.mongodb.com/docs/manual/reference/operator/query/
- Compass Tutorials: https://www.mongodb.com/docs/compass/current/connect/

---

**Your MongoDB is ready for Compass!** 🚀

Once you connect, you'll be able to visually manage your SwiftPharma database and verify all your seeded products are there.
