# The Osborne Kitchen

This repository builds the recipe site served at `recipes.thesamosborne.com`.

## Publishing a recipe

1. Add a recipe Markdown file to `recipes/`, following `recipes/0000_template.md`.
2. Add the referenced JPEG to `images/`.
3. Commit and push the change to `main`.

Cloudflare Workers Builds generates and deploys the site automatically. Pull requests receive a preview deployment before merging.

## Local development

```bash
npm install
npm run preview
```

`npm run build` writes the generated static site to `dist/`. This directory is not committed.
