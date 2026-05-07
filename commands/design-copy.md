---
name: design-copy
description: Generate UX microcopy (button labels, error messages, empty states, toasts) following a casual-but-polite voice and tone. Output is text suggestions for the user to apply to their UI.
argument-hint: <context> "<description>"
allowed-tools: Read, Grep, Glob
---

# /design-copy — UX Microcopy Generator

> **Active design system:** if `<project-root>/DESIGN.md` exists, read it for narrative context. The "Visual Theme & Atmosphere" and "Do's and Don'ts" sections are particularly relevant to generation tone.

Context: **$0**
Description: $ARGUMENTS

You are generating UX microcopy for the user — text suggestions they will paste into their UI. This command does not write files. It outputs primary copy plus variants and a short do-and-don't list scoped to the requested context.

## Instructions

1. **Read the design-engine reference if it exists in the project:**
   - `.design-rules/config.json` (to know which skin/font is active — affects voice subtly)
   - Any `DESIGN-LANGUAGE.md` or `CLAUDE.md` "Design Engine Conventions" section

   None of these are required. If absent, fall back to the principles below.

2. **Apply the voice principles:**

### Tone Rules

- **Casual but polite**: Friendly, not robotic. Like talking to a helpful friend.
- **Active voice**: "We saved your changes" not "Your changes have been saved"
- **Positive framing**: "Free shipping on orders over $30" not "Orders under $30 have shipping fees"
- **Plain language**: "Send money" not "Initiate transfer"
- **Concise**: Every word must earn its place

### Copy Patterns by Context

#### Button Labels (CTA)

```
Format: [Action verb] + [Object] (optional)
Good: "Place order", "Get started", "Save changes", "Try again"
Bad:  "Submit", "OK", "Click here", "Proceed to next step"
```

- One primary CTA per screen
- Label must clearly describe what happens next
- Max 3 words for primary CTA

#### Empty States

```
Format: [Friendly observation] + [Suggested action]
Good: "No activity yet. Create your first project to get started."
Bad:  "No data found."
```

- Always suggest a next action
- Use a relevant icon (32px, text-text-tertiary)
- Tone: encouraging, not blaming

#### Error Messages

```
Format: [What happened] + [What to do]
Good: "Couldn't load the data. Please try again."
Bad:  "Error 500: Internal Server Error"
```

- Never show technical errors to users
- Blame the system, not the user
- Always provide a recovery action

#### Toast Notifications

```
Format: [Confirmation of what happened]
Good: "Saved!", "Changes applied", "Item deleted · Undo"
Bad:  "Operation completed successfully"
```

- Max 2 lines
- Include "Undo" link for reversible destructive actions
- Info toasts: 3 seconds. Action toasts: 5 seconds.

#### Form Labels & Helpers

```
Label: Noun phrase ("Email address", "Password")
Placeholder: Example or hint ("name@example.com")
Helper: Format guidance ("Must be at least 8 characters")
Error: Specific issue ("This email is already registered")
```

#### Confirmation Dialogs

```
Title: [Question about the action]
Body: [Consequence explanation]
Primary: [Action verb] ("Delete", "Confirm")
Secondary: "Close" (not "Cancel" — avoids confusion)
```

3. **Generate copy for the requested context.**

   Identify the context from the user's arguments (button, empty state, error, toast, form, dialog, or general). If unclear, ask one short clarifying question before generating.

   Output structure:

   ```
   Context: <button label | empty state | error | toast | form | dialog | other>

   Primary copy:
     <main suggestion>

   Variants:
   - <variant 1 — for tone shift, length, or context>
   - <variant 2>
   - <variant 3 if useful>

   Do:
   - <specific guidance for this context>
   - <…>

   Don't:
   - <specific anti-patterns to avoid>
   - <…>
   ```

   For multi-element flows (e.g., a confirmation dialog with title + body + buttons), output each element separately.

4. **Don't write files.** This command is suggestion-only — the user applies copy manually so they can adjust voice to match their product.

## Notes for Claude

- Keep variants meaningfully different from the primary — don't just rephrase. Show a shorter version, a more enthusiastic version, a more neutral version, etc.
- For destructive actions, surface "Undo" as a hard requirement in the do-list.
- For loading and skeleton patterns, send the user to `/design-feedback` instead — it edits files to add the actual states.
- Voice can be tuned per project. If the user has a `DESIGN-LANGUAGE.md` or similar with specific tone rules, defer to those.
