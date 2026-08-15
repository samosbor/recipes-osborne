import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const recipesDirectory = path.join(root, "recipes");
const imagesDirectory = path.join(root, "images");
const outputDirectory = path.join(root, "dist");

const escapeHtml = (value) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

const toSlug = (filename) => filename.replace(/^\d+_/, "").replace(/\.md$/, "").replaceAll("_", "-");

const imagePath = (markdown) => markdown.replaceAll("../images/", "/images/");

function parseRecipe(filename, source) {
  const title = source.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const id = source.match(/^\d{4}\s*$/m)?.[0]?.trim();
  const image = source.match(/!\[[^\]]*\]\(\.\.\/images\/([^\s)]+)\)/)?.[1];

  if (!title || !id || !image) {
    throw new Error(`${filename} must include a title, four-digit ID, and local image.`);
  }

  return {
    filename,
    id,
    title,
    image,
    slug: toSlug(filename),
    html: marked.parse(imagePath(source)),
  };
}

function page(title, content, description = "A collection of recipes from the Osbornes.") {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${escapeHtml(description)}">
    <title>${escapeHtml(title)}</title>
    <link rel="stylesheet" href="/site.css">
  </head>
  <body>
    <header class="site-header">
      <a class="wordmark" href="/">The Osborne Kitchen</a>
    </header>
    <main>${content}</main>
    <footer>Made for the recipes worth keeping.</footer>
  </body>
</html>`;
}

async function build() {
  const files = (await readdir(recipesDirectory)).filter((file) => /^\d{4}_.+\.md$/.test(file) && file !== "0000_template.md");
  const recipes = await Promise.all(files.map(async (filename) => parseRecipe(filename, await readFile(path.join(recipesDirectory, filename), "utf8"))));
  recipes.sort((a, b) => b.id.localeCompare(a.id));

  for (const recipe of recipes) {
    try {
      await readFile(path.join(imagesDirectory, recipe.image));
    } catch {
      throw new Error(`${recipe.filename} references missing image images/${recipe.image}`);
    }
  }

  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(path.join(outputDirectory, "recipes"), { recursive: true });
  await cp(imagesDirectory, path.join(outputDirectory, "images"), { recursive: true, filter: (source) => !source.endsWith(":Zone.Identifier") });
  await cp(path.join(root, "src", "site.css"), path.join(outputDirectory, "site.css"));

  const cards = recipes.map((recipe) => `
    <article class="recipe-card">
      <a href="/recipes/${recipe.slug}/"><img src="/images/${encodeURI(recipe.image)}" alt="${escapeHtml(recipe.title)}"></a>
      <div class="recipe-card-content">
        <p class="eyebrow">Recipe ${escapeHtml(recipe.id)}</p>
        <h2><a href="/recipes/${recipe.slug}/">${escapeHtml(recipe.title)}</a></h2>
      </div>
    </article>`).join("");

  const home = `<section class="hero">
    <p class="eyebrow">The Osborne Kitchen</p>
    <h1>Recipes for the everyday table.</h1>
    <p>A growing collection of family favorites, simple dinners, and things worth making again.</p>
  </section>
  <section class="recipe-grid" aria-label="Recipes">${cards}
  </section>`;
  await writeFile(path.join(outputDirectory, "index.html"), page("The Osborne Kitchen | Recipes", home));

  await Promise.all(recipes.map(async (recipe) => {
    const content = `<article class="recipe">
      <a class="back-link" href="/">All recipes</a>
      ${recipe.html}
    </article>`;
    const recipeDirectory = path.join(outputDirectory, "recipes", recipe.slug);
    await mkdir(recipeDirectory, { recursive: true });
    await writeFile(path.join(recipeDirectory, "index.html"), page(`${recipe.title} | The Osborne Kitchen`, content, recipe.title));
  }));

  console.log(`Built ${recipes.length} recipes in dist/.`);
}

build().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
