# Clinical Smart Phrase

A local-first React PWA that expands terse clinical shorthand into formatted assessment and plan notes with WebLLM plus rule-based boilerplate matching.

## Local Development

```bash
npm install
npm run dev
```

## GitHub Pages

Do not publish the raw repository files as the Pages site. The root `index.html` is a Vite entry file and must be built first.

The included GitHub Actions workflow builds the app and deploys the generated `dist/` folder:

1. Push this repository to GitHub.
2. In repository settings, set Pages source to **GitHub Actions**.
3. Push to `main` or run the `Deploy GitHub Pages` workflow manually.

For a manual deploy instead:

```bash
npm install
npm run build
```

Then upload the contents of `dist/` to GitHub Pages.
