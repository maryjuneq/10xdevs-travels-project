# VibeTravels Styling Guide

## Color Theme Overview

This app uses a **dark blue theme** with carefully selected colors to create a professional, modern look. The theme is built using CSS custom properties (variables) and works exclusively in dark mode.

## Color Palette

### Primary Colors (Blue Tones)

1. **Primary Blue** (`--primary`)
   - Used for: Primary actions, links, focus states
   - Value: `oklch(0.60 0.20 240)` - A vibrant, medium-bright blue
   - Usage: Buttons, links, highlights

2. **Background** (`--background`)
   - Used for: Main page background
   - Value: `oklch(0.12 0.025 240)` - Deep navy blue
   - Creates a professional, calm atmosphere

3. **Card/Surface** (`--card`)
   - Used for: Elevated surfaces, cards, modals
   - Value: `oklch(0.17 0.028 240)` - Slightly lighter navy
   - Provides subtle depth and hierarchy

### Secondary Colors (Blue-Gray Tones)

4. **Secondary** (`--secondary`)
   - Used for: Less prominent UI elements
   - Value: `oklch(0.22 0.025 240)` - Dark blue-gray
   - Usage: Secondary buttons, inactive states

5. **Muted** (`--muted`)
   - Used for: Background of muted elements
   - Value: `oklch(0.22 0.025 240)` - Same as secondary for consistency
   - Usage: Disabled inputs, subtle backgrounds

6. **Accent** (`--accent`)
   - Used for: Hover states, subtle highlights
   - Value: `oklch(0.28 0.032 240)` - Lighter blue-gray
   - Usage: Hover backgrounds, subtle emphasis

### Text Colors

7. **Foreground** (`--foreground`)
   - Used for: Primary text
   - Value: `oklch(0.95 0.008 240)` - Light blue-tinted white
   - Ensures excellent readability

8. **Muted Foreground** (`--muted-foreground`)
   - Used for: Secondary text, descriptions, labels
   - Value: `oklch(0.62 0.018 240)` - Muted blue-gray text
   - Usage: Captions, helper text, placeholders

### Utility Colors

9. **Destructive** (`--destructive`)
   - Used for: Delete buttons, error states, warnings
   - Value: `oklch(0.58 0.22 20)` - Warm red
   - Usage: Delete actions, errors

10. **Border** (`--border`)
    - Used for: Borders, dividers
    - Value: `oklch(0.28 0.032 240 / 50%)` - Semi-transparent blue
    - Creates subtle separation without harsh lines

## Using the Theme

### In React/TSX Components

Always use Tailwind's theme variables instead of hardcoded colors:

```tsx
// ✅ Good - uses theme variables
<div className="bg-card text-foreground border border-border">
  <h1 className="text-primary">Title</h1>
  <p className="text-muted-foreground">Description</p>
</div>

// ❌ Bad - hardcoded colors
<div className="bg-gray-800 text-white border border-gray-700">
  <h1 className="text-blue-500">Title</h1>
  <p className="text-gray-400">Description</p>
</div>
```

### Common Patterns

#### Cards
```tsx
<div className="bg-card border border-border rounded-lg p-6 shadow-lg">
  {/* Card content */}
</div>
```

#### Primary Button
```tsx
<button className="bg-primary text-primary-foreground hover:bg-primary/90">
  Click me
</button>
```

#### Destructive Button
```tsx
<button className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
  Delete
</button>
```

#### Muted Text
```tsx
<p className="text-muted-foreground">
  This is helper text
</p>
```

#### Subtle Background
```tsx
<div className="bg-secondary/50">
  {/* Content with subtle background */}
</div>
```

## Design Principles

### 1. Simplicity
- Maximum 3 color families: Blue, Blue-gray, and Red (for destructive)
- Consistent use of shades from the same color family

### 2. Hierarchy
- Background: Darkest (navy)
- Cards: Slightly lighter
- Interactive elements: Bright blue
- Text: Light with good contrast

### 3. Accessibility
- All text meets WCAG AA contrast requirements
- Focus states use visible blue ring
- Hover states have clear visual feedback

### 4. Consistency
- Always use CSS variables, never hardcode colors
- Use opacity modifiers (e.g., `/50`, `/80`) for subtle variations
- Maintain consistent spacing and border radius

## Additional Utilities

### Glass Effect
```tsx
<div className="glass-card">
  {/* Glassmorphism effect */}
</div>
```

### Custom Scrollbar
Automatically styled in dark blue theme to match the overall design.

## Customizing Colors

To modify the theme, edit `src/styles/global.css` and update the CSS variables in the `.dark` class. All changes will automatically propagate throughout the app.

Example:
```css
.dark {
  --primary: oklch(0.60 0.20 240); /* Change this to adjust primary color */
}
```

## Tips for Maintaining the Theme

1. **Never use `dark:` prefix** - The app is always in dark mode
2. **Use semantic color names** - Use `primary`, `secondary`, not `blue-500`
3. **Test contrast** - Ensure text is readable on backgrounds
4. **Be consistent** - Stick to the defined color palette
5. **Use opacity modifiers** - For hover states, use `/80` or `/90` instead of new colors

## Color Reference Table

| Variable | Purpose | Example Usage |
|----------|---------|---------------|
| `background` | Page background | `bg-background` |
| `foreground` | Primary text | `text-foreground` |
| `card` | Elevated surfaces | `bg-card` |
| `primary` | Primary actions | `bg-primary`, `text-primary` |
| `secondary` | Secondary UI | `bg-secondary` |
| `muted` | Disabled/inactive | `bg-muted` |
| `muted-foreground` | Secondary text | `text-muted-foreground` |
| `accent` | Highlights | `bg-accent` |
| `destructive` | Delete/errors | `bg-destructive` |
| `border` | Borders/dividers | `border-border` |
| `ring` | Focus rings | Focus states |

---

**Remember**: Consistency is key! Always use these theme variables to maintain a cohesive, professional appearance throughout the application.
