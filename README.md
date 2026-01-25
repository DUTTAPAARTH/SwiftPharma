# SwiftPharma — Fast & Reliable Medicine Delivery

🏥 A modern, full-stack online pharmacy delivery platform inspired by Blinkit, designed for the Indian market with a focus on fast delivery, verified products, and user privacy.

## 📋 Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Phase 1: Foundation & Design System](#phase-1-foundation--design-system)
- [Phase 2: Activation & Polish](#phase-2-activation--polish)
- [Color Palette](#color-palette)
- [Getting Started](#getting-started)
- [Development](#development)
- [Features](#features)

---

## 🎯 Overview

SwiftPharma is a healthcare-focused e-commerce platform that delivers prescription medicines, OTC products, and health essentials with Blinkit-style speed across India. The app prioritizes:

- **Speed**: Express medicine delivery
- **Verification**: All products from licensed pharmacies
- **Privacy**: Encrypted prescription handling
- **Accessibility**: Mobile-first, responsive design
- **User Experience**: Modern, intuitive interface

---

## 🛠 Technology Stack

### Frontend

- **React** 19.2.1 - UI framework
- **Vite** 7.2.7 - Lightning-fast build tool
- **Tailwind CSS** 3.4.18 - Utility-first CSS with custom design system
- **React Router** 7.10.1 - Client-side routing
- **Axios** 1.13.2 - HTTP client
- **Context API** - Global state management (Auth, Cart, Theme)

### Backend

- **Node.js** - Runtime
- **Express** 5.2.1 - Web framework
- **MongoDB** - NoSQL database (with Mongoose 9.0.1)
- **Morgan** 1.10.1 - HTTP request logger
- **CORS** 2.8.5 - Cross-origin resource sharing
- **Nodemon** 3.1.11 - Development hot-reload

### Infrastructure & Services

- **Cloudinary** - Image/prescription upload
- **Razorpay** - Payment processing (placeholder)
- **JWT** - Authentication tokens

---

## 📁 Project Structure

```
SWIFTPHARMA/
├── client/                          # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.jsx       # Sticky, animated nav with mobile menu
│   │   │   │   └── Footer.jsx       # Enhanced footer with links & gradient
│   │   │   ├── cards/
│   │   │   │   ├── ProductCard.jsx  # Product display with cart integration
│   │   │   │   ├── CategoryCard.jsx # Category browse cards
│   │   │   │   └── AdminStatCard.jsx# Dashboard statistics
│   │   │   ├── admin/
│   │   │   │   ├── AdminSidebar.jsx # Sticky sidebar navigation
│   │   │   │   ├── ProductForm.jsx  # Product CRUD form
│   │   │   │   └── PrescriptionReviewCard.jsx
│   │   │   ├── forms/
│   │   │   │   ├── AuthForm.jsx
│   │   │   │   ├── AddressSelector.jsx
│   │   │   │   └── PrescriptionUpload.jsx
│   │   │   ├── common/
│   │   │   │   ├── Button.jsx       # Multi-variant button component
│   │   │   │   ├── Modal.jsx
│   │   │   │   ├── Loader.jsx
│   │   │   │   └── Badge.jsx
│   │   │   ├── Hero.jsx             # Landing hero with gradient & CTA
│   │   │   └── chat/
│   │   ├── pages/
│   │   │   ├── Home.jsx             # Landing with hero + products
│   │   │   ├── Categories.jsx       # Browse categories grid
│   │   │   ├── ProductDetail.jsx    # Individual product detail
│   │   │   ├── Cart.jsx             # Shopping cart with controls
│   │   │   ├── Checkout.jsx         # Address selection + payment
│   │   │   ├── Orders.jsx           # Order history & tracking
│   │   │   ├── Wishlist.jsx         # Saved products
│   │   │   ├── Profile.jsx          # User profile & settings
│   │   │   ├── Auth.jsx             # Login/signup
│   │   │   ├── AdminDashboard.jsx   # Admin stats & overview
│   │   │   ├── AdminProducts.jsx    # Product management
│   │   │   ├── AdminOrders.jsx      # Order & Rx review
│   │   │   ├── AdminAnalytics.jsx   # Placeholder
│   │   │   └── DeliveryDashboard.jsx# Delivery agent view
│   │   ├── context/
│   │   │   ├── AuthContext.jsx      # Authentication state
│   │   │   ├── CartContext.jsx      # Shopping cart state
│   │   │   └── ThemeContext.jsx     # Theme toggling
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   ├── useCart.js
│   │   │   └── useTheme.js
│   │   ├── services/
│   │   │   ├── apiClient.js         # Axios instance
│   │   │   ├── authService.js
│   │   │   ├── productService.js
│   │   │   ├── orderService.js
│   │   │   ├── deliveryService.js
│   │   │   └── prescriptionService.js
│   │   ├── utils/
│   │   │   ├── constants.js
│   │   │   ├── helpers.js
│   │   │   └── validators.js
│   │   ├── data/
│   │   │   └── mockMedicines.json   # Sample product data
│   │   ├── styles/
│   │   │   ├── globals.css          # Global styles + typography
│   │   │   └── tailwind.css
│   │   ├── App.jsx
│   │   ├── main.jsx                 # Entry point with providers
│   │   └── routes.jsx               # React Router config
│   ├── index.html
│   ├── tailwind.config.js           # Custom palette + utilities
│   ├── postcss.config.js
│   ├── vite.config.js
│   ├── package.json
│   └── README.md
│
├── server/                          # Express backend
│   ├── src/
│   │   ├── app.js                   # Express app setup
│   │   ├── server.js                # Entry point
│   │   ├── config/
│   │   │   ├── db.js                # MongoDB connection
│   │   │   ├── jwt.js               # JWT middleware
│   │   │   └── cloudinary.js        # Image upload config
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Product.js
│   │   │   ├── Category.js
│   │   │   ├── Order.js
│   │   │   ├── Prescription.js
│   │   │   └── DeliveryAgent.js
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── productController.js
│   │   │   ├── categoryController.js
│   │   │   ├── orderController.js
│   │   │   ├── prescriptionController.js
│   │   │   ├── adminController.js
│   │   │   └── deliveryController.js
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── productRoutes.js
│   │   │   ├── categoryRoutes.js
│   │   │   ├── orderRoutes.js
│   │   │   ├── prescriptionRoutes.js
│   │   │   ├── adminRoutes.js
│   │   │   ├── deliveryRoutes.js
│   │   │   ├── healthRoute.js
│   │   │   └── index.js
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js
│   │   │   ├── roleMiddleware.js
│   │   │   ├── uploadMiddleware.js
│   │   │   └── errorHandler.js
│   │   ├── services/
│   │   │   ├── paymentService.js
│   │   │   └── uploadService.js
│   │   ├── utils/
│   │   │   ├── logger.js
│   │   │   └── constants.js
│   │   └── seed/
│   │       └── mockData.js
│   ├── index.js
│   ├── package.json
│   └── README.md
│
├── docs/
│   ├── architecture.md
│   ├── api-spec.md
│   └── ui-guidelines.md
│
├── package.json                     # Root workspace config
└── README.md
```

---

## 🎨 Phase 1: Foundation & Design System

### Goals

1. ✅ Clean, scalable folder structure for client/server
2. ✅ Tailwind configuration with refined color palette
3. ✅ Establish comprehensive UI/UX system:
   - Rounded corners (xl, 2xl)
   - Shadow presets (soft, card, lifted, glow)
   - Typography scale with tight line-heights
   - Consistent spacing system
   - Gradient backgrounds and CTA utilities
4. ✅ Core components (Navbar, Hero, ProductCard, CategoryCard)
5. ✅ Sample product data for layout testing
6. ✅ Express backend with GET /health

### Color Palette

| Color              | Hex     | Usage                                    |
| ------------------ | ------- | ---------------------------------------- |
| **midnightBlue**   | #1B2A41 | Primary text, navbar, strong sections    |
| **cloudWhite**     | #F6F7FB | Backgrounds, cards, surfaces             |
| **slateGray**      | #D1D5DE | Muted text, borders, dividers            |
| **electricOrange** | #FF6B45 | CTA buttons, highlights, action elements |
| **royalPurple**    | #6E44FF | Accents, badges, gradient highlights     |

### Gradients

- **Midnight Glow**: `linear-gradient(135deg, #1B2A41, #6E44FF)` - Premium feel, admin sections
- **Coral Pulse**: `linear-gradient(135deg, #1B2A41, #FF6B45)` - CTAs, product prices

### Typography Scale

| Style | Size            | Line-Height | Usage            |
| ----- | --------------- | ----------- | ---------------- |
| h1    | 2.25rem (36px)  | 2.5rem      | Page headlines   |
| h2    | 1.875rem (30px) | 2.25rem     | Section headings |
| h3    | 1.5rem (24px)   | 2rem        | Subsections      |
| h4    | 1.25rem (20px)  | 1.75rem     | Card titles      |
| base  | 1rem (16px)     | 1.5rem      | Body text        |
| sm    | 0.875rem (14px) | 1.25rem     | Labels, captions |
| xs    | 0.75rem (12px)  | 1rem        | Badges, metadata |

### Shadow System

- **soft**: `0 2px 8px rgba(27, 42, 65, 0.08)` - Subtle depth
- **card**: `0 4px 12px rgba(27, 42, 65, 0.12)` - Medium depth
- **lifted**: `0 8px 24px rgba(27, 42, 65, 0.16)` - Hover elevation
- **glow**: `0 0 20px rgba(110, 68, 255, 0.25)` - CTA glow effect

### Button Variants

```jsx
<Button variant="primary">         // midnightBlue, white text
<Button variant="cta">             // electricOrange, hover glow
<Button variant="secondary">       // slateGray, hover flip to primary
<Button variant="outline">         // Border, text flip on hover
<Button variant="ghost">           // Transparent, hover background
```

### Expected Output

- ✅ Folder structure ready
- ✅ Tailwind fully configured with custom palette
- ✅ Core components built and visually consistent
- ✅ Express backend with GET /health working
- ✅ Home page visually structured with sample data

---

## 🌟 Phase 2: Activation & Polish

### Goals

1. ✅ Dev servers running (Vite + Express)
2. ✅ Tailwind validation (colors, spacing, typography)
3. ✅ Enhance component interactivity & micro-animations

### Enhanced Features Implemented

#### Navbar

- ✅ Sticky positioning with scroll shadow
- ✅ Animated hamburger menu (mobile)
- ✅ Underline animation on hover
- ✅ Gradient text for branding
- ✅ Responsive mobile drawer

#### Hero Section

- ✅ Gradient-midnight background
- ✅ Animated floating blobs (blur effects)
- ✅ Accent bar under heading
- ✅ Two CTA buttons (primary + outline)
- ✅ Premium typography hierarchy

#### ProductCard

- ✅ Soft shadow with card elevation
- ✅ Hover scale effect (105%)
- ✅ Badge for prescription requirement
- ✅ Gradient price text
- ✅ Smooth button animations

#### CategoryCard

- ✅ Hover scale effect
- ✅ Gradient icon background
- ✅ Color transition on hover
- ✅ "Browse →" CTA indicator

#### Pages

- ✅ All pages use cloudWhite background
- ✅ Consistent headline + accent-bar pattern
- ✅ Card-base/card-lifted utilities for surfaces
- ✅ Responsive grid layouts
- ✅ Enhanced button styling

#### Footer

- ✅ Gradient-midnight background
- ✅ Multi-column layout (grid)
- ✅ Quick links section
- ✅ Support links
- ✅ Verified pharmacy badge

### UI/UX Enhancements

- ✅ 200-300ms smooth transitions
- ✅ Hover scale (105%) on interactive elements
- ✅ Shadow elevation on hover
- ✅ Gradient text for emphasis
- ✅ Consistent spacing (6, 8, 12 units)
- ✅ Premium healthcare aesthetic
- ✅ Mobile-first responsive design

### Expected Output

- ✅ Dev servers working cleanly
- ✅ UI fully styled with custom palette
- ✅ Homepage components modern & animated
- ✅ Clear design identity established
- ✅ System ready for Phase 3 (API, auth, management)

---

## 🎨 Color Palette

### Primary Colors

- **MidnightBlue** `#1B2A41` - Strong, medical-grade primary
- **CloudWhite** `#F6F7FB` - Clean, light background
- **SlateGray** `#D1D5DE` - Neutral supporting color

### Accent Colors

- **ElectricOrange** `#FF6B45` - Action-oriented, high energy
- **RoyalPurple** `#6E44FF` - Premium, highlight color

### Gradients

- **Midnight Glow** - Dark to purple (admin, premium sections)
- **Coral Pulse** - Dark to orange (CTAs, prices)

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- MongoDB (for Phase 3+)

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/swiftpharma.git
cd SWIFTPHARMA

# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

---

## 💻 Development

### Start Development Servers

#### Terminal 1: Frontend (Vite)

```bash
cd client
npm run dev
# Opens on http://localhost:5174
```

#### Terminal 2: Backend (Express)

```bash
cd server
npm run dev
# Runs on http://localhost:5000
```

### Verify Setup

```bash
# Check backend health
curl http://localhost:5000/health
# Expected: {"status":"ok"}
```

---

## ✨ Features

### User Features

- 🛍️ Browse medicines by category
- 🛒 Add to cart with quantity controls
- 💳 Checkout with address selection
- 📋 Order history & tracking
- ⭐ Wishlist for saved products
- 👤 User profile & settings
- 📱 Prescription upload for Rx items
- 🔒 Privacy-first design

### Admin Features

- 📊 Dashboard with key metrics
- 📦 Product management (CRUD)
- 📋 Prescription review & approval
- 📈 Analytics & reporting

### Delivery Features

- 🚚 Assigned orders view
- 📍 Route optimization
- ✅ Delivery confirmation

---

## 📚 Documentation

See `/docs/` folder:

- `architecture.md` - System design & data flow
- `api-spec.md` - REST API endpoints
- `ui-guidelines.md` - Design system reference

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🤝 Contributing

Contributions welcome! Please follow the established code structure and design system guidelines.

---

## 📞 Support

For questions or issues, please open an issue on GitHub or contact the development team.

---

## 💊 RX (Prescribed Medicines) System - NEW ✨

The complete RX system has been implemented for handling prescription-required medicines with full OCR extraction, validation, and admin approval workflow.

### Quick Start RX System

```powershell
powershell -ExecutionPolicy Bypass -File "c:\Users\PAARTH DUTTA\Downloads\SWIFTPHARMA\start-rx-system.ps1"
```

This starts:

- MongoDB (local portable)
- API server (http://localhost:5000)
- Frontend (http://localhost:5173)

### RX Features

✅ **Prescription Upload** - Drag & drop with auto OCR  
✅ **Image Processing** - Sharp auto-crop & normalize  
✅ **OCR Extraction** - Tesseract.js auto-extracts doctor name & date  
✅ **Cloud Storage** - Cloudinary secure hosting  
✅ **Auto Expiry** - 6-month validity, auto-calculated  
✅ **Validation** - Check expiry before checkout  
✅ **RX Gating** - Block add-to-cart for RX items without prescription  
✅ **Order Integration** - Prescription attached to orders  
✅ **Admin Workflow** - Approve/reject prescriptions with notes  
✅ **User Dashboard** - View & manage prescriptions

### Test the RX System

1. Go to http://localhost:5173
2. Sign up
3. Browse to **Amoxicillin 500** or **Metformin 500** (RX products)
4. Click "Upload Prescription"
5. Drag & drop an image, fill doctor name & date
6. Click "Save Prescription"
7. Now "Add to Cart" is enabled
8. Complete checkout
9. View prescription in orders

### RX Endpoints

```
POST   /api/prescriptions/upload        # Upload prescription
GET    /api/prescriptions/:id/validate  # Check if valid
GET    /api/prescriptions/user/:userId  # Get user prescriptions
POST   /api/prescriptions/:id/reupload  # Re-upload prescription
GET    /api/prescriptions/:id/download  # Download prescription
PATCH  /api/prescriptions/:id/review    # Admin review (approve/reject)
GET    /api/admin/prescriptions         # Admin list all prescriptions
```

See `RX_SYSTEM_IMPLEMENTATION_COMPLETE.md` for full documentation.

---

**SwiftPharma** — Delivering healthcare, fast. 💊⚡
