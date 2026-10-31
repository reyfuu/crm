<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## UI and UX direction

- Use shadcn/ui conventions for reusable primitives in `src/components/ui`: semantic CSS tokens, `cn`, CVA variants, accessible labels, and visible keyboard focus. Preserve existing component APIs when updating them.
- Kokonut UI is configured as `@kokonutui` in `components.json`. Use its source components selectively for useful polish; avoid decorative motion in data-heavy screens. The adapted loader lives in `src/components/kokonutui`.
- Apply UI UX Pro Max guidance: clear information hierarchy, readable contrast, generous touch targets, responsive navigation, useful empty/loading states, and reduced-motion support.
- Visual direction: Inter, neutral surfaces, teal actions, dark sidebar, restrained borders and shadows. Keep Indonesian interface copy and real database-backed metrics.
- Before changing the UI, read `docs/UI-REFRESH.md` and the relevant installed Next.js documentation. Verify with lint, typecheck, production build, and browser checks when available.
- References: https://ui.shadcn.com/docs, https://kokonutui.com/docs, https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.
