# OpenAI Integration - Setup Guide

## 🤖 AI-Powered Prescription Analysis

SwiftPharma now uses **OpenAI GPT-4 Vision** to intelligently analyze prescriptions with high accuracy.

---

## ✨ Features

### 1. **GPT-4 Vision Analysis**

- Intelligent text extraction from prescriptions
- Accurate medicine name recognition (including handwriting)
- Automatic dosage, frequency, and duration extraction
- Doctor information parsing
- Patient name and diagnosis detection

### 2. **Drug Interaction Checking**

- AI-powered drug interaction analysis
- Severity levels: Minor / Moderate / Severe
- Clinical recommendations
- General safety warnings

### 3. **Automatic Fallback**

- If OpenAI API not configured: Falls back to Tesseract OCR
- Seamless user experience
- No breaking changes

---

## 🚀 Setup Instructions

### Step 1: Get OpenAI API Key

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Navigate to **API Keys** section
4. Click **Create new secret key**
5. Copy the API key (starts with `sk-...`)

### Step 2: Add API Key to Environment

Edit `server/.env` file:

```env
# Add this line
OPENAI_API_KEY=sk-your-api-key-here
```

### Step 3: Restart Server

```bash
cd server
npm install  # OpenAI package already installed
node src/server.js
```

---

## 📊 How It Works

### Prescription Analysis Flow:

```
1. User uploads prescription image
   ↓
2. System tries GPT-4 Vision first
   ↓
3a. If API key configured:
    - Send image to GPT-4 Vision
    - Get structured JSON response
    - Extract medicines, doctor info, dates
    - Check drug interactions
    - Return AI analysis results
   ↓
3b. If no API key:
    - Fallback to Tesseract OCR
    - Use regex parsing
    - Return basic extraction
   ↓
4. Display results to user with:
    - AI analysis badge
    - Drug interaction warnings
    - Medicine details
    - Doctor information
```

---

## 💰 Cost Estimate

### OpenAI Pricing (as of Dec 2024):

**GPT-4o Vision (recommended)**:

- Input: $2.50 per 1M tokens
- Output: $10.00 per 1M tokens
- **Average cost per prescription**: ~$0.01 - $0.03

**GPT-4o-mini (cheaper)**:

- Input: $0.15 per 1M tokens
- Output: $0.60 per 1M tokens
- **Average cost per prescription**: ~$0.001 - $0.005

### Monthly Cost Example:

- 100 prescriptions/month: **~$1-3**
- 1,000 prescriptions/month: **~$10-30**
- 10,000 prescriptions/month: **~$100-300**

---

## 🧪 Testing

### Test without API Key (Free):

```bash
# Leave OPENAI_API_KEY empty in .env
# System will use Tesseract OCR
```

### Test with API Key (Paid):

```bash
# Add OPENAI_API_KEY to .env
# System will use GPT-4 Vision
```

### How to Verify AI is Working:

1. Upload a prescription
2. Check the success message:
   - "AI-powered analysis" = Using OpenAI ✅
   - "OCR-based extraction" = Using Tesseract ⚠️
3. Look for the 🤖 badge showing "Analyzed using GPT-4 Vision AI"

---

## 📋 API Response Format

### AI Analysis Response:

```json
{
  "success": true,
  "prescriptionId": "...",
  "medicines": [
    {
      "name": "Paracetamol 500mg",
      "dosage": "Tablet",
      "frequency": "1-0-1",
      "duration": "5 days",
      "quantity": 10,
      "selected": true
    }
  ],
  "doctor": {
    "name": "Dr. John Smith",
    "reg_no": "MCI12345"
  },
  "aiAnalysis": {
    "patientName": "Jane Doe",
    "diagnosis": "Fever and headache",
    "instructions": "Take after meals",
    "source": "gpt-4-vision"
  },
  "drugInteractions": {
    "hasInteractions": true,
    "interactions": [
      {
        "medicines": ["Medicine A", "Medicine B"],
        "severity": "moderate",
        "description": "May increase drowsiness",
        "recommendation": "Avoid driving"
      }
    ],
    "generalWarnings": ["Consult doctor if symptoms persist"]
  },
  "extractionMethod": "ai",
  "message": "Found 3 medicines (AI-powered analysis)"
}
```

---

## 🔧 Configuration Options

### In `server/src/services/openaiService.js`:

**Change AI Model:**

```javascript
model: "gpt-4o",  // Most accurate
// OR
model: "gpt-4o-mini",  // Cheaper, faster
```

**Adjust Temperature:**

```javascript
temperature: 0.1,  // More consistent (recommended for medical)
// OR
temperature: 0.5,  // More creative
```

**Change Max Tokens:**

```javascript
max_tokens: 2000,  // Current (handles complex prescriptions)
// OR
max_tokens: 1000,  // Lower cost, simpler prescriptions
```

---

## 🛡️ Security & Privacy

### Data Handling:

- Images sent to OpenAI API over HTTPS
- OpenAI does NOT use API data for training (Enterprise tier)
- No patient data stored by OpenAI
- Prescription images stored locally on your server
- HIPAA compliance possible with OpenAI Business Associate Agreement

### Best Practices:

1. Use environment variables for API keys (✅ Already implemented)
2. Never commit `.env` file to Git
3. Rotate API keys regularly
4. Monitor API usage in OpenAI dashboard
5. Set spending limits in OpenAI account

---

## 📈 Monitoring

### Check API Usage:

1. Go to [platform.openai.com/usage](https://platform.openai.com/usage)
2. View daily/monthly costs
3. Set budget alerts

### Server Logs:

```bash
# Watch logs for AI analysis
cd server
npm run dev

# Look for:
[AI] Analyzing prescription with GPT-4 Vision...
[AI] Successfully extracted: 3 medicines
[AI] Checking drug interactions...
```

---

## 🐛 Troubleshooting

### "AI analysis failed or not configured"

- **Cause**: No OpenAI API key or invalid key
- **Solution**: Add valid API key to `.env`

### "Rate limit exceeded"

- **Cause**: Too many API calls
- **Solution**: Upgrade OpenAI plan or wait

### "Insufficient quota"

- **Cause**: OpenAI account has no credits
- **Solution**: Add payment method to OpenAI account

### AI returns poor results

- **Cause**: Low quality image
- **Solution**: Ask user to upload clearer photo

---

## 🚀 Production Deployment

### Environment Variables:

```env
# Production .env
OPENAI_API_KEY=sk-prod-key-here
NODE_ENV=production
```

### Rate Limiting:

Consider adding rate limiting to prevent abuse:

```javascript
// In server/src/routes/aiScanRoutes.js
import rateLimit from "express-rate-limit";

const scanLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per IP
  message: "Too many scans, please try again later"
});

router.post("/scan-prescription", scanLimiter, authenticate, ...);
```

---

## 📚 Further Enhancements

### Possible Future Features:

1. **Medicine Autocomplete** - Suggest medicine names as user types
2. **Dosage Validation** - Check if prescribed dosage is safe
3. **Alternative Suggestions** - Recommend generic alternatives
4. **Prescription History Analysis** - Analyze patterns over time
5. **Multi-language Support** - Analyze prescriptions in Hindi, Bengali, etc.

---

## ✅ Summary

**Without OpenAI API Key:**

- ✅ Still works (Tesseract OCR fallback)
- ⚠️ Lower accuracy
- ❌ No drug interaction checking
- ❌ No AI analysis

**With OpenAI API Key:**

- ✅ High accuracy medicine extraction
- ✅ Handwriting recognition
- ✅ Drug interaction warnings
- ✅ Patient & diagnosis info
- ✅ AI-powered analysis
- 💰 Small cost per prescription (~$0.01-0.03)

**Recommendation**: Add OpenAI API key for production to provide best user experience!

---

## 🔗 Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [GPT-4 Vision Guide](https://platform.openai.com/docs/guides/vision)
- [Pricing Calculator](https://openai.com/pricing)
- [API Key Management](https://platform.openai.com/api-keys)
