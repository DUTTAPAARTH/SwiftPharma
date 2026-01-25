# 🤖 AI Prescription Scanner - UX & Implementation Guide

**Date**: December 13, 2025  
**Version**: 1.0  
**Status**: Production Ready ✅

---

## 📋 TABLE OF CONTENTS

1. [User Experience Flow (UX)](#user-experience-flow)
2. [Technical Data Flow](#technical-data-flow)
3. [API Response Format](#api-response-format)
4. [Frontend Components](#frontend-components)
5. [Backend Processing](#backend-processing)
6. [Error Handling](#error-handling)
7. [Testing Guide](#testing-guide)

---

## 🎯 USER EXPERIENCE FLOW

### **Step 1: Upload**

**What the user sees**:

```
┌─────────────────────────────────────────┐
│  🤖 AI-Powered Scanner                 │
│                                         │
│  Prescription Scanner                   │
│  Upload your prescription and let AI    │
│  extract medicine details automatically │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │          📄                     │   │
│  │  Drop prescription image here   │   │
│  │  or click to browse files       │   │
│  │  Supports JPG, PNG • Max 10MB   │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**What happens**:

1. User clicks or drags image
2. File validated (JPG/PNG, <10MB)
3. Preview shown with "Start AI Scan" button
4. User clicks "Start AI Scan"

---

### **Step 2: Scanning (Loading State)**

**What the user sees**:

```
┌─────────────────────────────────────────┐
│                                         │
│      🔄 Spinning loader animation       │
│                                         │
│  AI is analyzing your prescription...   │
│  This may take a few moments            │
│                                         │
│      ⚫ ⚫ ⚫  (bouncing dots)            │
│                                         │
└─────────────────────────────────────────┘
```

**Backend activity**:

1. Image uploaded to `uploads/prescriptions/`
2. Image preprocessed (grayscale, normalize, sharpen)
3. GPT-4 Vision API called (if API key configured)
4. AI returns JSON with medicines
5. If AI fails → Tesseract OCR fallback
6. Prescription record saved to MongoDB

**Time**: 3-10 seconds (depending on network/API speed)

---

### **Step 3: Results View - Editable Medicine List**

**What the user sees** (Success case):

```
┌──────────────────────────────────────────────────────┐
│ ✅ Found 3 medicines (AI-powered analysis)           │
│                                                      │
│ 🧠 AI Analysis                                       │
│ ├─ Patient: John Doe                                 │
│ ├─ Diagnosis: Fever & Cough                          │
│ └─ Instructions: Take with water after food          │
│                                                      │
│ 👨‍⚕️ Dr. Smith Reg: MC12345                            │
│ Issue Date: 2025-12-13                               │
│                                                      │
│ Medicines to Review (3 selected)                     │
│ ┌──────────────────────────────────────────────────┐ │
│ │ ☑ Paracetamol 500mg                             │ │
│ │   Tablet | 1-0-1 | 5 days                        │ │
│ │   ❌ Remove                                       │ │
│ └──────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────┐ │
│ │ ☑ Amoxicillin 250mg                             │ │
│ │   Capsule | 1-1-1 | 7 days (After food)        │ │
│ │   ❌ Remove                                       │ │
│ └──────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────┐ │
│ │ ☑ Cough Syrup (DXM 10mg/5ml)                    │ │
│ │   Syrup | 2 spoons twice daily | 5 days        │ │
│ │   ❌ Remove                                       │ │
│ └──────────────────────────────────────────────────┘ │
│                                                      │
│ [Scan Another] [Add 3 to Cart →]                    │
└──────────────────────────────────────────────────────┘
```

**Features in Results View**:

✅ **Checkbox**: Toggle medicine selection
➕ **Quantity**: Adjust quantity before adding
✏️ **Edit**: (Future) Manually edit dosage/frequency
❌ **Remove**: Remove unwanted medicines
🤖 **AI Badge**: Shows "🤖 Analyzed using GPT-4 Vision AI"
⚠️ **Drug Warnings**: Color-coded interaction warnings

---

### **Step 4: Add to Cart**

**What happens**:

1. User clicks "Add N to Cart"
2. Only SELECTED medicines added
3. Redirect to `/cart` page
4. Medicines pre-filled in cart

```javascript
Cart Item Structure:
{
  id: "med-1702488000000-0.123",
  name: "Paracetamol 500mg",
  price: 0,
  quantity: 1,
  isRx: true,
  prescriptionId: "mongo-id-here",
  dosage: "Tablet",
  frequency: "1-0-1",
  duration: "5 days",
  notes: ""
}
```

---

### **Error Cases**

**Case 1: No Text Detected**

```
┌──────────────────────────────────────────┐
│ 🔍 No medicines detected                 │
│                                          │
│ We couldn't extract medicine information │
│ from this image. Please try uploading a  │
│ clearer photo or enter medicines manually│
│                                          │
│ [Try Another Image] [Start Over]         │
└──────────────────────────────────────────┘
```

**Case 2: Network Error**

```
┌──────────────────────────────────────────┐
│ ⚠️  Error                                │
│                                          │
│ Failed to scan prescription. Please try  │
│ again.                                   │
│                                          │
│ [✕ Dismiss]                             │
└──────────────────────────────────────────┘
```

---

## 🔄 TECHNICAL DATA FLOW

### **Request → Backend → Response**

```
STEP 1: Frontend Request
┌────────────────────────────┐
│ POST /api/ai/scan-prescription
│ Headers:
│   - Authorization: Bearer <JWT_TOKEN>
│   - Content-Type: multipart/form-data
│
│ Body:
│   - image: <File>
└────────────────────────────┘
         ↓
STEP 2: Backend Processing
┌────────────────────────────┐
│ aiScanController.js
│ 1. Validate file
│ 2. Preprocess image (sharp)
│ 3. Call AI or OCR
│ 4. Normalize medicines
│ 5. Save to MongoDB
│ 6. Return structured response
└────────────────────────────┘
         ↓
STEP 3: Frontend Receives
┌────────────────────────────┐
│ {
│   success: true,
│   prescriptionId: "...",
│   medicines: [...],
│   aiAnalysis: {...},
│   drugInteractions: {...},
│   extractionMethod: "ai" | "ocr"
│ }
└────────────────────────────┘
         ↓
STEP 4: Display Results
┌────────────────────────────┐
│ - Show success banner
│ - Display AI analysis info
│ - Show drug warnings
│ - List editable medicines
│ - Enable add to cart
└────────────────────────────┘
```

---

## 📡 API RESPONSE FORMAT

### **Success Response (200 OK)**

```json
{
  "success": true,
  "prescriptionId": "507f1f77bcf86cd799439011",
  "imageUrl": "/uploads/prescriptions/ai-scan-1702488000000-rx.jpg",
  "medicines": [
    {
      "id": "med-1702488000000-0.123",
      "name": "Paracetamol 500mg",
      "strength": "500mg",
      "dosage": "Tablet",
      "frequency": "1-0-1",
      "duration": "5 days",
      "quantity": 10,
      "notes": "Take with water",
      "warnings": []
    },
    {
      "id": "med-1702488000001-0.456",
      "name": "Amoxicillin 250mg",
      "strength": "250mg",
      "dosage": "Capsule",
      "frequency": "1-1-1",
      "duration": "7 days",
      "quantity": 21,
      "notes": "Take after food",
      "warnings": ["May cause allergic reaction"]
    }
  ],
  "doctor": {
    "name": "Dr. Smith",
    "reg_no": "MC/5678"
  },
  "issueDate": "2025-12-13T00:00:00Z",
  "expiryDate": "2026-06-13T00:00:00Z",
  "aiAnalysis": {
    "patientName": "John Doe",
    "diagnosis": "Fever & Cough",
    "instructions": "Take medicines with water, avoid dairy",
    "source": "gpt-4-vision"
  },
  "drugInteractions": {
    "hasInteractions": false,
    "interactions": [],
    "generalWarnings": []
  },
  "extractionMethod": "ai",
  "message": "Found 2 medicines (AI-powered analysis)"
}
```

### **Error Responses**

**422 - No Text Detected**

```json
{
  "success": false,
  "message": "Unable to extract text from image. Please upload a clearer image with readable text.",
  "imageUrl": "/uploads/prescriptions/...",
  "code": "NO_TEXT_DETECTED"
}
```

**422 - No Medicines Found**

```json
{
  "success": false,
  "message": "No medicines detected. Please ensure the prescription is clear and readable.",
  "imageUrl": "/uploads/prescriptions/...",
  "code": "NO_MEDICINES_FOUND"
}
```

**401 - Not Authenticated**

```json
{
  "success": false,
  "message": "Please log in to upload prescriptions",
  "code": "AUTH_REQUIRED"
}
```

---

## 🎨 FRONTEND COMPONENTS

### **AIPrescriptionScanner.jsx** (Main Component)

**State Management**:

```javascript
const [file, setFile] = useState(null); // Selected file
const [preview, setPreview] = useState(null); // Image preview URL
const [loading, setLoading] = useState(false); // Loading state
const [error, setError] = useState(null); // Error message
const [results, setResults] = useState(null); // API response
const [medicines, setMedicines] = useState([]); // Editable medicines list
```

**Key Functions**:

1. **handleFileSelect(file)**

   - Validates file type (JPG/PNG)
   - Checks file size (<10MB)
   - Sets preview

2. **handleScan()**

   - Calls `/api/ai/scan-prescription`
   - Normalizes response
   - Updates state

3. **toggleMedicine(index)**

   - Toggle checkbox for medicine
   - Updates selected property

4. **removeMedicine(index)**

   - Removes medicine from list

5. **addSelectedToCart()**
   - Filters selected medicines
   - Adds to cart via useCart hook
   - Redirects to `/cart`

---

## ⚙️ BACKEND PROCESSING

### **aiScanController.js** - Flow

```javascript
scanPrescription(req, res):
  ↓
1. Validate file
  ├─ Check file exists
  ├─ Check MIME type
  └─ Check file size
  ↓
2. Preprocess image
  ├─ Rotate
  ├─ Grayscale
  ├─ Normalize
  ├─ Sharpen
  └─ Convert to PNG
  ↓
3. Try AI Analysis (GPT-4 Vision)
  ├─ Convert image to base64
  ├─ Call OpenAI API
  ├─ Parse JSON response
  ├─ Validate & normalize medicines
  └─ Check drug interactions
  ↓
4. Fallback to OCR if AI fails
  ├─ Use Tesseract.js
  ├─ Parse text with regex
  └─ Extract medicines
  ↓
5. Save to MongoDB
  ├─ Create Prescription record
  ├─ Store medicines list
  ├─ Link to user (req.user.id)
  └─ Set status: "pending"
  ↓
6. Return normalized response
  ├─ Medicines array
  ├─ AI analysis info
  ├─ Drug interactions
  └─ Extraction method
```

---

## 🛡️ ERROR HANDLING

### **Frontend Error Handling**

| Error              | Code               | Action                         |
| ------------------ | ------------------ | ------------------------------ |
| File not selected  | -                  | Show inline message            |
| Invalid file type  | -                  | Show alert + clear file        |
| File too large     | -                  | Show alert + clear file        |
| No text detected   | NO_TEXT_DETECTED   | Show error card + retry option |
| No medicines found | NO_MEDICINES_FOUND | Show empty state + retry       |
| Network error      | ECONNREFUSED       | Show error + retry button      |
| Auth token expired | TOKEN_EXPIRED      | Redirect to login              |
| Not authenticated  | AUTH_REQUIRED      | Redirect to login              |

### **Backend Error Handling**

| Scenario               | Status | Response                        |
| ---------------------- | ------ | ------------------------------- |
| File upload fails      | 400    | "No file uploaded"              |
| File not saved         | 500    | "Upload failed: file not saved" |
| OCR text empty         | 422    | "Unable to extract text"        |
| No medicines extracted | 422    | "No medicines detected"         |
| Not logged in          | 401    | "Please log in to upload"       |
| Server error           | 500    | error.message                   |

---

## 🧪 TESTING GUIDE

### **Test Case 1: Happy Path (AI Success)**

**Preconditions**:

- User logged in ✅
- OpenAI API key configured ✅
- Test prescription image available ✅

**Steps**:

1. Click "Upload Prescription"
2. Select clear prescription image
3. Click "Start AI Scan"
4. Wait for results (5-10 seconds)

**Expected**:

- ✅ Loading animation shows
- ✅ Results display in 5-10 seconds
- ✅ AI badge shows "🤖 Analyzed using GPT-4 Vision"
- ✅ Medicines list populated
- ✅ Can select/deselect medicines
- ✅ Can add to cart

---

### **Test Case 2: OCR Fallback**

**Preconditions**:

- OpenAI API key NOT configured ❌
- Tesseract.js working ✅

**Steps**:

1. Upload prescription
2. Click "Start AI Scan"
3. Wait for results

**Expected**:

- ✅ Falls back to Tesseract OCR
- ✅ Badge shows "OCR-based extraction"
- ✅ Medicines still extracted
- ✅ Lower accuracy expected

---

### **Test Case 3: No Text Detected**

**Preconditions**:

- Upload blurry or blank image

**Steps**:

1. Upload invalid image
2. Click "Start AI Scan"

**Expected**:

- ✅ Error message shown
- ✅ Code: NO_TEXT_DETECTED
- ✅ "Try Another Image" button works
- ✅ User can retry

---

### **Test Case 4: Unauthenticated Request**

**Preconditions**:

- User NOT logged in
- JWT token invalid/expired

**Steps**:

1. Upload prescription without token
2. Intercept API call

**Expected**:

- ✅ 401 Unauthorized
- ✅ Code: AUTH_REQUIRED
- ✅ Redirect to login

---

### **cURL Commands for Testing**

**Test prescription scan (with auth)**:

```bash
curl -X POST http://localhost:5000/api/ai/scan-prescription \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@prescription.jpg"
```

**Check health**:

```bash
curl http://localhost:5000/health
```

---

## 📊 RESPONSE SCHEMA

### **MedicineObject**

```typescript
interface MedicineObject {
  id: string; // Unique ID
  name: string; // Medicine name (e.g., "Paracetamol")
  strength: string; // Strength (e.g., "500mg")
  dosage: string; // Form (e.g., "Tablet", "Capsule")
  frequency: string; // Frequency (e.g., "1-0-1")
  duration: string; // Duration (e.g., "5 days")
  quantity: number; // Quantity extracted
  notes: string; // Special notes (e.g., "Take with water")
  warnings: string[]; // Warnings array
}
```

### **AIAnalysisObject**

```typescript
interface AIAnalysisObject {
  patientName: string | null; // Extracted patient name
  diagnosis: string | null; // Extracted diagnosis
  instructions: string | null; // Special instructions
  source: "gpt-4-vision" | "ocr"; // Extraction source
}
```

### **DrugInteractionObject**

```typescript
interface DrugInteractionObject {
  hasInteractions: boolean;
  interactions: Array<{
    medicines: string[]; // Medicines involved
    severity: "minor" | "moderate" | "severe";
    description: string; // Interaction description
    recommendation: string; // Clinical recommendation
  }>;
  generalWarnings: string[]; // General warnings
}
```

---

## 🚀 DEPLOYMENT CHECKLIST

- ✅ Middleware order fixed (upload → authenticate)
- ✅ Response schema normalized
- ✅ Error codes added (NO_TEXT_DETECTED, NO_MEDICINES_FOUND)
- ✅ Frontend handles all error cases
- ✅ OpenAI API integration tested
- ✅ Tesseract OCR fallback working
- ✅ MongoDB records saving correctly
- ✅ Cart integration functional
- ✅ Authentication enforced
- ✅ Drug interaction checking active

---

## 📝 MIGRATION NOTES

### **From Old Implementation**

**What Changed**:

1. Middleware order: `upload → authenticate` (instead of `authenticate → upload`)
2. Response structure: All fields normalized and consistent
3. Error codes: Added specific codes for frontend handling
4. Medicine format: Standardized with `id`, `strength`, etc.
5. Validation: Rigorous null/undefined checks

**Breaking Changes**:

- API response shape changed
- Update frontend consumers of `/api/ai/scan-prescription`
- Cart integration requires new fields (dosage, frequency, etc.)

---

## 🔗 RELATED FILES

| File                                         | Purpose            |
| -------------------------------------------- | ------------------ |
| `server/src/controllers/aiScanController.js` | Main AI scan logic |
| `server/src/services/openaiService.js`       | OpenAI integration |
| `server/src/routes/aiScanRoutes.js`          | Route definitions  |
| `client/src/pages/AIPrescriptionScanner.jsx` | Main UI component  |
| `client/src/services/aiScanService.js`       | API client         |

---

**Last Updated**: December 13, 2025  
**Status**: ✅ Production Ready  
**Version**: 1.0
