---
name: LHU IT LAB
description: Light lab-management workspace with an original split account page and compact white form.
colors:
  background: "hsl(210 40% 98%)"
  foreground: "hsl(222 47% 11%)"
  card: "hsl(0 0% 100%)"
  primary: "hsl(215 91% 56%)"
  primary-foreground: "hsl(0 0% 100%)"
  secondary: "hsl(214 32% 95%)"
  secondary-foreground: "hsl(215 28% 17%)"
  muted-foreground: "hsl(215 16% 47%)"
  border: "hsl(214 28% 90%)"
  destructive: "hsl(0 72% 51%)"
  auth-background: "#f4f8fd"
  auth-card: "#ffffff"
  auth-input-border: "#e2e8f0"
  auth-text: "#0f172a"
  auth-description: "#64748b"
  auth-primary: "#297ef5"
  auth-primary-hover: "#2563eb"
  auth-link: "#2563eb"
  auth-focus: "#1d6de0"
typography:
  body:
    fontFamily: 'Inter, "Segoe UI", system-ui, sans-serif'
    fontSize: "14px"
    lineHeight: "20px"
  headline:
    fontFamily: 'Inter, "Segoe UI", system-ui, sans-serif'
    fontSize: "24px"
    fontWeight: 700
    lineHeight: "32px"
    letterSpacing: "-0.025em"
  title:
    fontFamily: 'Inter, "Segoe UI", system-ui, sans-serif'
    fontSize: "16px"
    fontWeight: 700
    lineHeight: "24px"
  label:
    fontFamily: 'Inter, "Segoe UI", system-ui, sans-serif'
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "16px"
  auth-title:
    fontFamily: 'Inter, "Segoe UI", system-ui, sans-serif'
    fontSize: "26px"
    fontWeight: 750
    lineHeight: 1.35
    letterSpacing: "-0.5px"
  auth-body:
    fontFamily: 'Inter, "Segoe UI", system-ui, sans-serif'
    fontSize: "13px"
    lineHeight: 1.75
rounded:
  xl: "12px"
  2xl: "16px"
  full: "9999px"
  auth-control: "9px"
  auth-card: "20px"
spacing:
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  auth-form: "15px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.xl}"
    padding: "8px 16px"
    height: "40px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.2xl}"
  input:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.xl}"
    padding: "8px 12px"
    height: "40px"
  auth-button-primary:
    backgroundColor: "{colors.auth-primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.auth-control}"
    padding: "11px 16px"
    width: "100%"
  auth-button-primary-hover:
    backgroundColor: "{colors.auth-primary-hover}"
  auth-input:
    backgroundColor: "{colors.auth-card}"
    textColor: "{colors.auth-text}"
    rounded: "{rounded.auth-control}"
    padding: "0 43px 0 42px"
    height: "46px"
    width: "100%"
---

# Design System: LHU IT LAB

## Overview

The incumbent workspace uses light slate surfaces, blue actions, white cards, and a navy navigation rail. Its information density supports daily lab administration. The existing LHU symbol and wordmark provide continuity between the workspace and account pages.

The user's correction on 04 November 2026 preserves the original account-page composition: navy introduction, LHU brand, hero copy, and metrics on the left; a light surface and compact white account form on the right. Only the form receives the requested compact refinement. The chat references guide that form within the incumbent page under Impeccable new-work §3's narrow-request exemption; FORM seed/rank is N/A. No randomized direction, new site-wide identity, or exact pixel tracing was requested. The surface contract and evidence live in `designs/auth-pages/README.md`.

**Key Characteristics:**

- Light dashboard content with a dark navigation rail.
- Original split account page with a compact, single-column white form.
- Blue actions, restrained outlines, and rounded controls.
- Vietnamese interface copy with explicit progress and availability states.

## Colors

The frontmatter preserves shared CSS tokens in their source HSL format and scoped auth colors in their source hex format.

### Primary

- **Workspace blue:** shared primary actions and focus rings.
- **Account blue:** account primary actions; its hover sibling remains distinct from the global primary token. The latest user reference restores the original brighter blue, pale input borders, and slate placeholder/icon colors. The prior darker accessibility refinement is superseded by this explicit visual preference; do not carry its contrast claims forward. Keep the stronger keyboard focus and semantic error states.
- **Account link blue:** secondary navigation within white account cards.

### Neutral

- **Cool slate and white:** shared page backgrounds, panels, borders, and text hierarchy.
- **Deep navy:** the incumbent account introduction and dashboard navigation rail, paired with pale text; account forms remain white on a light blue-gray surface.
- **Destructive red:** shared destructive actions. Account errors use dark rose text on pale rose panels from the auth stylesheet.

**The Scope Rule.** Preserve the original account-page backdrop, brand, introduction, and metrics; refine the compact form within the light right-hand surface. Keep shared global tokens light. The profile authentication-method panel and teacher-review panel retain incumbent light dashboard styling; the conditional Google-linking inset is pale slate and reuses light account controls.

## Typography

The shared sans stack is Inter, Segoe UI, system-ui, sans-serif. Inter is declared as a preference, not bundled or loaded by the root layout. Account pages inherit this stack. These are functional UI stacks, not a separate display-face identity.

- **Workspace headline:** frontmatter headline role; grows to 30px/36px from the shared small breakpoint.
- **Panel title, body, and badge label:** compact hierarchy from the shared title, body, and label roles.
- **Auth title:** centered, strong, tightly spaced; reduces to 24px on narrow screens.
- **Auth body:** descriptions, field text, and links share a compact scale; hints use 11px and notices 12px.
- **Incumbent account hero:** the left introduction retains its large 48px, weight-800 heading, tight tracking, and blue-to-cyan emphasis; this display treatment belongs to that existing hero.
- **OTP:** one input uses Courier New/monospace, 26px, weight 700, and 10px letter spacing. It is a verification-specific treatment.

## Layout

The dashboard keeps its incumbent shell: a 260px desktop navigation rail that can collapse to 76px, a 68px header, and content constrained to 1600px. Content padding progresses from 16px to 24px to 28px. Below the large breakpoint the rail is an off-canvas drawer with an overlay.

Account pages use a full-height grid shell (`100svh`). At 1024px and above, its two columns are 1.05fr / 0.95fr: the original navy introduction occupies the left, and the light right section centers one white card capped at 410px. The left retains the brand, hero, three metric tiles, and attribution. Right-section padding is 48px 40px; card padding is 34px 30px 30px. Fields form one column with the auth-form gap.

Below 1024px, the introduction is hidden and a mobile brand appears above the form; content padding is 100px 40px 48px. At 540px and below, content padding becomes 100px 18px 36px, card padding 30px 22px 26px, and its radius becomes 19px. Resend rows wrap; long account text can break within a word.

## Elevation & Depth

White dashboard cards use the shared soft card shadow and subtle borders. The navigation rail and active navigation item have their own deeper shadows. The original account introduction retains its diagonal navy gradient, faint radial lighting, grid texture, and translucent metric tiles. The account form is a borderless white card with a diffuse blue-gray shadow on the light surface. Exact gradients, shadows, breakpoints, and transitions are recorded in `.impeccable/design.json` rather than duplicated as frontmatter primitives.

The sidecar's eight-step tonal ramps are synthesized OKLCH preview metadata, not additional shipped CSS tokens. Its component snippets expand existing source styles for standalone previews.

**The Surface Boundary Rule.** Keep the original textured navy introduction distinct from the light form area; use the white account-card treatment for account tasks and incumbent dashboard containers for workspace content.

## Shapes

Shared controls use the xl radius; standard cards use 2xl. Status badges are pills. Auth controls use the smaller auth-control radius within the larger auth-card silhouette. Account password visibility controls are inset, and numbered registration steps and result icons are circular.

## Components

- **Workspace buttons:** primary, destructive, outline, secondary, ghost, and link variants. Default height is 40px; small and large sizes are 36px and 44px. Primary hover darkens and lifts by 1px. Keyboard focus uses a ring and offset; disabled controls suppress pointer interaction and reduce opacity.
- **Workspace cards and inputs:** white panels with slate borders; card sections normally use 20px padding. Inputs use a blue border and pale ring on focus. The profile methods and teacher-review sections stay within this light vocabulary.
- **Badges and navigation:** semantic blue/slate/emerald/amber/red pills; sidebar active links use a blue gradient with white text, while inactive links use muted light text and a translucent hover surface.
- **Brand:** the existing LHU symbol sits on a white rounded square beside “LHU IT LAB” and its small descriptor. Compact mode hides the wordmark; do not substitute a generated logo.
- **Account card and actions:** a centered heading, optional description, and task-specific contents. Primary buttons are full width with a minimum height of 46px; links gain an underline on hover. Card links/buttons have a visible 2px focus outline with 4px offset. Auth transitions are 150ms and disabled within cards for reduced motion.
- **Account fields:** white fields with pale blue-gray borders, slate text, leading SVG icons, and placeholders. Login shows the associated labels above each field (13px, weight 600, slate #475569, 8px separation); other flows retain screen-reader labels. Icons and password reveal are positioned within a separate relative input wrapper. Password visibility is an accessible toggle. Focus adds a blue ring; invalid fields use a rose border and errors use alert panels.
- **Verification flow:** registration advances through email, verification, and completion. OTP remains one pasteable six-digit field with numeric keyboard/autofill hints. Cooldown, expiry, and remaining resend counts are visible; busy actions disable submission. Teacher registration can end in a pending-review screen. Email change verifies current and new addresses before confirmation.
- **Google:** the configured provider renders its own outline-theme Google button. Loading/unavailable uses a disabled light local fallback and honest availability text. The sidecar previews local primitives only; it does not simulate Google authentication.

## Do's and Don'ts

### Do:

- **Do** preserve the original split account backdrop, brand, hero, and metrics while refining only the compact form.
- **Do** reuse the actual LHU brand assets, accessible labels, keyboard focus, and one-field OTP behavior.
- **Do** keep error, loading, cooldown, and provider-unavailable states explicit.
- **Do** use source files and dated frontend screenshots as visual evidence; earlier checks describe the revision they captured.

### Don't:

- **Don't** turn the account form or global theme dark when applying the compact-form reference.
- **Don't** remove the original account introduction or metrics on desktop as part of a form-only refinement.
- **Don't** describe mocked UI checks as successful Google, SMTP, or SQL integration.
- **Don't** treat an OTP-specific monospace field or incumbent decorative uppercase eyebrows as a general typography rule.

Evidence limits: the 03 November 2026 implementation session recorded 181 passing tests across 17 files, typecheck, production build, a detector with zero findings, and browser checks using intercepted synthetic auth responses without DB access or real email. Those are historical results for that revision. The 04 November source correction is documented here; current typecheck/browser verification is handled separately by the implementation pass, and this document does not assert a new independent ship review. Actual Google/SMTP configuration remains pending. Original reference images remain in chat only. This documentation pass reads source and existing evidence; it does not rerun checks.
