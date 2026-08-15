import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { marked } = await import(process.env.MARKED_MODULE || "marked");

const root = path.dirname(fileURLToPath(import.meta.url));
const recipesDirectory = path.join(root, "recipes");
const imagesDirectory = path.join(root, "images");
const outputDirectory = path.resolve(process.env.OUTPUT_DIRECTORY || path.join(root, "dist"));

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const toSlug = (filename) =>
  filename.replace(/^\d+_/, "").replace(/\.md$/, "").replaceAll("_", "-");

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
    html: marked.parse(source.replaceAll("../images/", "/images/")),
  };
}

function page(title, content, description = "A growing collection of Osborne family recipes.") {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="theme-color" content="#f4f0e7">
    <title>${escapeHtml(title)}</title>
    <link rel="stylesheet" href="/site.css">
  </head>
  <body>
    <header class="site-header"><a class="wordmark" href="/">The Osborne Kitchen</a></header>
    <main>${content}</main>
    <footer>Made for the recipes worth keeping.</footer>
  </body>
</html>`;
}

const css = `:root {
  color: #20352d;
  background: #f4f0e7;
  font-family: Georgia, "Times New Roman", serif;
  line-height: 1.58;
}
* { box-sizing: border-box; }
body { margin: 0; }
a { color: inherit; }
.site-header, main, footer { width: min(1120px, calc(100% - 40px)); margin-inline: auto; }
.site-header { padding: 26px 0 16px; }
.wordmark, .eyebrow, .back-link, footer { font-family: Arial, sans-serif; }
.wordmark { color: #a04428; font-size: 1.1rem; font-weight: 700; letter-spacing: .04em; text-decoration: none; text-transform: uppercase; }
.hero { max-width: 720px; padding: clamp(42px, 8vw, 95px) 0 clamp(46px, 7vw, 75px); }
.hero h1 { font-size: clamp(3rem, 7vw, 6.4rem); font-weight: 400; letter-spacing: -.06em; line-height: .92; margin: 10px 0 24px; }
.hero p:last-child { font-size: 1.22rem; max-width: 560px; }
.eyebrow { color: #a04428; font-size: .72rem; font-weight: 700; letter-spacing: .12em; margin: 0; text-transform: uppercase; }
.recipe-grid { display: grid; gap: 28px; grid-template-columns: repeat(3, minmax(0, 1fr)); padding-bottom: 80px; }
.recipe-card { background: #fffdf8; }
.recipe-card img { aspect-ratio: 4 / 3; display: block; object-fit: cover; width: 100%; }
.recipe-card-content { padding: 18px 18px 22px; }
.recipe-card h2 { font-size: 1.5rem; font-weight: 400; line-height: 1.08; margin: 7px 0 0; }
.recipe-card h2 a { text-decoration: none; }
.recipe-card h2 a:hover, .recipe-card h2 a:focus-visible { text-decoration: underline; }
.recipe { margin: 28px auto 80px; max-width: 760px; }
.recipe .back-link { color: #a04428; display: inline-block; font-size: .8rem; font-weight: 700; margin-bottom: 36px; text-decoration: none; text-transform: uppercase; }
.recipe h1 { font-size: clamp(2.8rem, 7vw, 5.4rem); font-weight: 400; letter-spacing: -.055em; line-height: .96; margin: 0 0 14px; }
.recipe h1 + p { color: #a04428; font-family: Arial, sans-serif; font-size: .78rem; font-weight: 700; letter-spacing: .12em; margin-bottom: 28px; text-transform: uppercase; }
.recipe img { display: block; margin: 32px 0 46px; max-height: 580px; object-fit: cover; width: 100%; }
.recipe h2 { border-bottom: 1px solid #cfc8b8; font-size: 1.65rem; font-weight: 400; margin: 40px 0 16px; padding-bottom: 8px; }
.recipe li { margin-bottom: 9px; }
.recipe ol { padding-left: 1.4rem; }
.recipe ul { padding-left: 1.2rem; }
footer { border-top: 1px solid #cfc8b8; font-size: .78rem; letter-spacing: .04em; padding: 24px 0 36px; }
.not-found { margin: 15vh auto; max-width: 680px; text-align: center; }
.not-found h1 { font-size: clamp(3rem, 8vw, 6rem); font-weight: 400; margin-bottom: 12px; }
.not-found a { color: #a04428; }
@media (max-width: 700px) {
  .site-header, main, footer { width: min(100% - 28px, 1120px); }
  .recipe-grid { grid-template-columns: 1fr; gap: 20px; }
  .recipe-card { display: grid; grid-template-columns: 42% 1fr; }
  .recipe-card-content { align-self: center; padding: 14px; }
  .recipe-card h2 { font-size: 1.3rem; }
  .recipe-card img { aspect-ratio: 1; height: 100%; }
}`;

async function build() {
  const filenames = (await readdir(recipesDirectory)).filter(
    (filename) => /^\d{4}_.+\.md$/.test(filename) && filename !== "0000_template.md",
  );
  const recipes = await Promise.all(
    filenames.map(async (filename) =>
      parseRecipe(filename, await readFile(path.join(recipesDirectory, filename), "utf8")),
    ),
  );
  recipes.sort((a, b) => b.id.localeCompare(a.id));

  const ids = new Set();
  const slugs = new Set();
  for (const recipe of recipes) {
    if (ids.has(recipe.id) || slugs.has(recipe.slug)) {
      throw new Error(`${recipe.filename} has a duplicate recipe ID or URL.`);
    }
    ids.add(recipe.id);
    slugs.add(recipe.slug);
    await readFile(path.join(imagesDirectory, recipe.image)).catch(() => {
      throw new Error(`${recipe.filename} references missing image images/${recipe.image}`);
    });
  }

  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(path.join(outputDirectory, "recipes"), { recursive: true });
  await cp(imagesDirectory, path.join(outputDirectory, "images"), {
    recursive: true,
    filter: (source) => !source.endsWith(":Zone.Identifier"),
  });
  await writeFile(path.join(outputDirectory, "site.css"), css);

  const cards = recipes
    .map(
      (recipe) => `<article class="recipe-card">
        <a href="/recipes/${recipe.slug}/"><img src="/images/${encodeURI(recipe.image)}" alt="${escapeHtml(recipe.title)}" loading="lazy"></a>
        <div class="recipe-card-content">
          <p class="eyebrow">Recipe ${escapeHtml(recipe.id)}</p>
          <h2><a href="/recipes/${recipe.slug}/">${escapeHtml(recipe.title)}</a></h2>
        </div>
      </article>`,
    )
    .join("\n");

  const home = `<section class="hero">
      <p class="eyebrow">The Osborne Kitchen</p>
      <h1>Recipes for the everyday table.</h1>
      <p>A growing collection of family favorites, simple dinners, and things worth making again.</p>
    </section>
    <section class="recipe-grid" aria-label="Recipes">${cards}</section>`;
  await writeFile(path.join(outputDirectory, "index.html"), page("The Osborne Kitchen | Recipes", home));

  await Promise.all(
    recipes.map(async (recipe) => {
      const directory = path.join(outputDirectory, "recipes", recipe.slug);
      await mkdir(directory, { recursive: true });
      await writeFile(
        path.join(directory, "index.html"),
        page(
          `${recipe.title} | The Osborne Kitchen`,
          `<article class="recipe"><a class="back-link" href="/">All recipes</a>${recipe.html}</article>`,
          recipe.title,
        ),
      );
    }),
  );

  await writeFile(
    path.join(outputDirectory, "404.html"),
    page("Page not found | The Osborne Kitchen", '<section class="not-found"><h1>Page not found.</h1><p><a href="/">Return to all recipes</a></p></section>'),
  );
  console.log(`Built ${recipes.length} recipes in ${outputDirectory}.`);
}

build().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
