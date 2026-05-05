---
name: design-recipe
description: Extract a recipe from a URL. Fetches the page, captures screenshots at desktop and mobile widths, identifies sections via multimodal analysis, and writes a recipe JSON to .design-rules/recipes/<name>.json. v1 supports the `extract` subcommand only.
argument-hint: extract <url> [--name=<name>] [--kind=<kind>] [--screenshot=<path>] [--viewport=both|desktop|mobile] [--unattended] [--dry-run] [--force]
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, WebFetch, Task
---

# /design-recipe — Recipe Extractor

You operate on a URL to produce a recipe JSON in the user's project. v1 has one subcommand: `extract`. Future subcommands (`list`, `delete`, `show`) are not implemented.

## Step 0: Parse arguments

Trim `$ARGUMENTS`. Inspect the first whitespace-delimited token:

- Empty / whitespace only → error: `Usage: /design-recipe extract <url> [flags]` and stop.
- `extract` → continue to Case: extract.
- Anything else → error: `Unknown subcommand "<token>". v1 supports only: extract.` and stop.

## Case: extract

Parse the remainder of `$ARGUMENTS`:

- First non-flag token after `extract` → `url`. Required.
- `--name=<name>` → `nameOverride`. Optional.
- `--kind=<kind>` → `kindOverride`. Optional. Valid: `dashboard`, `marketing`, `ecommerce`, `application-ui`, or any kebab-case string for future kinds.
- `--screenshot=<path>` → `screenshotOverride`. Optional. Path to a PNG/JPG.
- `--viewport=both|desktop|mobile` → `viewportMode`. Default: `both`.
- `--unattended` → `unattended` flag. Default: false.
- `--dry-run` → `dryRun` flag. Default: false.
- `--force` → `force` flag. Default: false.

If `url` is missing or doesn't start with `http://` or `https://`, error:

```
Usage: /design-recipe extract <url> [flags]
URL must be a full http(s):// URL.
```

Stop.

If both `--screenshot` and `--viewport=both` are passed, warn:

```
Note: --screenshot provides a single image; --viewport=both has no extra effect with a user-provided screenshot.
```

Continue.

## Step 1: Verify project initialized

Read `.design-rules/config.json` at the project root.

If missing, error:

```
No design system in this project — run `/design-init` first.
```

Stop.

If present, parse it. You don't need to use any field; this is just a guard so the agent doesn't write into an uninitialized project.

## Step 2: Resolve screenshot strategy

Decide `screenshotMode` based on flag precedence (highest priority first):

1. **`screenshotOverride` is set** (user passed `--screenshot=<path>`): `screenshotMode = "user-provided"`, `useChromeMcp = false`. The user-provided screenshot takes precedence over Chrome MCP — if you specified it, you want it used. Do not probe for Chrome MCP.
2. **Else, probe whether `mcp__Claude_in_Chrome__*` tools are available** in your environment. (You'll know based on whether the tool definitions appeared in your function list.)
   - If available → `screenshotMode = "chrome-mcp"`, `useChromeMcp = true`. Will use `tabs_create_mcp`, `tabs_context_mcp`, `navigate`, `resize_window`, and `computer` (action: screenshot) to capture viewports.
3. **Else (Chrome MCP unavailable AND no `--screenshot`):** prompt the user:

  ```
  Chrome MCP not detected and no --screenshot provided. Options:
  1. Install Claude in Chrome (https://claude.ai/chrome) and re-run
  2. Provide a screenshot path: --screenshot=<path>
  3. Proceed with HTML-only extraction (significantly less accurate)
  Type "html" to continue without screenshots, "cancel" to abort, or paste a screenshot path:
  ```

  - Response is a path → use it as `screenshotOverride`. Set `screenshotMode = "user-provided"`, `useChromeMcp = false`.
  - Response is "html" → set `screenshotMode = "html-only"`, `useChromeMcp = false`. Continue with degraded confidence.
  - Response is "cancel" or empty → stop, no files written.

After Step 2, exactly one of `screenshotMode ∈ {"chrome-mcp", "user-provided", "html-only"}` is set, and `useChromeMcp` is `true` only for `chrome-mcp`.

## Step 3: Derive recipe name

If `nameOverride` is set, validate it matches `^[a-z0-9][a-z0-9-]*$` (kebab-case, lowercase). If invalid, error: `--name must be kebab-case (lowercase letters, digits, hyphens; must start with a letter or digit).` and stop. Otherwise use it as `recipeName`. Skip the rest of this step.

Otherwise, derive `recipeName` from the URL:

1. **Parse the URL** (use Bash with `python -c` or equivalent if needed):
   - `protocol` (drop)
   - `host` — drop a leading `www.`
   - `port` — drop entirely (e.g., `localhost:3000` → `localhost`)
   - `path` — keep
   - `query` and `fragment` — drop entirely (`?foo=bar` and `#section` discarded; they don't represent layout)
2. **Normalize the host:**
   - If host is `localhost` or an IP literal (matches `^\d+\.\d+\.\d+\.\d+$` or contains `:` for IPv6), use the literal `localhost` or `<ip>` (replace `.` with `-` and `:` with `-`).
   - Else split on `.`. If the last segment is a 2-3 letter TLD (`com`, `io`, `net`, `org`, `app`, `co`, `dev`, `ai`, `so`) AND the second-to-last is also a 2-letter ccTLD candidate (`co.uk`, `com.au`), drop the last two segments. Otherwise drop only the last segment.
   - Examples: `stripe.com` → `stripe`; `linear.app` → `linear`; `www.notion.so` → `notion`; `shop.example.co.uk` → `shop-example`; `app.example.io` → `app-example`.
3. **Slug the path:**
   - Strip leading and trailing `/`.
   - Replace remaining `/` with `-`.
   - Replace any character not in `[a-z0-9-]` with `-` (lowercase first).
   - Collapse runs of `-`.
   - If empty after stripping, use `home`.
4. **Combine:** `<host-slug>-<path-slug>`. Lowercase. Collapse repeated `-`. Trim leading/trailing `-`.
5. **Validate length:** if longer than 64 characters, truncate to 64 and trim trailing `-`.

Examples:
- `https://stripe.com/pricing` → `stripe-pricing`
- `https://linear.app/` → `linear-home`
- `https://www.notion.so/product` → `notion-product`
- `https://app.example.io/dashboard/overview` → `app-example-dashboard-overview`
- `https://localhost:3000/foo?x=1#y` → `localhost-foo`
- `https://192.168.1.10/admin` → `192-168-1-10-admin`
- `https://shop.example.co.uk/checkout` → `shop-example-checkout`

Set `recipeName`.

## Step 4: Dispatch to recipe-extractor agent

Use the Task tool to invoke the `recipe-extractor` agent at `${CLAUDE_PLUGIN_ROOT}/agents/recipe-extractor.md`. Pass these inputs in the prompt (all required even if null):

- `url`
- `recipeName`
- `kindOverride` (or null)
- `useChromeMcp` (boolean)
- `screenshotMode` (one of `"chrome-mcp" | "user-provided" | "html-only"` — set in Step 2)
- `screenshotOverride` path (or null)
- `viewportMode`
- `unattended` flag
- The list of all bundled recipe paths: `${CLAUDE_PLUGIN_ROOT}/data/recipes/*.json` (use Glob)
- The list of project recipe paths: `.design-rules/recipes/*.json` (use Glob; may be empty)

The agent returns its result as a single fenced JSON code block — for example:

````
```json
{ "recipe": ..., "newVocabulary": [...], "notes": [...] }
```
````

**Parse the agent's output:**
1. Take the agent's full text response.
2. Extract the content between the first ```` ```json ```` (or ```` ``` ````) and its closing ```` ``` ````. If no fenced block is found, treat the entire response as the JSON candidate.
3. `JSON.parse` (or equivalent) the extracted text. If parse fails, surface the raw response to the user, do not write, stop with: `Agent returned malformed output. See above for raw response.`

Two valid result shapes:

- **Success:** `{ "recipe": <recipe object>, "newVocabulary": [<list of new type names introduced>], "notes": [<warnings or info>] }`
- **Failure:** `{ "error": "<message>", "stage": "<fetch | render | identify | format>" }`

If the result has an `error` field, surface the error and stage to the user, do not write, stop.

## Step 5: Pre-confirm

If `dryRun` is true, print the recipe JSON to chat in a code block, plus the agent's `notes` and `newVocabulary` summary. Skip steps 6-8.

Otherwise, print:

```
Extracted recipe `<recipeName>` (kind: <recipe.kind>) from <url>.

<pretty-printed recipe JSON>

New vocabulary: <comma-separated newVocabulary, or 'none'>
Notes: <newline-joined notes, or 'none'>

Save to .design-rules/recipes/<recipeName>.json? [Y/n]
```

If user types `n`/`no`, stop. No files written.
If user types `y`/`yes`/empty/return, continue to Step 6.

## Step 6: Conflict resolution

Check whether `.design-rules/recipes/<recipeName>.json` already exists.

If it does NOT exist, set `writePath` to the original path and proceed.

If it exists AND `force` is true: overwrite without asking. Set `writePath` to the original path.

If it exists AND `force` is false:

1. Compute the next available suffixed path. Strategy:
   - If `recipeName` already ends in `-<N>` where N is a positive integer (e.g., `stripe-pricing-2`), strip the suffix to get `baseName`. Otherwise `baseName = recipeName`.
   - Find the smallest integer `N >= 2` such that `.design-rules/recipes/<baseName>-<N>.json` does not exist. Call this `suggestedPath`.
2. Prompt:

   ```
   File exists at .design-rules/recipes/<recipeName>.json. Options:
   1. Overwrite
   2. Write to <suggestedPath>
   3. Cancel
   [1/2/3, default: 2]:
   ```

3. Default to option 2 on Enter or empty input. Map answer to `writePath`.

If user picks 3 / cancel, stop, no files written.

## Step 7: Write the recipe

Create `.design-rules/recipes/` if it doesn't exist (use Bash `mkdir -p .design-rules/recipes`).

Write the recipe JSON to `writePath` using Write. Use 2-space indent, with trailing newline.

## Step 8: Summary

Print:

```
Saved recipe `<recipeName>` to <writePath>.
  Kind: <recipe.kind>
  Sections: <count> (<comma-separated section types>)
  Source: <recipe.sourceUrl>
  Viewports captured: <recipe.viewportsCaptured joined>
  New vocabulary introduced: <newVocabulary or 'none'>
  Authenticated: <yes if recipe.authenticated, else omit line>

Next:
- /design-page <recipeName> "<description>" --recipe=<recipeName>  to scaffold a page using this recipe
- Edit <writePath> directly to refine props or section ordering
- Patterns for new vocabulary types live in adapters/react-shadcn/components/patterns/ — author when needed
```

## Notes for Claude

- Use absolute paths anchored at the project root for all file operations.
- The `${CLAUDE_PLUGIN_ROOT}` variable resolves at runtime to the plugin install directory.
- Don't invoke the agent more than once per call — it does the full extract in a single dispatch.
- If the agent returns malformed JSON, surface the raw output to the user and stop. Don't try to repair.
