# Design Tokens - YouTube Pipeline

Generated from /design-html on 2026-05-16

## Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-dark` | #0f0f0f | Main background |
| `--bg-darker` | #0a0a0a | Page background |
| `--bg-panel` | #1f1f1f | Card/panel background |
| `--bg-hover` | #303030 | Hover states |
| `--accent-red` | #ff0000 | Primary accent, buttons |
| `--accent-red-dim` | rgba(255, 0, 0, 0.15) | Selected states |
| `--text-white` | #ffffff | Primary text |
| `--text-gray` | #aaaaaa | Secondary text |
| `--text-muted` | #888888 | Muted text |
| `--border-color` | #3f3f3f | Borders |
| `--success` | #2ba640 | Success states |
| `--warning` | #f9a825 | Warning states |
| `--danger` | #cc0000 | Error states |

## Typography

| Token | Value | Usage |
|-------|-------|-------|
| `--font-ui` | Roboto | Primary UI font |
| `--font-mono` | Roboto Mono | Code/data display |

Font weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

## Spacing Scale

| Token | Value |
|-------|-------|
| `--spacing-xs` | 4px |
| `--spacing-sm` | 8px |
| `--spacing-md` | 16px |
| `--spacing-lg` | 24px |
| `--spacing-xl` | 32px |

## Layout

- Sidebar width: 220px
- Content max-width: fluid (flex)
- Breakpoints: 375px (mobile), 768px (tablet), 1024px+ (desktop)

## Theme

Dark theme by default (YouTube-style). Uses `prefers-color-scheme` for potential light mode support.