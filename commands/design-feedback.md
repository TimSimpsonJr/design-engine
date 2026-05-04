---
name: design-feedback
description: Add appropriate user feedback states (loading, success, error, empty) to a component or page. Edits the target file to add the missing states using design-engine patterns.
argument-hint: <file-path>
allowed-tools: Read, Write, Edit, Grep, Glob
---

# /design-feedback — UX Feedback States Generator

Target: **$ARGUMENTS**

You are editing a target file to add the four data-state UI patterns: loading (skeleton), empty (zero data), error (load failed), success (action confirmation). Output is an in-place edit of the target file, plus a short summary of what was added.

## Instructions

1. **Validate the target.**

   - If `$ARGUMENTS` is empty or the file doesn't exist, error: `Usage: /design-feedback <file-path>`. Stop.
   - If the file isn't a component-like file (extension `.tsx`, `.jsx`, `.svelte`, `.astro`, `.vue`), warn the user and confirm before proceeding.
   - Read the file. Identify all data-dependent areas (places that render based on async state — fetch results, props that could be empty, lists, charts, etc.).

   If the file has zero data-dependent areas, error: "No data-dependent regions detected in `<path>`. Add a fetch or prop-driven render before running /design-feedback." Stop.

2. **Read project context:**
   - `.design-rules/config.json` for the active adapter
   - The active adapter's manifest and theme tokens (so the skeleton uses the right `--surface-muted`, `--shadow-card`, etc.)
   - Any nearby `DESIGN-LANGUAGE.md` reference for project-specific feedback rules

3. **For each data-dependent area, implement ALL 4 states.**

### State 1: Loading (Skeleton)

The skeleton must match the final layout's shape — same dimensions, same hierarchy.

```tsx
// Skeleton must match the final layout shape
<div className="bg-card rounded-2xl p-6 shadow-[var(--shadow-card)]">
  <div className="flex items-center gap-2 mb-3">
    <div className="size-7 bg-surface-muted rounded-lg animate-pulse" />
    <div className="h-3 w-16 bg-surface-muted rounded animate-pulse" />
  </div>
  <div className="h-9 w-24 bg-surface-muted rounded-lg animate-pulse mb-3" />
  <div className="h-3 w-12 bg-surface-muted rounded animate-pulse" />
</div>
```

Rules:

- Show skeleton for 300ms minimum (prevent flash)
- Delay skeleton display by 300ms (fast loads skip skeleton entirely)
- Use `animate-pulse` (1.5s cycle)
- Match skeleton shapes to real content dimensions
- Never use spinners inside cards
- Respect `prefers-reduced-motion` — disable `animate-pulse` when reduced motion is preferred

### State 2: Empty (Zero Data)

```tsx
<EmptyState
  icon={PackageIcon}
  title="No activity yet"
  description="Create your first project to get started."
  action={<Button>Create Project</Button>}
/>
```

Rules:

- Center-aligned in the card
- Icon: 32px, `text-text-tertiary`
- Title: 14px, `text-text-secondary`
- Always suggest a next action
- Zero values show as "0" (don't hide or dash)

### State 3: Error (Load Failed)

```tsx
<div className="flex flex-col items-center justify-center py-8 text-center">
  <AlertCircle className="size-8 text-destructive mb-3" />
  <p className="text-[14px] text-text-secondary mb-4">Couldn't load the data</p>
  <Button variant="brandGhost" size="sm" onClick={retry}>Try again</Button>
</div>
```

Rules:

- Partial failure: only the affected card shows error, the rest loads normally
- Full page failure: full-screen EmptyState with retry
- Error message: plain language, blame the system
- Always provide a retry button

### State 4: Success (Action Feedback)

```tsx
// Toast notification for action confirmations
toast("Changes saved")

// With undo for destructive actions
toast("Item deleted", { action: { label: "Undo", onClick: handleUndo } })
```

Rules:

- Info toast: 3s display
- Action toast (with undo): 5s display
- Toast position: above BottomNav
- One toast at a time (new replaces old)

4. **Implementation pattern.**

   Refactor each data-dependent area into a state machine:

   ```tsx
   function DataCard({ data, isLoading, error }) {
     if (isLoading) return <DataCardSkeleton />
     if (error) return <DataCardError onRetry={refetch} />
     if (!data || data.length === 0) return <DataCardEmpty />
     return <DataCardContent data={data} />
   }
   ```

   Adapt to the file's framework idiom:
   - **React/TSX**: early-return pattern as shown above
   - **Svelte**: `{#if isLoading}…{:else if error}…{:else if !data}…{:else}…{/if}` blocks
   - **Astro**: server-side rendering means loading/error states usually live on the client island; keep the empty state inline
   - **Vue**: `v-if` / `v-else-if` chain

5. **Edit the target file.**

   Use Edit (or Write if structural rewrite is needed). Add:
   - Imports for any new components (`Button`, `AlertCircle`, `EmptyState`, `toast` from the project's toast library)
   - The skeleton, empty, and error sub-components (or inline JSX)
   - The early-return state machine in the main component
   - A `prefers-reduced-motion` check for `animate-pulse` if not already handled globally

   If the file already has some states (e.g., loading is wired up but empty isn't), only add what's missing — don't duplicate.

6. **Summary.**

   Print:

   ```
   Added feedback states to <path>.
     States added: <loading | empty | error | success — list only what was new>
     States already present: <list>

   Manual follow-ups:
   - Wire up `retry` callback to your fetch logic if not already
   - Pick an icon for the empty state (currently <Icon> placeholder)
   - Adjust empty-state title/description copy — see /design-copy "empty state" "<context>"
   - Confirm `prefers-reduced-motion` is respected globally
   ```

## Notes for Claude

- Use absolute paths for all file operations.
- Don't break the file's existing logic — add states alongside, not in place of, working code.
- Toast libraries vary across projects (sonner, react-hot-toast, custom). Check imports before assuming `toast()` is available; if no library is imported, leave a comment placeholder and tell the user in the summary.
- If the file is large or the data flow is unclear, ask one clarifying question before editing (e.g., "Which prop drives the data fetch — `data`, `items`, or `entries`?") rather than making blind assumptions.
- The four feedback rules align with design-engine's design-language skill (rule 29 skeleton, rule 30 empty/error states, rule 35 toast rules). If the user has a stricter convention in `DESIGN-LANGUAGE.md`, defer to that.
