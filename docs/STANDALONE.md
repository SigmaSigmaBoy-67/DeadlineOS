# Jaffery Center of Roanoke — independent website

This folder contains only the six-page Jaffery Center website. The original DeadlineOS application is not included. The logo in `assets/brand/jc-star.svg` is a **proposed design**, not an approved organizational identity. This site has **no active online donation destination**: Support Us offers an email inquiry, not a payment link.

## Develop and verify

Requirements: Node.js 20.19+ (or 22.12+) and Python 3 for content regeneration. On Vercel, the checked-in six HTML pages are used directly, so Python is **not** required in the Vercel build environment.

```sh
npm ci
npm run typecheck
npm test
npm run build             # Python regenerates pages from build.py, then Vite builds dist/
npm run build:vercel      # Vite builds the already-generated pages without Python
npm run preview           # Optional local production preview
```

Edit content in `build.py`, then run `python3 build.py` locally and commit the six generated HTML files along with the source. Run typecheck, test, and build before publishing. The source of truth is `build.py`; do not edit generated pages alone. Site links are relative `.html` links, so all six routes work from a dedicated project's root. The lazy React footer has a complete static fallback in `build.py`, even with JavaScript off.

## Separate GitHub repository and Vercel project

1. **Only after the organization approves the repository owner/name and visibility**, create a new empty repository for this directory. Do not import it into the existing DeadlineOS repository's `main` branch. Do not delete or overwrite the current DeadlineOS project or PR.
2. In this exported directory, initialize Git and push this directory's contents to the new repository. This export script intentionally creates no Git history or remote.
3. In Vercel, **create a new project** linked to the new repository; do not attach it to the existing DeadlineOS Vercel project. Framework: Vite; Root Directory: repository root; Install: `npm ci`; Build: `npm run build:vercel`; Output Directory: `dist`. These settings are in `vercel.json` in this exported folder, not in the DeadlineOS root.
4. Review the Vercel-generated preview URL first. **Do not attach the organization's official domain** until the organization approves the content, proposed logo, and deployment. To add confirmed online donations later, obtain written confirmation of the exact destination and implement/test it in a separate change.

A Vercel preview is not an official-domain launch. The contact form opens an email draft on the visitor's device; it does not transmit data from the website. No prayer timetable, event date, public opening hours, or payment account is fabricated.
