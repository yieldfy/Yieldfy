
The user wants to export the code so they can share it with Claude. I'll package the key project files into a zip archive in `/mnt/documents/` so they can download it.

## Plan

Create a downloadable zip archive containing the relevant source files:

- `src/` directory (components, pages, hooks, lib, styles)
- `index.html`
- `tailwind.config.ts`
- `vite.config.ts`
- `package.json`
- `tsconfig*.json`
- `postcss.config.js`
- `components.json`

Exclude: `node_modules`, lockfiles, `dist`, build artifacts, and binary assets.

Output: `/mnt/documents/yieldfy-source.zip` delivered via a `presentation-artifact` tag for one-click download.

Optionally, also produce a single concatenated `yieldfy-source.txt` (all code in one file with path headers) — this is often easier to paste into Claude than a zip.

I'll generate both so the user can pick whichever fits their workflow.
