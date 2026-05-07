---
name: design-flow
description: Design user flows and navigation structure following proven UX patterns. Outputs a flow diagram (text-based) and navigation map for the user to implement.
argument-hint: <flow-name> "<description>"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# /design-flow — UX Flow Designer

> **Active design system:** if `<project-root>/DESIGN.md` exists, read it for narrative context. The "Visual Theme & Atmosphere" and "Do's and Don'ts" sections are particularly relevant to generation tone.

Design a user flow: **$0**
Description: $ARGUMENTS

You are designing a user flow for the project — screen sequence, navigation pattern, edge cases, and (optionally) scaffolding follow-up commands. The output is a structured plan: ASCII flow diagram, screen inventory, edge-case list, and suggested next commands.

## Instructions

1. **Read project context:**
   - `.design-rules/config.json` to know the active adapter and recipe (informs which patterns are available)
   - `CLAUDE.md` — design conventions, component inventory if listed
   - Any `DESIGN-LANGUAGE.md` if present
   - `src/components/patterns/` (or adapter-equivalent) to see what's already built

   None are strictly required. If the project isn't initialized, you can still produce a flow design — it just won't reference real component names.

2. **Apply UX principles:**

### Information Architecture

- **Progressive Disclosure**: Show only what's needed at each step. Hide complexity behind logical drill-downs.
- **Miller's Law**: Chunk information into groups of 5–9 items maximum.
- **Hick's Law**: Minimize choices per screen. Fewer options = faster decisions.

### Navigation Patterns

- **Hub & Spoke**: Dashboard → detail pages → back to dashboard (default for mobile apps)
- **Linear Flow**: Step 1 → Step 2 → Step 3 (for forms, onboarding, checkout)
- **Tab Navigation**: 3–5 top-level sections via BottomNav

Pick the pattern that matches the user's goal. State it explicitly.

### Screen Flow Rules

- Every flow must have a **clear entry point** and **clear exit point**
- Maximum **3 taps** to reach any key feature from the home screen
- Back navigation must always be available (except root screens)
- Error states must provide **recovery paths** (retry, go back, contact support)
- Loading states must use skeleton screens (never spinners in cards)

### Page Composition

- Follow the **Information Pyramid**: Hero → KPI Grid → Details → Lists
- Each screen should answer ONE primary question
- Above the fold: the most important metric or action
- Use the 4 section types: Full Card (A), Grid (B), Carousel (C), Hero (D)

3. **Output format:**

   Produce four sections:

   ### Flow diagram (ASCII)

   Show screen connections and the navigation pattern. Example:

   ```
   [ Home ]
      ↓ tap "Send Money"
   [ Recipient Picker ]
      ↓ select recipient
   [ Amount Entry ]
      ↓ confirm
   [ Review & Send ]
      ↓ confirm
   [ Success ] → tap "Done" → back to [ Home ]
   ```

   ### Screen inventory

   For each screen, list:
   - Purpose (one line)
   - Key components (TopBar, HeroCard, KPI grid, list, etc. — use real component names from the project if you found them)
   - Primary action (the single most important thing the user does on this screen)

   ### Edge cases

   For each screen, name the four feedback states:
   - **Loading** — what shows while data fetches (skeleton shape)
   - **Empty** — what shows when there's no data (icon + message + suggested action)
   - **Error** — what shows on load failure (message + retry)
   - **Success** — what confirms a completed action (toast or full-screen confirmation)

   ### Suggested next commands

   Map each screen in the inventory to a follow-up command:
   - `/design-page <kebab-name> "<purpose>"` for each screen
   - `/design-pattern <name> "<purpose>"` for any custom composed pattern needed
   - `/design-feedback <file-path>` once pages exist, to wire up the four states
   - `/design-copy <context> "<purpose>"` for microcopy specifics

4. **Optional: save the flow as a markdown file.**

   After printing the flow, ask the user:

   ```
   Save this flow design to docs/flows/<flow-name>.md? [Y/n]
   ```

   If yes, create `docs/flows/` if needed and write the four sections as a single markdown file. Use the user's `<flow-name>` argument as the filename (kebab-cased). If the file already exists, prompt before overwriting.

## Notes for Claude

- Don't generate the actual page files in this command — that's `/design-page`'s job. This command produces the plan; the suggested-commands list at the end is the bridge.
- Be specific about navigation: name the gestures (tap, swipe, back-button) and surfaces (BottomNav, TopBar back arrow, in-card link).
- If the description involves authentication, payments, or other regulated flows, note that explicitly — those flows have specific patterns the user should research separately.
- The "max 3 taps" rule is a guideline, not a hard cap. If the flow naturally requires more steps (multi-step onboarding, checkout), that's fine — but flag it and consider whether a step can be combined.
