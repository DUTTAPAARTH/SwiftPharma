# SwiftPharma Component Library - Premium Update

## 📚 Component Overview

All components have been upgraded with the new premium design system featuring:

- New color palette (brand, ink, page, info, etc.)
- Premium fonts (Nexus Bold, Mergian, Roserri)
- Smooth 300ms transitions
- Enhanced hover effects and animations
- Gradient-based visual effects
- Professional shadow system

---

## 🔘 Button Component

### File: `src/components/common/Button.jsx`

### Props

```jsx
<Button
  variant="primary" | "cta" | "secondary" | "outline" | "ghost"
  className="additional-classes"
  onClick={handler}
  ...htmlProps
/>
```

### Variants

#### 1. Primary (Default)

```jsx
<Button variant="primary">Get Started</Button>
```

- **Background**: Brand orange (#EE6E4D)
- **Text**: White
- **Hover**: Coral sunset gradient + glow shadow
- **Size**: px-6 py-3 (24px × 12px)
- **Usage**: Most CTAs

#### 2. CTA (Call-to-Action)

```jsx
<Button variant="cta">Shop Now</Button>
```

- **Background**: Brand orange (#EE6E4D)
- **Text**: White
- **Hover**: Coral sunset gradient + enhanced glow
- **Scale**: 1.03 on hover
- **Usage**: Primary action buttons

#### 3. Secondary

```jsx
<Button variant="secondary">Cancel</Button>
```

- **Background**: Page (#F5F3F0)
- **Text**: Ink (#20201F)
- **Border**: 2px border-subtle
- **Hover**: Inverted (ink background, white text)
- **Usage**: Alternative actions

#### 4. Outline

```jsx
<Button variant="outline">Learn More</Button>
```

- **Border**: 2px brand (#EE6E4D)
- **Text**: Brand (#EE6E4D)
- **Background**: Transparent
- **Hover**: Brand background filled
- **Usage**: Secondary CTAs

#### 5. Ghost

```jsx
<Button variant="ghost">Skip</Button>
```

- **Background**: Transparent
- **Text**: Brand (#EE6E4D)
- **Hover**: Subtle background (brand/10)
- **Usage**: Minimal actions

### Animation

- **Transition**: 300ms ease-in-out
- **Hover**: scale-103
- **Active**: scale-95
- **Shadow**: Glow effect on CTA variants

---

## 🗂️ Navbar Component

### File: `src/components/layout/Navbar.jsx`

### Features

- Sticky positioning (top-0 z-50)
- Scroll detection for dynamic shadow
- Responsive mobile menu
- Animated underline on hover

### Styling

- **Background**: White (#FFFFFF)
- **Text**: Ink (#20201F)
- **Brand Text**: Nexus Bold, text-2xl, brand color
- **Links**: Text-sm font-semibold
- **Hover**: Animated underline (coral-sunset gradient)

### Responsive

- **Desktop**: Horizontal nav links
- **Mobile**: Hamburger menu with slide-down nav
- **Breakpoint**: md (768px)

### Scroll Detection

```javascript
- scrollY > 10px: shadow-lifted (enhanced)
- scrollY <= 10px: shadow-soft (subtle)
```

---

## 🎯 Hero Component

### File: `src/components/Hero.jsx`

### Sections

1. **Gradient Background**: Warm glow gradient
2. **Animated Blobs**: Subtle gradients with blur
3. **Headline**: Nexus Bold, text-6xl, brand accent
4. **Accent Bar**: Violet pulse gradient, width-24
5. **Description**: Roserri font, ink-soft color
6. **Search Bar**: Full-width with focus states
7. **CTA Buttons**: Primary + Secondary
8. **Feature Pills**: 3 quick benefits badges

### Interactive Elements

- **Search Input**: Focus ring with brand color
- **Buttons**: Scale 1.03 on hover
- **Feature Pills**: Subtle animation on load

### Design Notes

- Uses gradient-warm-glow background
- Rounded-3xl for premium feel
- Feature pills with emoji icons
- Sufficient padding: p-8 md:p-12 on content

---

## 🛍️ ProductCard Component

### File: `src/components/cards/ProductCard.jsx`

### Props

```jsx
<ProductCard
  id={number}
  name={string}
  price={number}
  requiresRx={boolean}
  composition={string}
  rating={number}
  popular={boolean}
  fastDelivery={boolean}
/>
```

### Features

- **White Background**: card (#FFFFFF)
- **Premium Shadow**: 0 6px 25px rgba(0,0,0,0.07)
- **Hover Effect**: Lift (translateY-4px) + shadow grows
- **Badges**: Popular (coral), Fast Delivery (neutral), Rx (info)
- **Rating**: Shows ★ + review count
- **Price**: Large brand color text

### Badge System

- **Popular**: badge-cta (brand orange)
- **Fast Delivery**: badge-neutral (border-subtle)
- **Rx Required**: badge-info (deep indigo)

### Interactions

- **Hover**: Card lifts, shadow grows, background gradient overlay
- **Details Button**: Opens product detail page
- **Add Button**: Adds to cart with success feedback

### Responsive

- Single column on mobile
- Two columns on tablet
- Three columns on desktop

---

## 📑 CategoryCard Component

### File: `src/components/cards/CategoryCard.jsx`

### Props

```jsx
<CategoryCard title={string} description={string} emoji={string} />
```

### Design

- **Icon Container**: Emoji in page background, rounded-2xl
- **Title**: Nexus Bold, transitions to brand on hover
- **Description**: Roserri font, ink-soft color
- **CTA**: "Browse →" with animation

### Interactions

- **Hover**:
  - Icon scales up (scale-110)
  - Title changes to brand color
  - Arrow animates (translateX)
  - Gradient overlay appears

### Shadow

- Default: card shadow
- Hover: lifted shadow

---

## 🔗 Footer Component

### File: `src/components/layout/Footer.jsx`

### Structure

```
Footer (bg-gradient-deep-shadow)
├── Brand Section
│   ├── SwiftPharma Logo (Nexus Bold)
│   ├── Description (Roserri)
│   └── Social Links
├── Quick Links (4 links)
├── Support Links (4 links)
├── Newsletter
│   ├── Email Input
│   └── Subscribe Button
└── Copyright & Badge
```

### Styling

- **Background**: Deep shadow gradient
- **Text**: White
- **Links**: Transition to brand on hover
- **Input**: White/10 background, focus ring with brand

### Decorative Elements

- Gradient blur circles in background
- Smooth color transitions on hover
- Premium font sizes (Nexus Bold for titles)

---

## 📋 Admin Sidebar Component

### File: `src/components/admin/AdminSidebar.jsx`

### Structure

```
Sidebar (sticky, w-64)
├── Brand Header
│   ├── SwiftPharma (Nexus Bold, brand color)
│   └── "Admin Panel" subtitle
├── Navigation Links
│   ├── Dashboard
│   ├── Products
│   ├── Orders
│   └── Analytics
└── Footer Link
    └── Back to Store
```

### Styling

- **Background**: Deep shadow gradient
- **Text**: White
- **Links**: Transition to brand/20 background on hover
- **Sticky**: Remains visible while scrolling
- **Width**: Fixed 256px

### Responsive

- Sidebar hidden on mobile (can be toggled)
- Full-width on desktop

---

## 🎨 Custom Utilities

### Text Styles

```css
.text-headline {
  @apply font-nexus-bold text-5xl;
  color: #20201f;
  letter-spacing: -0.5px;
}

.text-subheadline {
  @apply font-mergian text-2xl;
  color: #20201f;
}

.text-muted {
  color: #4b4a48;
}
```

### Card Variants

```css
.card-base {
  @apply rounded-2xl;
  background-color: #ffffff;
  box-shadow: 0 6px 25px rgba(0, 0, 0, 0.07);
  transition: all 300ms ease-in-out;
}
.card-base:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
}
```

### Badge Variants

```css
.badge-cta {
  background-color: #ee6e4d; /* brand */
  color: white;
}

.badge-info {
  background-color: #4f46e5; /* info */
  color: white;
}

.badge-neutral {
  background-color: #e2e0dc; /* border-subtle */
  color: #20201f;
}
```

### Accent Bars

```css
.accent-bar {
  height: 4px;
  background: linear-gradient(135deg, #ee6e4d, #ff9e6f);
}

.accent-bar-violet {
  height: 4px;
  background: linear-gradient(135deg, #4f46e5, #6e5bff);
}
```

### Icon Glow Container

```css
.icon-glow {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 100px;
  padding: 16px;
  background: linear-gradient(135deg, #f5f3f0, #ffffff);
  box-shadow: 0 0 25px rgba(238, 110, 77, 0.15);
}
```

### Feature Tag

```css
.feature-tag {
  @apply text-xs font-semibold px-3 py-1 rounded-full;
  background-color: #f5f3f0;
  color: #ee6e4d;
  border: 1px solid #e2e0dc;
}
```

### Section Spacing

```css
.section-spacing {
  @apply py-16 md:py-20;
}
```

---

## 🎬 Animation System

### Transition Speeds

- **Fast**: 200ms (color changes)
- **Standard**: 300ms (all interactive elements)

### Scale Animations

```css
/* Hover */
transform: scale(1.03); /* .03 scale */

/* Active */
transform: scale(0.95); /* Press effect */
```

### Shadow Growth

```css
/* Hover state */
box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);

/* Normal state */
box-shadow: 0 6px 25px rgba(0, 0, 0, 0.07);
```

### Color Transitions

```css
transition: background-color 300ms ease-in-out, color 300ms ease-in-out,
  border-color 300ms ease-in-out;
```

---

## 📱 Responsive Breakpoints

### Tailwind Breakpoints Used

- **sm**: 640px (small tablets)
- **md**: 768px (tablets, small desktops)
- **lg**: 1024px (desktops)

### Component Adjustments

- **Text Sizes**: Larger on desktop
- **Padding**: Increased padding on larger screens
- **Grid Columns**: 1 → 2 → 3 as screen grows
- **Spacing**: py-16 → py-20 on desktop

---

## 🧪 Usage Examples

### Creating a Product Grid

```jsx
<div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
  {products.map((product) => (
    <ProductCard key={product.id} {...product} popular={Math.random() > 0.6} />
  ))}
</div>
```

### Using Premium Cards

```jsx
<div className="card-base p-8 space-y-4">
  <h3 className="text-headline">Title</h3>
  <p className="text-ink-soft font-roserri">Content</p>
</div>
```

### Styling Sections

```jsx
<section className="section-spacing bg-gradient-warm-glow rounded-3xl p-8 md:p-12">
  <h2 className="text-subheadline">Section Title</h2>
  <div className="accent-bar-violet w-20"></div>
</section>
```

---

## ✅ Component Status

| Component    | Status      | Updates                      | File                     |
| ------------ | ----------- | ---------------------------- | ------------------------ |
| Button       | ✅ Complete | Colors, hover effects, scale | `common/Button.jsx`      |
| Navbar       | ✅ Complete | Colors, fonts, animations    | `layout/Navbar.jsx`      |
| Hero         | ✅ Complete | Search, badges, gradients    | `Hero.jsx`               |
| ProductCard  | ✅ Complete | Badges, ratings, hover       | `cards/ProductCard.jsx`  |
| CategoryCard | ✅ Complete | Icons, hover, animation      | `cards/CategoryCard.jsx` |
| Footer       | ✅ Complete | Newsletter, gradients        | `layout/Footer.jsx`      |
| AdminSidebar | ✅ Complete | Dark gradient, styling       | `admin/AdminSidebar.jsx` |

---

## 🚀 Performance Considerations

- **Transitions**: 300ms is optimal (not too fast, not too slow)
- **Gradients**: GPU-accelerated, no performance impact
- **Shadows**: Box-shadow is efficient (no performance issues)
- **Font Loading**: Google Fonts API for premium fonts

---

## 📖 Documentation

- See `DESIGN_SYSTEM_UPGRADE.md` for full design overview
- See `COLOR_PALETTE.md` for detailed color specifications
- See `tailwind.config.js` for Tailwind configuration

---

**Version**: 1.0  
**Last Updated**: December 9, 2025  
**Status**: Production Ready ✅
