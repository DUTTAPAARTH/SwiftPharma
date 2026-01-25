# 📖 SwiftPharma RX System — DEVELOPER GUIDE

## 🎯 Overview

This is a **complete, production-ready** Prescribed Medicines (RX) system for SwiftPharma, an online medicine delivery platform similar to Blinkit.

**What it does:**

- Users upload prescription images
- OCR extracts medicine names, doctor info, dosage
- System validates prescription (6-month expiry)
- Gating: Can't buy RX medicines without valid prescription
- Admin can review and approve prescriptions

---

## 🏗️ Architecture

### Stack

- **Backend:** Node.js + Express + MongoDB
- **Frontend:** React + Vite + Tailwind CSS
- **File Storage:** Cloudinary (cloud)
- **OCR Engine:** Tesseract.js
- **Authentication:** JWT + Cookies
- **Real-time:** Coming soon

---

## 📦 Installation & Setup

### Prerequisites

- Node.js v16+ (npm)
- MongoDB local (portable or installed)
- Cloudinary account (free tier works)

### Step 1: Clone & Install

```bash
cd c:\Users\PAARTH DUTTA\Downloads\SWIFTPHARMA

# Backend
cd server
npm install

# Frontend (in separate terminal)
cd ../client
npm install
```

### Step 2: Environment Variables

**`server/.env`:**

```env
MONGO_URI=mongodb://localhost:27017/swiftpharma
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
JWT_SECRET=your_secret_key
```

**`client/.env`:**

```env
VITE_API_URL=http://localhost:5000/api
```

### Step 3: Start Services

```powershell
# One-command startup (recommended)
powershell -ExecutionPolicy Bypass -File "start-rx-system.ps1"

# OR manual start:

# Terminal 1: MongoDB
cd c:\mongodb-portable\bin
.\mongod --dbpath=C:\data\db

# Terminal 2: Backend API
cd c:\Users\PAARTH DUTTA\Downloads\SWIFTPHARMA\server
node index.js

# Terminal 3: Frontend
cd c:\Users\PAARTH DUTTA\Downloads\SWIFTPHARMA\client
npm run dev
```

### Step 4: Verify

```bash
# Health check
curl http://localhost:5000/health
# Response: {"status":"ok"}

# Frontend
http://localhost:5173
```

---

## 🗄️ Database Schema

### Prescription Collection

```javascript
db.prescriptions.insertOne({
  userId: ObjectId("..."),
  images: ["https://cloudinary.com/...jpg", "https://cloudinary.com/...jpg"],
  ocrText: "Dr. Sharma\nParacetamol 500mg\n3x daily...",
  doctorName: "Dr. Sharma",
  doctorRegistration: "MCI12345",
  issueDate: ISODate("2024-12-10"),
  expiryDate: ISODate("2025-06-10"),
  isExpired: false,
  medicines: [
    {
      productId: ObjectId("..."),
      dosage: "500mg",
      frequency: "3x daily",
    },
  ],
  status: "approved", // pending | approved | rejected | invalid
  adminNotes: "Verified with doctor database",
  createdAt: ISODate("2024-12-10"),
  updatedAt: ISODate("2024-12-10"),
});
```

### Product Collection (Updated)

```javascript
db.products.updateOne(
  { _id: ObjectId("...") },
  {
    $set: {
      isRx: true,
      altGenerics: [ObjectId("..."), ObjectId("...")],
    },
  }
);
```

### Order Collection (Updated)

```javascript
db.orders.insertOne({
  user: ObjectId("..."),
  items: [
    {
      product: ObjectId("..."),
      quantity: 2,
      price: 120,
    },
  ],
  prescriptionId: ObjectId("..."), // NEW
  status: "Placed",
  address: "...",
  payment: { method: "upi", amount: 240 },
  createdAt: ISODate("2024-12-10"),
  updatedAt: ISODate("2024-12-10"),
});
```

---

## 🧠 Backend Logic

### Upload Prescription Flow

```
User Uploads Image
        ↓
Multer: Parse FormData
        ↓
Sharp: Auto-crop edges + normalize to PNG
        ↓
Tesseract.js: Run OCR on image
        ↓
Extract: Doctor name + date (regex)
        ↓
Cloudinary: Upload PNG to cloud
        ↓
MongoDB: Save Prescription doc
        ↓
Response: JSON with prescriptionId + medicines + expiry
```

**Code Flow:**

```javascript
// server/src/controllers/prescriptionController.js

export const uploadPrescription = async (req, res) => {
  // 1. Get files from req.files (multer)
  const files = req.files || [];

  // 2. For each file: crop + normalize
  const uploads = [];
  for (const [idx, file] of files.entries()) {
    const processed = await sharp(file.buffer)
      .trim()           // Auto-crop edges
      .png()            // Normalize to PNG
      .toBuffer();

    // 3. Upload to Cloudinary
    const uploaded = await uploadBufferToCloudinary(processed, `rx-${idx}`);
    uploads.push({ url: uploaded.secure_url, buffer: processed });
  }

  // 4. Run OCR on first image
  const primaryBuffer = uploads[0].buffer;
  const ocrText = await runOcr(primaryBuffer);

  // 5. Extract metadata (regex)
  const meta = extractMeta(ocrText);
  const issueDate = meta.issueDate || new Date();

  // 6. Save to MongoDB
  const prescription = await Prescription.create({
    userId: req.user._id,
    images: uploads.map(u => u.url),
    ocrText,
    doctorName: meta.doctorName,
    issueDate,
    expiryDate: issueDate + 6 months,  // Auto-expiry
    isExpired: false
  });

  // 7. Return response
  res.status(201).json({
    prescriptionId: prescription._id,
    expiryDate: prescription.expiryDate,
    ocrText: prescription.ocrText
  });
};
```

### Validation Flow

```javascript
export const validatePrescription = async (req, res) => {
  const prescription = await Prescription.findById(req.params.id);

  // Check if expired
  const now = new Date();
  const isExpired = prescription.expiryDate < now;

  // Calculate days left
  const daysLeft = Math.ceil(
    (prescription.expiryDate - now) / (1000 * 60 * 60 * 24)
  );

  // Near expiry? (30 days or less)
  const nearExpiry = !isExpired && daysLeft <= 30;

  // Update flag
  if (prescription.isExpired !== isExpired) {
    prescription.isExpired = isExpired;
    await prescription.save();
  }

  res.json({
    valid: !isExpired,
    nearExpiry,
    daysLeft,
    message: isExpired ? "Prescription expired" : "Prescription valid",
  });
};
```

### Order Validation

```javascript
export const createOrder = async (req, res) => {
  const { items, prescriptionId } = req.body;

  // 1. Get products from items
  const products = await Product.find({
    _id: { $in: items.map((i) => i.product) },
  });

  // 2. Check if any item requires RX
  const rxProducts = products.filter((p) => p.isRx || p.prescriptionRequired);

  if (rxProducts.length > 0) {
    // 3. Validate prescription
    const check = await matchPrescriptionForOrder(prescriptionId, req.user._id);

    if (!check.ok) {
      return res.status(400).json({ message: check.reason });
    }
  }

  // 4. Create order with prescriptionId
  const order = await Order.create({
    user: req.user._id,
    items,
    prescriptionId: prescriptionId || null,
    status: "Placed",
  });

  res.status(201).json(order);
};
```

---

## 💻 Frontend Logic

### Cart Validation

```jsx
// client/src/pages/Cart.jsx

const Cart = () => {
  const { items, hasRxItems, prescriptionId, setPrescriptionId } = useCart();
  const { activePrescription, validate } = usePrescription();
  const [rxStatus, setRxStatus] = useState("idle");

  // Check prescription validity when cart changes
  useEffect(() => {
    if (!hasRxItems) {
      setRxStatus("clear");
      return;
    }

    if (!activePrescription) {
      setRxStatus("missing");
      return;
    }

    // Validate active prescription
    (async () => {
      const result = await validate(activePrescription._id);
      if (result.valid) {
        setRxStatus(result.nearExpiry ? "near" : "valid");
        setPrescriptionId(activePrescription._id);
      } else {
        setRxStatus("expired");
        setPrescriptionId(null);
      }
    })();
  }, [hasRxItems, activePrescription]);

  // Block checkout if RX items without valid prescription
  const rxBlocked =
    hasRxItems && (rxStatus === "missing" || rxStatus === "expired");

  return (
    <div>
      {hasRxItems && <PrescriptionStatusCard status={rxStatus} />}

      <button disabled={rxBlocked}>
        {rxBlocked ? "Upload prescription to continue" : "Proceed to Checkout"}
      </button>
    </div>
  );
};
```

### Checkout Validation

```jsx
// client/src/pages/Checkout.jsx

const handlePay = async () => {
  // 1. Validate RX if needed
  if (hasRxItems) {
    const result = await validate(prescriptionId);
    if (!result.valid) {
      setError("Prescription expired. Re-upload first.");
      return;
    }
  }

  // 2. Create order with prescriptionId
  await createOrder({
    items,
    address,
    payment,
    prescriptionId: hasRxItems ? prescriptionId : null,
  });

  // 3. Redirect to orders
  navigate("/orders");
};
```

---

## 🎨 UI Components

### PrescriptionUpload Component

**File:** `client/src/components/forms/PrescriptionUpload.jsx`

**Props:**

```javascript
{
  onSubmit: (formData) => Promise,  // Called after upload
  loading: boolean                   // Show skeleton during OCR
}
```

**Features:**

- Drag & drop upload zone
- Multi-file selection (up to 5)
- Live image preview
- Manual doctor name & date entry
- Editable OCR text box
- Skeleton loader during extraction
- Save & Reset buttons

**Usage:**

```jsx
<PrescriptionUpload
  onSubmit={async (formData) => {
    const result = await uploadPrescription(formData);
    setActivePrescription(result);
  }}
  loading={loading}
/>
```

### PrescriptionStatusCard Component

**Displays:**

- Status: Valid ✅ / Near Expiry ⚠️ / Expired ❌
- Inline with cart items
- Color-coded badge

**Usage:**

```jsx
{
  hasRxItems && <PrescriptionStatusCard status="valid" />;
}
```

---

## 🔐 Authentication Flow

### Signup

```
User enters email + password
       ↓
Hash password (bcryptjs)
       ↓
Save User to MongoDB
       ↓
Generate JWT token
       ↓
Set httpOnly cookie + return token
```

### Login

```
User enters email + password
       ↓
Find user in MongoDB
       ↓
Compare password hash
       ↓
Generate JWT token
       ↓
Set httpOnly cookie + return token
```

### Protected Routes

```javascript
// server/src/middleware/authMiddleware.js

export const authenticate = (req, res, next) => {
  // Get token from Authorization header or cookie
  const token = req.headers.authorization?.split(" ")[1] || req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  // Verify token
  const decoded = verifyToken(token);
  req.user = decoded; // Add user to request
  next();
};

// Usage in routes
router.post(
  "/upload",
  authenticate,
  uploadPrescriptionFiles,
  uploadPrescription
);
```

---

## 📡 API Reference

### Authentication

#### Signup

```
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "user": { "id": "...", "email": "..." },
  "token": "eyJhbGc..."
}
```

#### Login

```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response: (same as signup)
```

### Prescriptions

#### Upload

```
POST /api/prescriptions/upload
Authorization: Bearer {token}
Content-Type: multipart/form-data

Files:
  images: [File1, File2, ...]
  doctorName: "Dr. Sharma" (optional)
  issueDate: "2024-12-10" (optional)

Response:
{
  "prescriptionId": "507f...",
  "expiryDate": "2025-06-10",
  "ocrText": "...",
  "medicines": [...]
}
```

#### Validate

```
GET /api/prescriptions/:id/validate
Authorization: Bearer {token}

Response:
{
  "valid": true,
  "nearExpiry": false,
  "daysLeft": 150,
  "message": "Prescription valid"
}
```

#### Get User Prescriptions

```
GET /api/prescriptions/user/:userId
Authorization: Bearer {token}

Response: [Prescription[], ...]
```

### Orders

#### Create Order

```
POST /api/orders
Authorization: Bearer {token}
Content-Type: application/json

{
  "items": [
    { "product": "507f...", "quantity": 2, "price": 120 }
  ],
  "address": "123 Main St",
  "payment": { "method": "upi", "amount": 240 },
  "prescriptionId": "507f..." (if RX items)
}

Response:
{
  "_id": "507f...",
  "user": "507f...",
  "items": [...],
  "status": "Placed",
  "prescriptionId": "507f..."
}
```

### Admin

#### List Prescriptions

```
GET /api/admin/prescriptions
Authorization: Bearer {admin-token}

Response: [Prescription[], ...]
```

#### Review Prescription

```
PATCH /api/prescriptions/:id/review
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "status": "approved|rejected|invalid",
  "adminNotes": "Doctor verified",
  "expiryDate": "2025-07-15" (optional)
}

Response: (updated Prescription)
```

---

## 🧪 Testing Guide

### Manual Testing

1. **Create Account**

   ```
   http://localhost:5173/auth
   Email: test@example.com
   Password: test123
   ```

2. **Browse Products**

   ```
   http://localhost:5173/categories
   Click "Amoxicillin 500" (RX product)
   ```

3. **Upload Prescription**

   ```
   Click "Upload Prescription"
   Drag image or select from file picker
   See OCR extraction
   Click "Save"
   ```

4. **Add to Cart**

   ```
   "Add to Cart" should now be enabled
   See quantity selector
   Click "Add"
   ```

5. **View Cart**

   ```
   http://localhost:5173/cart
   See "Prescription Status" card (green = valid)
   Click "Proceed to Checkout"
   ```

6. **Checkout**

   ```
   http://localhost:5173/checkout
   Click "Pay (Simulated UPI)"
   ```

7. **Admin Review**
   ```
   http://localhost:5173/admin/orders
   See prescription in list
   Click "Approve"
   ```

### API Testing (Postman)

1. **Signup**

   ```
   POST http://localhost:5000/api/auth/signup
   Body: { "email": "test@example.com", "password": "test123" }
   ```

2. **Upload Prescription**

   ```
   POST http://localhost:5000/api/prescriptions/upload
   Headers: Authorization: Bearer {token}
   Form-data: images: {file}
   ```

3. **Validate**
   ```
   GET http://localhost:5000/api/prescriptions/{id}/validate
   Headers: Authorization: Bearer {token}
   ```

---

## 🐛 Troubleshooting

### Issue: "Cannot find package 'cloudinary'"

**Fix:** `cd server && npm install cloudinary`

### Issue: "MongoDB connection failed"

**Fix:** Ensure MongoDB is running: `Get-Process mongod`

### Issue: "File upload fails"

**Fix:** Check Cloudinary credentials in `.env`

### Issue: "OCR is slow"

**Fix:** First run caches Tesseract binaries. Subsequent calls are fast.

### Issue: "Can't login after signup"

**Fix:** Check browser console for errors. Verify JWT_SECRET in `.env`

---

## 📚 Key Files Reference

| File                                                 | Purpose                  |
| ---------------------------------------------------- | ------------------------ |
| `server/src/models/Prescription.js`                  | Prescription schema      |
| `server/src/controllers/prescriptionController.js`   | Upload/validation logic  |
| `server/src/routes/prescriptionRoutes.js`            | RX endpoints             |
| `client/src/components/forms/PrescriptionUpload.jsx` | Upload UI component      |
| `client/src/context/PrescriptionContext.jsx`         | RX state management      |
| `client/src/pages/Cart.jsx`                          | Cart with RX gating      |
| `client/src/pages/Checkout.jsx`                      | Checkout with validation |

---

## 🚀 Deployment

### Production Checklist

- [ ] Update `.env` with production values
- [ ] Set `NODE_ENV=production`
- [ ] Update MongoDB URI to Atlas
- [ ] Update CORS origin to production domain
- [ ] Build frontend: `cd client && npm run build`
- [ ] Deploy backend to cloud (Heroku, Railway, etc.)
- [ ] Deploy frontend (Vercel, Netlify, etc.)
- [ ] Test all flows end-to-end

---

## 📞 Support

**Questions?** Check:

1. This guide (comprehensive)
2. `COPILOT_FINAL_PROMPT.md` (technical specs)
3. `QUICK_START.md` (quick reference)
4. Source code comments

---

**Status:** ✅ Production Ready  
**Last Updated:** December 10, 2025
