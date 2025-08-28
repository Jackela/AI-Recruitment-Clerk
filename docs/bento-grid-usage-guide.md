# Bento Grid Layout System - Usage Guide

## Overview

The Bento Grid Layout System provides a modern, responsive, and accessible way to display dashboard information using Apple-inspired bento box layouts. This system prioritizes visual hierarchy, mobile-first design, and user accessibility.

## Key Features

### 🎯 Design Principles
- **Visual Hierarchy**: Clear information priority through size and placement
- **Mobile-First**: Responsive design that works from 320px to 1400px+ screens
- **Accessibility**: Full WCAG 2.1 AA compliance with ARIA labels and keyboard navigation
- **Modern Aesthetics**: Clean, minimal design with smooth animations

### 🧩 Component Architecture
1. **BentoGridComponent**: Main grid container with responsive layouts
2. **BentoCardComponent**: Individual card component for complex data display
3. **BentoGridItem Interface**: Type-safe configuration for grid items

## Grid Sizes

### Default Grid (4 columns)
```typescript
<app-bento-grid [gridSize]="'default'" [items]="items"></app-bento-grid>
```
- **Desktop**: 4 columns
- **Tablet**: 3 columns  
- **Mobile**: 2 columns
- **Small Mobile**: 1 column

### Compact Grid (6 columns)
```typescript
<app-bento-grid [gridSize]="'compact'" [items]="items"></app-bento-grid>
```
- **Desktop**: 6 columns
- **Tablet**: 4 columns
- **Mobile**: 3 columns
- **Small Mobile**: 2 columns

### Wide Grid (3 columns)
```typescript
<app-bento-grid [gridSize]="'wide'" [items]="items"></app-bento-grid>
```
- **Desktop**: 3 columns
- **Tablet**: 2 columns
- **Mobile**: 1 column

## Item Sizes

### Size Options
- **`small`**: 1 column × 1 row (120px min-height)
- **`medium`**: 1 column × 1 row (160px min-height) - *Default*
- **`large`**: 2 columns × 1 row (160px min-height)
- **`wide`**: 2 columns × 1 row (200px min-height)
- **`tall`**: 1 column × 2 rows (300px min-height)
- **`feature`**: 2 columns × 2 rows (300px min-height)

### Responsive Behavior
- Large items automatically collapse to single column on mobile
- Tall items reduce to normal height on mobile
- Grid maintains optimal spacing across all breakpoints

## Color Variants

### Available Variants
```typescript
export type BentoVariant = 'default' | 'primary' | 'success' | 'warning' | 'info' | 'error';
```

- **`default`**: White background with subtle shadow
- **`primary`**: Purple gradient (667eea → 764ba2)
- **`success`**: Blue gradient (4facfe → 00f2fe)  
- **`warning`**: Pink-yellow gradient (fa709a → fee140)
- **`info`**: Mint gradient (a8edea → fed6e3)
- **`error`**: Red gradient (ff6b6b → ee5a52)

## Usage Examples

### 1. Basic Stats Card
```typescript
const statsCard: BentoGridItem = {
  id: 'total-jobs',
  title: '总职位数',
  subtitle: '当前活跃招聘职位',
  value: 24,
  icon: 'jobs',
  variant: 'primary',
  size: 'medium',
  trend: {
    type: 'up',
    value: '+12%',
    period: '本月'
  }
};
```

### 2. Action Card with Button
```typescript
const actionCard: BentoGridItem = {
  id: 'create-job',
  title: '创建新职位',
  subtitle: '快速发布招聘信息',
  icon: 'plus',
  variant: 'success',
  size: 'large',
  clickable: true,
  action: {
    text: '创建职位',
    onClick: () => this.router.navigate(['/jobs/create'])
  }
};
```

### 3. Complex Data Card
```typescript
const analyticsCard: BentoGridItem = {
  id: 'analytics',
  title: '分析概览',
  icon: 'analytics',
  variant: 'info',
  size: 'feature',
  customTemplate: this.analyticsTemplate // Angular TemplateRef
};
```

### 4. Progress Card
```typescript
const progressCard: BentoGridItem = {
  id: 'progress',
  title: '处理进度',
  subtitle: '当前任务完成情况',
  value: '75%',
  icon: 'clock',
  variant: 'warning',
  size: 'wide'
};
```

## Advanced Features

### 1. Custom Templates
Use Angular TemplateRef for complex card content:

```html
<ng-template #customTemplate let-item>
  <div class="custom-card-content">
    <h3>{{ item.title }}</h3>
    <!-- Your custom content here -->
    <app-chart [data]="chartData"></app-chart>
  </div>
</ng-template>
```

```typescript
@ViewChild('customTemplate', { static: true }) customTemplate!: TemplateRef<any>;

const customCard: BentoGridItem = {
  id: 'custom',
  customTemplate: this.customTemplate
};
```

### 2. Interactive Cards
Enable click interactions and keyboard navigation:

```typescript
const interactiveCard: BentoGridItem = {
  id: 'interactive',
  title: '点击查看详情',
  clickable: true,
  // Automatically adds tabindex, keyboard handlers, and ARIA labels
};

// Handle clicks in component
handleItemClick = (item: BentoGridItem): void => {
  if (item.id === 'interactive') {
    this.showDetails();
  }
};
```

### 3. Real-time Data Updates
Cards automatically animate when data changes:

```typescript
// Update data - animations are automatic
this.bentoItems = this.bentoItems.map(item => 
  item.id === 'stats' 
    ? { ...item, value: newValue }
    : item
);
```

## Accessibility Features

### Built-in Accessibility
- **ARIA Labels**: Automatic generation of descriptive labels
- **Keyboard Navigation**: Full keyboard support with Tab, Enter, and Space
- **Screen Reader Support**: Semantic markup and live regions
- **Color Contrast**: WCAG AA compliant color combinations
- **Focus Management**: Clear focus indicators and logical tab order

### ARIA Labels Example
```typescript
// Automatically generates:
// aria-label="总职位数, value: 24, 当前活跃招聘职位, trend: increased by +12% 本月, clickable"
```

## Performance Optimizations

### 1. TrackBy Functions
```typescript
trackByItemId(index: number, item: BentoGridItem): string {
  return item.id;
}
```

### 2. Intersection Observer
Cards animate in when they enter the viewport:
- Lazy animation loading
- Reduces initial render cost
- Smooth scroll performance

### 3. Change Detection
- OnPush change detection strategy
- Minimal re-renders
- Optimized for large datasets

## Responsive Breakpoints

```scss
// Breakpoint system
$breakpoints: (
  'mobile': 480px,
  'tablet': 768px,
  'desktop': 1024px,
  'wide': 1200px
);
```

### Grid Behavior
- **≥1200px**: Full grid layout with all size variants
- **768px-1199px**: Reduced columns, large items span less
- **480px-767px**: Mobile optimization, simpler layouts
- **<480px**: Single column, optimized for small screens

## Best Practices

### 1. Information Hierarchy
```typescript
// Use size to indicate importance
const priorityOrder = [
  { id: 'key-metric', size: 'feature' },    // Most important
  { id: 'secondary', size: 'large' },       // Important
  { id: 'supporting', size: 'medium' },     // Standard
  { id: 'detail', size: 'small' }          // Supporting
];
```

### 2. Color Strategy
```typescript
// Use colors meaningfully
const colorStrategy = [
  { variant: 'primary', use: 'Key performance indicators' },
  { variant: 'success', use: 'Positive metrics and actions' },
  { variant: 'warning', use: 'Attention-needed items' },
  { variant: 'info', use: 'Informational content' },
  { variant: 'error', use: 'Error states and critical alerts' }
];
```

### 3. Content Guidelines
- **Titles**: 1-3 words, descriptive
- **Subtitles**: Brief context, 5-8 words
- **Values**: Use appropriate formatting (K, M suffixes)
- **Trends**: Include time period for context

### 4. Performance Guidelines
- Limit grid to 20-30 items maximum
- Use custom templates sparingly
- Implement proper trackBy functions
- Consider lazy loading for large datasets

## Error Handling

### Graceful Degradation
```typescript
// Handle missing data gracefully
const safeCard: BentoGridItem = {
  id: 'safe',
  title: data?.title || 'No Title',
  value: data?.value ?? 0,
  variant: data?.error ? 'error' : 'default'
};
```

### Loading States
```typescript
// Show loading state
const loadingCard: BentoGridItem = {
  id: 'loading',
  title: 'Loading...',
  subtitle: 'Fetching latest data',
  icon: 'clock',
  variant: 'default',
  size: 'medium'
};
```

## Migration Guide

### From Bootstrap Cards
```typescript
// Before (Bootstrap)
<div class="card">
  <div class="card-body">
    <h5 class="card-title">{{ title }}</h5>
    <p class="card-text">{{ value }}</p>
  </div>
</div>

// After (Bento Grid)
const bentoCard: BentoGridItem = {
  id: 'migrated',
  title: title,
  value: value,
  variant: 'default',
  size: 'medium'
};
```

### From Custom Grid
```typescript
// Before (Custom CSS Grid)
.custom-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

// After (Bento Grid)
<app-bento-grid 
  [gridSize]="'default'" 
  [items]="items">
</app-bento-grid>
```

## Browser Support
- **Chrome**: 88+
- **Firefox**: 85+
- **Safari**: 14+
- **Edge**: 88+
- **Mobile**: iOS 14+, Android 10+

## Future Roadmap
- [ ] Drag & drop reordering
- [ ] Saved layout preferences
- [ ] Animation presets
- [ ] Additional grid templates
- [ ] Dark mode support
- [ ] Export to PDF/image