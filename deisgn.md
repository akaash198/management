# Scalable Design System: Dark Professional SaaS Platform

## Overview
This design system provides a cohesive visual language and component library for building a modern, enterprise-grade SaaS platform. The system combines the approachable vibrancy of Slack, the project management professionalism of Jira, and Microsoft Teams' collaborative enterprise focus.

---

## Core Visual Identity

### Color System (Dark Theme Primary)

#### Background Colors
```
Primary BG:        #0A1628 (Deep navy/dark teal)
Secondary BG:      #0F1C2E (Slightly lighter panels)
Elevated surfaces: #1A2942 (Cards, modals, popovers)
Border/Divider:    rgba(255, 255, 255, 0.08) (Subtle borders)
```

#### Accent Colors
```
Primary Accent:   #7CFFCB (Mint/teal green - for CTAs, active states)
Secondary Accent: #6366F1 (Indigo - for secondary actions)
Tertiary Accent:  #8B5CF6 (Purple - for highlights)
Success:          #10B981 (Green)
Warning:          #F59E0B (Amber)
Error:            #EF4444 (Red)
Info:             #3B82F6 (Blue)
```

#### Text Colors
```
Primary text:   #FFFFFF (Pure white for headings)
Secondary text: #94A3B8 (Slate gray for body)
Tertiary text:  #64748B (Muted for labels/captions)
Disabled text:  #475569 (Very muted)
```

---

## Typography Scale

### Font Families
```
Primary:   'Inter', system-ui, sans-serif
Monospace: 'Fira Code', 'JetBrains Mono', monospace
```

### Heading Scale
```
H1: 48px / 3rem,      font-weight: 700, line-height: 1.2
H2: 36px / 2.25rem,   font-weight: 700, line-height: 1.3
H3: 28px / 1.75rem,   font-weight: 600, line-height: 1.4
H4: 24px / 1.5rem,    font-weight: 600, line-height: 1.4
H5: 20px / 1.25rem,   font-weight: 600, line-height: 1.5
H6: 18px / 1.125rem,  font-weight: 600, line-height: 1.5
```

### Body Scale
```
Large:  18px / 1.125rem, font-weight: 400
Base:   16px / 1rem,     font-weight: 400
Small:  14px / 0.875rem, font-weight: 400
XSmall: 12px / 0.75rem,  font-weight: 500
```

---

## Spacing System

**Base Unit:** 8px

```
4px   (spacing-1)
8px   (spacing-2)
12px  (spacing-3)
16px  (spacing-4)
24px  (spacing-6)
32px  (spacing-8)
48px  (spacing-12)
64px  (spacing-16)
96px  (spacing-24)
128px (spacing-32)
```

---

## Border Radius System

```
Small:  6px   (inputs, small buttons)
Medium: 8px   (cards, standard buttons)
Large:  12px  (panels, major sections)
XLarge: 16px  (hero sections, feature cards)
Full:   9999px (pills, avatar shapes)
```

---

## Component Library Specifications

### 1. Navigation Header
**Consistent across all pages**

#### Layout
```
Height:          64px fixed
Background:      rgba(10, 22, 40, 0.8) with backdrop-blur
Border-bottom:   1px solid rgba(255, 255, 255, 0.08)
Position:        Sticky top-0, z-index: 50
```

#### Elements
- **Logo:** Left-aligned, 32px height, mint accent color
- **Navigation Menu:** Center or left (Product, Solutions, Resources, Pricing)
  - Hover state: Text color changes to #7CFFCB
  - Active state: Underline with mint accent
- **Right Actions:**
  - "Sign In" button: Ghost style (transparent bg, white border)
  - "Get Started" button: Primary style (mint bg, dark text)

#### Mobile
- Hamburger menu icon (top-right)
- Full-screen overlay menu with slide-in animation

---

### 2. Button System

#### Primary Button
```
Background:    linear-gradient(135deg, #7CFFCB, #5FE3B3)
Text:          #0A1628 (dark for contrast)
Padding:       12px 24px
Border-radius: 8px
Hover:         Brightness increase + subtle lift (transform: translateY(-2px))
Shadow:        0 4px 12px rgba(124, 255, 203, 0.3)
```

#### Secondary Button
```
Background:    transparent
Border:        1px solid rgba(255, 255, 255, 0.2)
Text:          #FFFFFF
Padding:       12px 24px
Hover:         Border color to #7CFFCB, text to #7CFFCB
```

#### Ghost Button
```
Background:    transparent
Text:          #94A3B8
Padding:       12px 24px
Hover:         Text to #FFFFFF, background: rgba(255, 255, 255, 0.05)
```

#### Icon Button
```
Size:          40px × 40px
Background:    rgba(255, 255, 255, 0.05)
Icon color:    #94A3B8
Hover:         Background rgba(255, 255, 255, 0.1), icon #FFFFFF
```

---

### 3. Input Fields

#### Default State
```
Background:    rgba(255, 255, 255, 0.05)
Border:        1px solid rgba(255, 255, 255, 0.1)
Text:          #FFFFFF
Placeholder:   #64748B
Padding:       12px 16px
Border-radius: 8px
```

#### Focus State
```
Border:        1px solid #7CFFCB
Box-shadow:    0 0 0 3px rgba(124, 255, 203, 0.1)
Background:    rgba(255, 255, 255, 0.08)
```

#### With Icon
```
Left icon padding: 12px 16px 12px 44px
Icon position:     Absolute left 16px, color #64748B
```

---

### 4. Card Components

#### Standard Card
```
Background:    #1A2942
Border:        1px solid rgba(255, 255, 255, 0.08)
Border-radius: 12px
Padding:       24px
Shadow:        0 4px 24px rgba(0, 0, 0, 0.3)
```

#### Hover Card (interactive)
```
Hover:         Border color #7CFFCB, transform: translateY(-4px)
Shadow:        0 8px 32px rgba(0, 0, 0, 0.4)
Transition:    all 0.3s ease
```

#### Feature Card
```
Icon container: 48px circle, background: rgba(124, 255, 203, 0.1)
Icon color:     #7CFFCB
Title:          H4 size, #FFFFFF
Description:    Base size, #94A3B8
Spacing:        16px between elements
```

---

### 5. Badge/Tag System

#### Status Badge
```
Padding:       4px 12px
Border-radius: 9999px
Font:          12px, font-weight: 500

Variants:
- Success: bg #10B98133, text #10B981
- Warning: bg #F59E0B33, text #F59E0B
- Error:   bg #EF444433, text #EF4444
- Info:    bg #3B82F633, text #3B82F6
- Default: bg rgba(255,255,255,0.1), text #94A3B8
```

---

### 6. Icon System
```
Library:       Lucide React (consistent style)
Sizes:         16px, 20px, 24px, 32px
Color:         Inherit from parent or #94A3B8 default
Stroke-width:  2px (consistent)
```

---

## Page Templates (Expandable Design)

### Template 1: Landing Page

#### Structure

**1. Hero Section (Split Layout)**
- **Left 50%:** Value proposition, headline, subheading, feature bullets, CTA
- **Right 50%:** Product demo screenshot OR authentication form
- **Background:** Gradient from #0A1628 to #0F1C2E
- **Overlay:** Subtle grid pattern or dot matrix

**2. Features Grid Section**
- 3-column grid (2-col tablet, 1-col mobile)
- Each feature: Icon + Title + Description
- Background: Slightly lighter than hero (#0F1C2E)

**3. Integration Showcase**
- Logo grid with glassmorphism cards
- Hover effects on logos

**4. Social Proof**
- Stats bar: 4 metrics in row
- Testimonial cards carousel
- Customer logo grid

**5. Pricing Section**
- Pricing cards with highlighted "Popular" badge
- Toggle for monthly/annual

**6. Final CTA**
- Full-width section with gradient background
- Email capture or demo request

---

### Template 2: Dashboard Page

#### Structure

**1. Sidebar Navigation**
```
Width:        240px (collapsible to 60px)
Background:   #0A1628
Active item:  Background #1A2942, left border #7CFFCB
Content:      Icons + labels
Bottom:       User profile
```

**2. Top Bar**
- Breadcrumbs (left)
- Search bar (center)
- Notifications + Profile (right)

**3. Main Content Area**
- Background: #0F1C2E
- Cards for different sections
- Stats widgets: Mini cards with icon, number, label, trend indicator

**4. Widgets**
- Chart cards: Dark bg with gridlines in rgba(255,255,255,0.05)
- Table rows: Hover state rgba(255,255,255,0.05)
- Action buttons: Icon buttons aligned right

---

### Template 3: Project Board (Kanban)

#### Structure

**1. Board Header**
- Project name + description
- Filters, sort, view toggles
- Add column button

**2. Columns**
```
Background:     #1A2942
Width:          300px, horizontal scroll
Header:         Column name + count badge
Cards:          Draggable task cards
```

**3. Task Cards**
- Compact: Title, assignee avatar, due date, priority badge
- Background: #0F1C2E
- Hover: Subtle lift + border glow

---

### Template 4: Settings Page

#### Structure

**1. Horizontal Tab Navigation**
- Tabs: Profile, Security, Notifications, Billing, Team
- Active tab: Bottom border #7CFFCB

**2. Form Sections**
- Section title with divider
- Form groups: Label + input + helper text
- Save button (sticky bottom on mobile)

**3. Nested Sidebar (left)**
- Quick navigation within settings

---

### Template 5: Authentication Pages (Login/Signup)

#### Structure

**1. Split Screen Layout**
- **Left:** Branding, value prop, features
- **Right:** Form

**2. Form Elements**
- Logo at top
- "Welcome back" headline
- Social login buttons (Continue with Google, etc.)
- Divider: "or"
- Email + Password inputs
- Checkbox: Remember me
- Forgot password link
- Primary submit button
- Sign up link at bottom

**3. Background**
- Gradient with subtle animation
- Abstract shapes or grid pattern

---

## Animation & Interaction Patterns

### Transitions
```css
Default: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)
Slow:    all 0.5s ease
Fast:    all 0.15s ease
```

### Hover States
- **Cards:** Lift 4px + shadow increase
- **Buttons:** Brightness + slight scale (1.02)
- **Links:** Color change + underline slide-in
- **Icons:** Rotate or bounce on hover

### Loading States
- **Skeleton screens:** Shimmer effect rgba(255,255,255,0.05) to rgba(255,255,255,0.1)
- **Spinners:** Mint accent color
- **Progress bars:** Gradient fill with mint

### Page Transitions
- **Fade in:** opacity 0 → 1 over 300ms
- **Slide up:** transform translateY(20px) → 0 over 400ms
- **Stagger children:** Each child delays by 50ms

---

## Iconography & Visual Elements

### Icon Usage
- **Feature bullets:** Checkmark in circle (mint accent)
- **Navigation:** Outline style icons
- **Actions:** Filled icons for primary, outline for secondary
- **Status:** Colored icons matching badge system

### Illustrations
- **Style:** Abstract, geometric, gradient-based
- **Colors:** Use accent palette (mint, indigo, purple)
- **Placement:** Hero sections, empty states, error pages

### Graphics
- **Dot matrix backgrounds:** rgba(255,255,255,0.02) dots
- **Grid overlays:** Subtle lines rgba(255,255,255,0.03)
- **Gradient orbs:** Blurred circles with accent colors for depth
- **Glow effects:** Box-shadow with accent colors at 20% opacity

---

## Responsive Breakpoints

### Mobile: < 640px
- Stack all columns
- Full-width buttons
- Collapse navigation to hamburger
- Hide secondary information

### Tablet: 640px - 1024px
- 2-column grids become 1 or 2
- Sidebar becomes collapsible overlay
- Reduced padding

### Desktop: 1024px - 1536px
- Standard layout
- Full sidebar visible

### Large Desktop: > 1536px
- Max container width: 1536px
- Center content with padding

---

## Accessibility Standards

### Contrast Ratios
- **Text on dark BG:** Minimum 7:1 (AAA)
- **Interactive elements:** Minimum 4.5:1 (AA)

### Focus States
```
Visible outline: 2px solid #7CFFCB
Offset:          2px
Applied to:      All interactive elements
```

### ARIA Labels
- All icon buttons have aria-label
- Form inputs have associated labels
- Status messages use aria-live regions

### Keyboard Navigation
- Tab order follows visual flow
- Skip links for main content
- Escape closes modals/dropouts

---

## Code Implementation Guide

### CSS Variables

Add to `src/styles/theme.css`:

```css
:root {
  /* Colors - Background */
  --color-bg-primary: #0A1628;
  --color-bg-secondary: #0F1C2E;
  --color-bg-elevated: #1A2942;
  
  /* Colors - Accent */
  --color-accent-primary: #7CFFCB;
  --color-accent-secondary: #6366F1;
  --color-accent-tertiary: #8B5CF6;
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-error: #EF4444;
  --color-info: #3B82F6;
  
  /* Colors - Text */
  --color-text-primary: #FFFFFF;
  --color-text-secondary: #94A3B8;
  --color-text-tertiary: #64748B;
  --color-text-disabled: #475569;
  
  /* Colors - Border */
  --color-border: rgba(255, 255, 255, 0.08);
  --color-border-focus: #7CFFCB;
  
  /* Spacing */
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-6: 24px;
  --spacing-8: 32px;
  --spacing-12: 48px;
  --spacing-16: 64px;
  --spacing-24: 96px;
  --spacing-32: 128px;
  
  /* Radius */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.4);
  --shadow-glow: 0 0 24px rgba(124, 255, 203, 0.3);
  --shadow-glow-strong: 0 4px 12px rgba(124, 255, 203, 0.3);
  
  /* Typography */
  --font-family-primary: 'Inter', system-ui, sans-serif;
  --font-family-mono: 'Fira Code', 'JetBrains Mono', monospace;
}
```

### Tailwind Configuration

Add to `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        'dark': {
          primary: '#0A1628',
          secondary: '#0F1C2E',
          elevated: '#1A2942',
        },
        'accent': {
          mint: '#7CFFCB',
          indigo: '#6366F1',
          purple: '#8B5CF6',
        },
        'text': {
          primary: '#FFFFFF',
          secondary: '#94A3B8',
          tertiary: '#64748B',
          disabled: '#475569',
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow': '0 0 24px rgba(124, 255, 203, 0.3)',
        'glow-strong': '0 4px 12px rgba(124, 255, 203, 0.3)',
      },
    },
  },
};
```

---

## Design System Expansion Checklist

When creating new pages, ensure:

- [ ] Uses defined color palette (no random colors)
- [ ] Follows spacing system (8px increments)
- [ ] Uses typography scale consistently
- [ ] Button styles match component library
- [ ] Cards have consistent styling
- [ ] Icons from Lucide React library only
- [ ] Hover/focus states implemented
- [ ] Mobile responsive (test at 375px width)
- [ ] Meets accessibility contrast ratios
- [ ] Loading states designed
- [ ] Empty states designed
- [ ] Error states designed
- [ ] Keyboard navigation works
- [ ] ARIA labels present
- [ ] Focus indicators visible

---

## Key Design Principles

### 1. Dark First
Always design with dark theme as primary. Light theme is secondary.

### 2. Subtle Accents
Use mint (#7CFFCB) sparingly for CTAs and highlights only. Don't overuse.

### 3. Hierarchy through Size & Weight
Create visual hierarchy using font size and weight, not color alone.

### 4. White Space
Use generous padding. Don't cram content. Let elements breathe.

### 5. Consistent Depth
Use elevation (shadows) to show hierarchy and layer importance.

### 6. Smooth Interactions
All transitions should feel polished. No janky animations.

### 7. Progressive Disclosure
Show what's needed when it's needed. Hide complexity until required.

### 8. Mobile First
Design mobile experience first, then scale up to desktop.

### 9. Accessibility Always
Every component must meet WCAG 2.1 AA standards minimum.

### 10. Performance Matters
Optimize images, minimize bundle size, lazy load when appropriate.

---

## Component Examples

### Example: Primary Button Component

```tsx
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  onClick,
  disabled = false,
  className = ''
}: ButtonProps) {
  const baseClasses = 'rounded-lg font-medium transition-all duration-300';
  
  const variantClasses = {
    primary: 'bg-gradient-to-br from-accent-mint to-[#5FE3B3] text-dark-primary hover:brightness-110 hover:-translate-y-0.5 shadow-glow-strong',
    secondary: 'bg-transparent border border-white/20 text-white hover:border-accent-mint hover:text-accent-mint',
    ghost: 'bg-transparent text-text-secondary hover:text-white hover:bg-white/5',
  };
  
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
```

### Example: Input Component

```tsx
interface InputProps {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon?: React.ReactNode;
  label?: string;
  error?: string;
}

export function Input({
  type = 'text',
  placeholder,
  value,
  onChange,
  icon,
  label,
  error
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-text-secondary mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary">
            {icon}
          </div>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`
            w-full bg-white/5 border border-white/10 text-white placeholder-text-tertiary
            rounded-lg px-4 py-3 ${icon ? 'pl-12' : ''}
            focus:outline-none focus:border-accent-mint focus:bg-white/8
            focus:ring-2 focus:ring-accent-mint/10
            transition-all duration-300
            ${error ? 'border-error' : ''}
          `}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-error">{error}</p>
      )}
    </div>
  );
}
```

### Example: Card Component

```tsx
interface CardProps {
  children: React.ReactNode;
  hover?: boolean;
  className?: string;
}

export function Card({ children, hover = false, className = '' }: CardProps) {
  return (
    <div
      className={`
        bg-dark-elevated border border-white/8 rounded-xl p-6
        shadow-md
        ${hover ? 'hover:border-accent-mint hover:-translate-y-1 hover:shadow-lg transition-all duration-300' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
```

---

## Resources & Tools

### Design Tools
- **Figma:** Primary design tool
- **Color Contrast Checker:** WebAIM, Contrast Ratio
- **Icon Library:** Lucide React (https://lucide.dev)

### Development Tools
- **React:** Component framework
- **Tailwind CSS:** Utility-first CSS
- **TypeScript:** Type safety
- **Vite:** Build tool

### Testing Tools
- **Accessibility:** axe DevTools, WAVE
- **Responsive:** Chrome DevTools, BrowserStack
- **Performance:** Lighthouse, WebPageTest

---

## Changelog

### Version 1.0.0 (Current)
- Initial design system release
- Dark theme as primary
- Component library v1
- Page templates v1
- Accessibility standards defined

---

## Support & Contribution

For questions, suggestions, or contributions to this design system:
1. Review the existing components and patterns
2. Follow the established principles
3. Maintain consistency across all implementations
4. Test for accessibility and responsiveness
5. Document any new patterns or components

---

**Last Updated:** May 12, 2026  
**Version:** 1.0.0  
**Status:** Active Development
