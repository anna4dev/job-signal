# Contributing to Job Signal

Thank you for contributing. This project values **small, reviewable changes** over large mixed diffs.

## Atomic Commits

### Principle

- **One commit = one independently reviewable intent.** Any commit should be safe to revert without breaking unrelated work.
- **Do not mix** in a single commit: a feature + mass formatting, dependency upgrades, or unrelated renames.
- **Prefer bottom-up layering** when a change spans types → lib → hooks → UI:

```
types/profile.ts extension     → feat(types): ...
lib/signals.ts pure functions  → feat(signals): ...
lib/unifiedSignalsStorage.ts   → feat(signals): persist unified_signals_v1
hooks/useUnifiedSignals.ts     → feat(hooks): subscribe and recompute signals
app/... UI wiring (if any)     → feat(profile): ... (separate commit)
```

### Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <imperative summary>

[optional body: why, not what]
```

| type       | use for                          |
| ---------- | -------------------------------- |
| `feat`     | new capability                   |
| `fix`      | bug fix                          |
| `refactor` | behavior-preserving refactor     |
| `docs`     | documentation only               |
| `chore`    | tooling, dependencies (alone)    |
| `test`     | tests (adjacent to related feat) |

**Scope examples:** `profile`, `signals`, `bookmarks`, `api`, `ui`, `types`

### Examples

```
❌ feat: add unified signals + fix sitemap + update README roadmap
❌ refactor entire lib/ + feat profile suggestions in one commit

✅ docs: add CONTRIBUTING atomic commit guidelines
✅ feat(signals): persist unified_signals_v1 to localStorage
✅ feat(hooks): add useUnifiedSignals with profile/bookmark subscriptions
```

### Suggested Commit Sequence (Phase 2.2 example)

When implementing Unified Signals, split work like this:

1. `feat(signals): add unified_signals_v1 read/write helpers`
2. `feat(hooks): add useUnifiedSignals with storage subscriptions`
3. `feat(signals): enrich implicit signals from bookmark job data` (optional, if in scope)
4. `test(signals): add mergePreferences and applyDecay unit tests` (when tests exist)

Each commit should pass `npm run lint` on its own.

## Pull Request Checklist

Before requesting review:

- [ ] Each commit is understandable via `git show <sha>` alone
- [ ] No `.env`, tokens, or secrets committed
- [ ] Type contract changes respect `UnifiedSignals` invariants (see `types/profile.ts` comments)
- [ ] New localStorage keys follow the `useBookmarks` / `useExplicitProfile` pattern (`useSyncExternalStore` + custom event)
- [ ] `npm run lint` passes
- [ ] Manual smoke test for user-facing changes (localStorage → refresh → verify UI updates)

## Local Development

```bash
npm install
npm run dev
npm run lint
```

Environment variables: see [README.md](README.md#environment-variables).

## AI-Assisted Development

If you use Cursor or other agents, read [AGENTS.md](AGENTS.md) for architecture constraints and vibe-coding workflow.
