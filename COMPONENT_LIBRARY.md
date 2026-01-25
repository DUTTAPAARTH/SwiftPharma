# SwiftPharma UI Component Library

## Button Component

### Variants

```jsx
// Primary - Midnight Blue
<Button variant="primary">Primary Button</Button>
// bg-midnightBlue text-cloudWhite hover:scale-105 hover:shadow-lifted

// CTA - Electric Orange with Glow
<Button variant="cta">Shop Now</Button>
// bg-electricOrange text-white hover:scale-105 hover:shadow-glow

// Secondary - Slate Gray
<Button variant="secondary">Secondary</Button>
// bg-slateGray text-midnightBlue hover:bg-midnightBlue hover:text-cloudWhite

// Outline - Border with text color
<Button variant="outline">Outline Button</Button>
// border-2 border-midnightBlue text-midnightBlue hover:bg-midnightBlue/5

// Ghost - Transparent with hover
<Button variant="ghost">Ghost Button</Button>
// text-midnightBlue hover:bg-cloudWhite/50
```

### States

- Default: Full opacity, normal scale
- Hover: scale-105, shadow-lifted, color shift
- Active: scale-95, color intensity
- Disabled: opacity-50, cursor-not-allowed

### Sizes

```jsx
<Button className="px-4 py-2">Default</Button>
<Button className="px-6 py-3 text-lg">Large</Button>
<Button className="px-3 py-1 text-sm">Small</Button>
```

---

## Card Components

### Card Base (Standard)

```jsx
<div className="card-base">
  {/* bg-cloudWhite, rounded-xl, shadow-card, transition */}
</div>
```

### Card Soft (Subtle)

```jsx
<div className="card-soft">{/* Softer shadow for secondary content */}</div>
```

### Card Lifted (Interactive)

```jsx
<div className="card-lifted group hover:shadow-lifted">
  {/* Elevation on hover, used for ProductCard */}
</div>
```

---

## ProductCard Component

```jsx
<ProductCard
  id={1}
  name="Paracetamol 500mg"
  price={49}
  composition="Paracetamol 500mg"
  requiresRx={false}
/>
```

Features:

- Lifted shadow with hover elevation
- Badge for Rx requirement
- Gradient price text (coralPulse)
- Add to cart button with hover glow
- Details link with secondary styling
- Responsive layout

---

## CategoryCard Component

```jsx
<CategoryCard
  title="Prescription Medicines"
  description="Doctor prescribed drugs delivered safely"
/>
```

Features:

- Base card with hover scale
- Gradient coral icon background
- Smooth color transitions
- "Browse →" CTA indicator
- Hover animations

---

## Hero Component

```jsx
<Hero />
```

Features:

- Gradient-midnight background
- Animated floating blob effects (blur)
- Accent bar under heading
- Two CTA buttons (cta + outline)
- Large, bold typography
- Responsive padding

---

## Navbar Component

```jsx
<Navbar />
```

Features:

- Sticky positioning (top-0 z-50)
- Scroll detection for shadow
- Animated hamburger menu (mobile)
- Underline hover animation on links
- Gradient text for logo
- Responsive mobile drawer
- Uses React Router Link

---

## Badge Components

### Badge CTA (Orange)

```jsx
<span className="badge-cta">Requires Rx</span>
```

### Badge Accent (Purple)

```jsx
<span className="badge-accent">Premium</span>
```

### Badge Neutral (Gray)

```jsx
<span className="badge-neutral">Standard</span>
```

All badges:

- Inline-block display
- Rounded-full
- Pixel-perfect padding
- Font-semibold weight
- Responsive text size

---

## Typography Utilities

### Headlines

```jsx
<h1 className="text-headline">Page Title</h1>
// text-3xl font-bold text-midnightBlue

<h2 className="text-subheadline">Section Title</h2>
// text-lg font-semibold text-midnightBlue
```

### Muted Text

```jsx
<p className="text-muted">Secondary content</p>
// text-slateGray
```

### Gradient Text

```jsx
<span className="gradient-text">Premium Text</span>
// bg-gradient-midnight bg-clip-text text-transparent
```

---

## Accent Elements

### Accent Bar (Horizontal Rule)

```jsx
<div className="accent-bar w-12"></div>
// h-1 bg-gradient-coral rounded-full mb-4
// Use under section headings for visual impact
```

### Gradient Backgrounds

```jsx
<div className="bg-gradient-midnight">
  {/* Midnight → Purple gradient */}
</div>

<div className="bg-gradient-coral">
  {/* Midnight → Orange gradient */}
</div>
```

---

## Layout Utilities

### Container Max Width

```jsx
<main className="max-w-6xl mx-auto px-4">
  {/* Centered with padding and max width */}
</main>
```

### Grid System

```jsx
// Responsive product grid
<div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
  {/* 1 col mobile, 2 sm, 3 lg */}
</div>
```

### Spacing Scale

```jsx
p - 4; /* 1rem (16px) */
p - 6; /* 1.5rem (24px) */
p - 8; /* 2rem (32px) */
p - 12; /* 3rem (48px) */

gap - 3; /* 0.75rem (12px) */
gap - 4; /* 1rem (16px) */
gap - 6; /* 1.5rem (24px) */
```

---

## Shadow System

### Soft Shadow (Minimal depth)

```jsx
<div className="shadow-soft">/* 0 2px 8px rgba(27, 42, 65, 0.08) */</div>
```

### Card Shadow (Medium depth)

```jsx
<div className="shadow-card">/* 0 4px 12px rgba(27, 42, 65, 0.12) */</div>
```

### Lifted Shadow (Elevated)

```jsx
<div className="shadow-lifted">/* 0 8px 24px rgba(27, 42, 65, 0.16) */</div>
```

### Glow Shadow (CTA highlight)

```jsx
<div className="shadow-glow">/* 0 0 20px rgba(110, 68, 255, 0.25) */</div>
```

---

## Hover & Interactive Effects

### Scale Effects

```jsx
hover: scale - 105; /* Enlarge on hover */
hover: scale - 110; /* More enlarge */
active: scale - 95; /* Shrink on click */
```

### Color Transitions

```jsx
hover:text-electricOrange
hover:bg-midnightBlue/5
hover:border-electricOrange
transition-colors duration-200
```

### Shadow Elevation

```jsx
hover:shadow-lifted
hover:shadow-glow
transition-all duration-300
```

---

## Form Components

### Input Styling (Base)

```jsx
<input
  className="w-full px-4 py-2 bg-cloudWhite border border-slateGray rounded-xl
             focus:border-electricOrange focus:outline-none transition-colors"
/>
```

### Select Styling (Base)

```jsx
<select
  className="w-full px-4 py-2 bg-cloudWhite border border-slateGray rounded-xl
             focus:border-electricOrange focus:outline-none transition-colors"
/>
```

### Form Label

```jsx
<label className="text-midnightBlue font-semibold text-sm">Input Label</label>
```

---

## Admin Components

### AdminSidebar

```jsx
<aside className="bg-gradient-midnight text-cloudWhite w-64 p-6 sticky top-0">
  {/* Sidebar navigation with gradient background */}
</aside>
```

### AdminStatCard

```jsx
<AdminStatCard label="Total Users" value="0" />
// Displays metric with gradient value and bottom bar
```

Features:

- Large bold numbers
- Gradient text (coralPulse)
- Accent bar at bottom
- Hover shadow elevation

---

## Page Layout Pattern

### Standard Page Template

```jsx
<div className="min-h-screen bg-cloudWhite">
  <Navbar />
  <main className="max-w-6xl mx-auto px-4 py-12 space-y-6">
    <div>
      <h1 className="text-headline mb-2">Page Title</h1>
      <div className="accent-bar w-12"></div>
    </div>

    {/* Page Content */}
  </main>
  <Footer />
</div>
```

### Card Content Pattern

```jsx
<div className="card-base p-8 space-y-4">
  <h3 className="text-subheadline">Card Title</h3>
  {/* Content */}
  <Button variant="cta">Action</Button>
</div>
```

---

## Responsive Breakpoints

- **Mobile**: Default (< 640px)
- **Tablet**: `sm:` (640px+)
- **Desktop**: `md:` (768px+)
- **Large**: `lg:` (1024px+)

### Example: Responsive Grid

```jsx
<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
  {/* 1 column on mobile, 2 on tablet, 3 on desktop */}
</div>
```

### Example: Responsive Padding

```jsx
<div className="p-4 md:p-8 lg:p-12">
  {/* 1rem on mobile, 2rem on tablet, 3rem on desktop */}
</div>
```

---

## Animation Timings

```jsx
transition-all duration-200    /* Fast interactions (hover) */
transition-all duration-300    /* Standard transitions */
group-hover:opacity-100        /* Group hover effects */
hover:scale-105                /* Scale on hover */
active:scale-95                /* Press effect */
```

---

## Accessibility Features

✅ Semantic HTML
✅ ARIA labels where needed
✅ High contrast ratios (WCAG AA)
✅ Keyboard navigation support
✅ Focus states visible
✅ Button hover states clear
✅ Alt text for images
✅ Proper heading hierarchy

---

## Usage Examples

### Product Showcase

```jsx
<div className="card-lifted p-6">
  <h4 className="text-subheadline mb-2">Product Name</h4>
  <p className="text-muted text-sm mb-4">Composition</p>
  <div className="bg-gradient-coral bg-clip-text text-transparent text-2xl font-bold">
    ₹49
  </div>
  <Button variant="cta" className="mt-4">
    Add to Cart
  </Button>
</div>
```

### Feature Section

```jsx
<section className="bg-gradient-midnight text-cloudWhite rounded-2xl p-12">
  <h2 className="text-2xl font-bold mb-8">Why Choose Us?</h2>
  <div className="grid md:grid-cols-3 gap-6">
    {features.map((f) => (
      <div key={f.id} className="space-y-2">
        <div className="text-4xl mb-2">{f.icon}</div>
        <h3 className="font-semibold">{f.title}</h3>
        <p className="text-cloudWhite/70 text-sm">{f.desc}</p>
      </div>
    ))}
  </div>
</section>
```

### Empty State

```jsx
<div className="card-base p-8 text-center space-y-4">
  <p className="text-slateGray text-lg">No items found</p>
  <Link to="/categories">
    <Button variant="cta">Browse Categories</Button>
  </Link>
</div>
```

---

## Performance Tips

1. Use `card-lifted` for interactive elements
2. Combine transitions with `duration-200` or `duration-300`
3. Use `shadow-soft` for subtle UI elements
4. Keep animations under 300ms for smoothness
5. Use `hover:shadow-lifted` for elevation effects
6. Leverage `group-hover` for complex interactions

---

## Browser Support

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Mobile browsers (iOS 14+, Android 8+)

---

**SwiftPharma Component Library v1.0**
Last Updated: December 9, 2025
