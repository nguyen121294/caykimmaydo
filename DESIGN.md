---
version: alpha
name: MayDo Operations
description: A practical sales and operations dashboard for a Vietnamese made-to-measure fashion team.
colors:
  primary: "#4F46E5"
  primary-hover: "#4338CA"
  canvas: "#F8FAFC"
  surface: "#FFFFFF"
  surface-muted: "#F1F5F9"
  text: "#0F172A"
  text-muted: "#64748B"
  border: "#E2E8F0"
  success: "#047857"
  warning: "#B45309"
  danger: "#B91C1C"
typography:
  headline-lg: { fontFamily: Inter, fontSize: 24px, fontWeight: 700, lineHeight: 1.35 }
  headline-md: { fontFamily: Inter, fontSize: 18px, fontWeight: 600, lineHeight: 1.4 }
  body-md: { fontFamily: Inter, fontSize: 14px, fontWeight: 400, lineHeight: 1.6 }
  body-sm: { fontFamily: Inter, fontSize: 13px, fontWeight: 400, lineHeight: 1.5 }
  label-md: { fontFamily: Inter, fontSize: 13px, fontWeight: 600, lineHeight: 1.4 }
  label-sm: { fontFamily: Inter, fontSize: 12px, fontWeight: 500, lineHeight: 1.4 }
rounded:
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: 10px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 10px
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: 16px
---

# MayDo Operations

## Overview

An internal desktop-first workspace for sales, customer service, production, and reporting. The visual language is compact, calm, and operational. The existing indigo identity and shared application shell remain the anchor.

## Colors

- Indigo is reserved for primary actions, selected navigation, and focus states.
- Slate surfaces keep long operational sessions comfortable and readable.
- Semantic colors communicate real status only. Platform brand colors may appear only inside platform identity marks.

## Typography

Inter remains the application typeface because it is already loaded with Vietnamese support. Hierarchy comes from weight and size, not mixed font families.

## Layout

Use a responsive single-column page flow. Dense workspaces may use three panes on large screens, two panes on tablets, and a single focused pane on mobile. Use the 8px spacing rhythm and preserve the shared sidebar.

## Elevation & Depth

Use surface contrast and thin slate borders before shadows. Shadows are limited to dialogs and temporary overlays.

## Shapes

Panels use 12px corners, controls use 8px corners, and status chips may be fully rounded. Avatar circles are the only other full-radius element.

## Components

- Conversation rows must show platform, customer, last message, time, and unread state at a glance.
- Message bubbles distinguish inbound and outbound messages through alignment and surface, not decorative gradients.
- Quick-order forms keep labels above inputs and remain visible beside the active conversation on large screens.
- Loading, empty, disconnected, partial-error, and success states are required for every external platform.

## Do's and Don'ts

- Do preserve the `/sales` route, Kanban workflow, sidebar, and existing copy style.
- Do make partial platform failures visible without blocking healthy platforms.
- Do use only real connected-platform data. Never invent customer messages.
- Don't expose access tokens, raw provider payloads, or internal API errors in the interface.
- Don't use platform color as the page-wide accent.
- Don't hide required form labels inside placeholders.
