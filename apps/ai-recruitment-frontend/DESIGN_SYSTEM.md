# AI Recruitment Clerk - Fantasy Bento Grid Design System

## Overview

This document outlines the comprehensive design system applied across all frontend pages in the AI Recruitment Clerk application. The design follows a **fantasy-themed bento grid** approach with consistent patterns, animations, and accessibility features.

## Completed Refactoring

All major pages have been refactored with the new design system:

1. ✅ **Jobs List Page** - Modern bento grid layout with job cards
2. ✅ **Create Job Page** - Fantasy-themed form with progress tracking  
3. ✅ **Resume Upload Component** - Two-column bento grid with drag-and-drop
4. ✅ **Analysis Progress Component** - Processing steps visualization with WebSocket
5. ✅ **Analysis Results Component** - Score and insights display with bento cards
6. ✅ **Dashboard Page** - Welcome header, stats cards, quick actions, activity timeline

---

## Design Tokens

### Color System

#### Primary Colors
```scss
--color-primary-50: /* Lightest primary */
--color-primary-100: /* Very light primary */
--color-primary-200: /* Light primary */
--color-primary-300: /* Medium-light primary */
--color-primary-400: /* Medium primary */
--color-primary-500: /* Base primary */
--color-primary-600: /* Dark primary */
--color-primary-700: /* Darker primary */
--color-primary-800: /* Very dark primary */
```

#### Royal Colors (Secondary Gradient)
```scss
--color-royal-50: /* Lightest royal */
--color-royal-100: /* Very light royal */
--color-royal-200: /* Light royal */
--color-royal-300: /* Medium-light royal */
--color-royal-400: /* Medium royal */
--color-royal-500: /* Base royal */
--color-royal-600: /* Dark royal */
--color-royal-700: /* Darker royal */
```

#### Status Colors
```scss
--color-success-50 through --color-success-800: /* Green tones */
--color-warning-50 through --color-warning-800: /* Yellow/amber tones */
--color-error-50 through --color-error-800: /* Red tones */
--color-emerald-50 through --color-emerald-500: /* Emerald accent */
```

#### Neutral Colors
```scss
--color-neutral-100 through --color-neutral-600: /* Gray scale */
--color-bg-primary: /* Primary background */
--color-bg-secondary: /* Secondary background */
--color-bg-fantasy: /* Fantasy gradient background */
--color-border-primary: /* Primary border */
--color-border-secondary: /* Secondary border */
--color-text-primary: /* Primary text */
--color-text-secondary: /* Secondary text */
--color-text-tertiary: /* Tertiary text */
--color-text-fantasy: /* Fantasy gradient text */
```

### Typography

#### Font Families
```scss
--font-family-fantasy-heading: /* Fantasy headings */
--font-family-body: /* Body text */
--font-family-mono: /* Monospace */
```

#### Font Sizes
```scss
--font-size-xs: /* Extra small (0.75rem) */
--font-size-sm: /* Small (0.875rem) */
--font-size-base: /* Base (1rem) */
--font-size-lg: /* Large (1.125rem) */
--font-size-xl: /* Extra large (1.25rem) */
--font-size-2xl: /* 2X large (1.5rem) */
--font-size-3xl: /* 3X large (1.875rem) */
```

#### Font Weights
```scss
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
--font-weight-fantasy-h1: 800; /* Fantasy headings */
--font-weight-fantasy-h2: 700; /* Fantasy subheadings */
--font-weight-fantasy-large: 600; /* Fantasy large text */
```

### Spacing
```scss
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-5: 1.25rem;  /* 20px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-10: 2.5rem;  /* 40px */
--space-12: 3rem;    /* 48px */
--space-14: 3.5rem;  /* 56px */
--space-16: 4rem;    /* 64px */
```

### Border Radius
```scss
--radius-sm: 0.25rem;    /* 4px */
--radius-md: 0.5rem;     /* 8px */
--radius-lg: 0.75rem;    /* 12px */
--radius-xl: 1rem;       /* 16px */
--radius-2xl: 1.5rem;    /* 24px */
--radius-full: 9999px;   /* Fully rounded */
```

### Shadows
```scss
--shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.05);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04);
--shadow-2xl: 0 25px 50px rgba(0, 0, 0, 0.15);
```

### Transitions
```scss
--transition-base: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```

---

## Core Design Patterns

### 1. Fantasy Header Pattern

**Usage**: Page headers with gradient backgrounds

```scss
.page-header {
  margin-bottom: var(--space-8);
  padding: var(--space-8) var(--space-6);
  background: var(--color-bg-fantasy);
  border-radius: var(--radius-2xl);
  color: white;
  box-shadow: var(--shadow-2xl);
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(
      circle at 30% 20%,
      rgba(255, 255, 255, 0.1),
      transparent 50%
    );
    pointer-events: none;
  }
}

.page-title {
  font-family: var(--font-family-fantasy-heading);
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-fantasy-h1);
  margin: 0 0 var(--space-2) 0;
  line-height: var(--line-height-tight);
  letter-spacing: -0.02em;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}
```

**Applied to**: Jobs List, Create Job, Resume Upload, Analysis Results, Dashboard

### 2. Bento Card Pattern

**Usage**: Main content cards with gradient overlays

```scss
.bento-card {
  background: linear-gradient(
    135deg,
    var(--color-bg-primary),
    var(--color-bg-secondary)
  );
  border-radius: var(--radius-2xl);
  border: 2px solid var(--color-border-secondary);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(8px);
  position: relative;
  overflow: hidden;
  animation: fadeInUp 0.4s ease-out;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      135deg,
      rgba(99, 102, 241, 0.02),
      transparent 50%,
      rgba(139, 92, 246, 0.02)
    );
    pointer-events: none;
  }

  &:hover {
    border-color: var(--color-primary-200);
    box-shadow: var(--shadow-xl);
    transform: translateY(-2px);
  }
}
```

**Applied to**: All major content sections across all pages

### 3. Gradient Icon Pattern

**Usage**: Icon containers with gradient backgrounds

```scss
.icon-wrapper {
  width: var(--space-12);
  height: var(--space-12);
  border-radius: var(--radius-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    135deg,
    var(--color-primary-500),
    var(--color-royal-600)
  );
  color: white;
  flex-shrink: 0;
  box-shadow: var(--shadow-lg), 0 0 20px rgba(99, 102, 241, 0.3);
}
```

**Applied to**: Dashboard cards, Analysis cards, Progress steps

### 4. Skill Tag Pattern

**Usage**: Tags for skills, categories, badges

```scss
.skill-tag {
  display: inline-flex;
  align-items: center;
  padding: var(--space-2) var(--space-4);
  background: linear-gradient(
    135deg,
    var(--color-primary-600),
    var(--color-royal-600)
  );
  color: white;
  border-radius: var(--radius-full);
  font-family: var(--font-family-body);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  transition: all var(--transition-base);
  box-shadow: var(--shadow-sm);

  &:hover {
    transform: translateY(-2px) scale(1.05);
    box-shadow: var(--shadow-md);
  }
}
```

**Applied to**: Jobs List (status), Analysis Results (skills), Create Job (requirements)

### 5. Button Pattern

**Usage**: Primary, secondary, and outline buttons

```scss
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-xl);
  font-family: var(--font-family-body);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: all var(--transition-base);
  border: none;
  background: linear-gradient(
    135deg,
    var(--color-primary-600),
    var(--color-royal-600)
  );
  color: white;
  box-shadow: var(--shadow-md);

  &:hover:not(:disabled) {
    background: linear-gradient(
      135deg,
      var(--color-primary-700),
      var(--color-royal-700)
    );
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
}
```

**Applied to**: All pages with action buttons

### 6. Progress Bar Pattern

**Usage**: Progress indicators with shimmer animation

```scss
.progress-bar-wrapper {
  margin-top: var(--space-3);
}

.progress-bar-track {
  width: 100%;
  height: 8px;
  background: var(--color-neutral-200);
  border-radius: var(--radius-full);
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
}

.progress-bar-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  background: linear-gradient(
    90deg,
    var(--color-primary-600),
    var(--color-royal-600)
  );
  position: relative;
  overflow: hidden;
}

.progress-shimmer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}
```

**Applied to**: Create Job (form progress), Analysis Progress (step progress)

---

## Animations

### Core Animations

```scss
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.9;
  }
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}

@keyframes sparkle {
  0%, 100% {
    opacity: 0;
    transform: scale(0);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### Animation Usage

- **fadeInUp**: Applied to all bento cards on page load
- **pulse**: Active processing icons, important indicators
- **rotate**: Loading spinners, processing icons
- **shimmer**: Progress bars during active processing
- **sparkle**: File upload dropzone decorative effects
- **spin**: Loading overlays, processing states

---

## Responsive Design

### Breakpoints

```scss
/* Tablet (1024px and below) */
@media (max-width: 1024px) {
  /* 2-column grids, reduced spacing */
}

/* Mobile (768px and below) */
@media (max-width: 768px) {
  /* 1-column grids, stack layouts, full-width buttons */
}

/* Small mobile (480px and below) */
@media (max-width: 480px) {
  /* Reduced font sizes, compact spacing, simplified layouts */
}
```

### Responsive Patterns

1. **Grid Layouts**: `repeat(auto-fit, minmax(280px, 1fr))` → collapse to 1 column on mobile
2. **Font Sizes**: Scale down by 1-2 levels on mobile
3. **Spacing**: Reduce padding/margins by 25-50% on mobile
4. **Navigation**: Stack horizontally-aligned items vertically
5. **Cards**: Full-width cards on mobile with reduced padding

---

## Accessibility Features

### ARIA Labels

All interactive elements include proper ARIA labels:

```html
<button
  type="submit"
  [disabled]="!selectedFile() || isSubmitting"
  class="btn-primary"
  [attr.aria-label]="isSubmitting ? '处理中...' : '开始AI分析'"
>
```

### Semantic HTML

- Use `<header>`, `<nav>`, `<main>`, `<article>`, `<section>` appropriately
- Proper heading hierarchy (`h1` → `h2` → `h3`)
- `role` attributes for complex widgets

### Focus States

```scss
&:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}
```

### Screen Reader Support

- `aria-live` regions for dynamic content
- `aria-labelledby` for complex components
- `.sr-only` class for screen-reader-only text

---

## Component-Specific Patterns

### Jobs List Page
- Job cards with gradient backgrounds
- Status badges with color coding
- Action buttons with icon + text
- Responsive grid layout

### Create Job Page
- Multi-step form with progress tracking
- Section-based layout with cards
- Form validation with inline errors
- Progress indicators

### Resume Upload Component
- Two-column bento grid layout
- Drag-and-drop file upload with sparkle effects
- File preview with gradient icon
- Candidate information form

### Analysis Progress Component
- Step-by-step progress visualization
- Color-coded status icons (pending, active, completed, error)
- Real-time WebSocket updates
- Progress bars with shimmer animation

### Analysis Results Component
- Bento grid layout with score card
- Expandable skills section
- Info cards for experience/education
- Stats grid with status colors
- Full-width recommendations section

### Dashboard Page
- Fantasy welcome header with dual gradients
- Stats cards grid (4 metrics)
- Quick action cards with hover effects
- Activity timeline with status indicators

---

## File Structure

```
apps/ai-recruitment-frontend/src/app/pages/
├── jobs/
│   ├── jobs-list/
│   │   ├── jobs-list.component.ts
│   │   └── jobs-list.component.scss (776 lines)
│   └── create-job/
│       ├── create-job.component.ts
│       └── create-job.component.scss (972 lines)
├── analysis/
│   └── components/
│       ├── resume-file-upload.component.ts
│       ├── resume-file-upload.component.scss (655 lines)
│       ├── analysis-progress.component.ts
│       ├── analysis-progress.component.scss (610 lines)
│       ├── analysis-results.component.ts
│       └── analysis-results.component.scss (710 lines)
└── dashboard/
    ├── dashboard.component.ts
    └── dashboard.component.scss (490 lines)
```

**Total SCSS Lines**: 4,213 lines of fantasy-themed bento grid styling

---

## Best Practices

### Do's ✅

1. **Use Design Tokens**: Always use CSS variables for colors, spacing, shadows
2. **Apply Consistent Animations**: Use `fadeInUp` for cards, `pulse` for active states
3. **Maintain Accessibility**: Include ARIA labels, semantic HTML, focus states
4. **Follow Responsive Patterns**: Mobile-first approach, test all breakpoints
5. **Use Gradient Backgrounds**: Primary-to-royal gradients for headers, icons, buttons
6. **Add Hover Effects**: Subtle scale, translateY, box-shadow transitions
7. **Include Loading States**: Spinners, shimmer effects, disabled states

### Don'ts ❌

1. **Don't Use Inline Styles**: Extract all styles to SCSS files
2. **Don't Hardcode Colors**: Always use CSS variables
3. **Don't Skip Accessibility**: Every interactive element needs proper labels
4. **Don't Ignore Mobile**: Test responsive layouts at all breakpoints
5. **Don't Overcomplicate**: Keep animations subtle and purposeful
6. **Don't Mix Design Patterns**: Maintain consistency across pages
7. **Don't Forget Error States**: Include validation, loading, and error handling

---

## Future Enhancements

Potential areas for design system expansion:

1. **Dark Mode Support**: Add dark theme color variables
2. **Additional Components**: Modals, tooltips, dropdown menus
3. **Motion System**: Define motion timing and easing functions
4. **Illustration Library**: Fantasy-themed illustrations and icons
5. **Data Visualization**: Chart and graph components with fantasy theme
6. **Form Components**: Enhanced input fields, selectors, date pickers
7. **Notification System**: Toast messages, alerts, banners

---

## Conclusion

This design system provides a comprehensive, consistent, and accessible foundation for the AI Recruitment Clerk application. All major pages have been refactored to follow these patterns, creating a cohesive fantasy-themed user experience with modern bento grid layouts, smooth animations, and robust accessibility features.
