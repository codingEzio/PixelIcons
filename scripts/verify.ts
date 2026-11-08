import { icons } from "../src/icons.ts";
import { renderIconSvg, validateIcon } from "../src/render.ts";
import { renderOverview } from "../src/overview.ts";

const catalog = JSON.parse(await Deno.readTextFile("catalog.json"));
const provenance = JSON.parse(await Deno.readTextFile("provenance.json"));
const scope = JSON.parse(await Deno.readTextFile("LICENSE-SCOPE.json"));
if (catalog.licenseScope !== "LICENSE-SCOPE.json") {
  throw Error("Missing current license scope");
}
const actual = [];
for await (const entry of Deno.readDir("icons")) actual.push(entry.name);
const expected = icons.map((icon) => `${icon.name}.svg`).sort();
if (JSON.stringify(actual.sort()) !== JSON.stringify(expected)) {
  throw new Error("SVG inventory does not match sources");
}
if (
  catalog.count !== icons.length || catalog.icons.length !== icons.length ||
  new Set(icons.map((icon) => icon.name)).size !== icons.length
) throw new Error("Catalog count or names do not match sources");
for (const icon of icons) {
  validateIcon(icon);
  const expectedSvg = renderIconSvg(icon);
  const actualSvg = await Deno.readTextFile(`icons/${icon.name}.svg`);
  if (actualSvg !== expectedSvg) throw new Error(`Stale export: ${icon.name}`);
  const digest = [
    ...new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(actualSvg),
      ),
    ),
  ].map((n) => n.toString(16).padStart(2, "0")).join("");
  const entry = catalog.icons.find((entry: { name: string }) =>
    entry.name === icon.name
  );
  if (
    !entry ||
    JSON.stringify(entry.distribution) !==
      JSON.stringify(
        scope.artwork.assets.find((asset: { id: string }) =>
          asset.id === icon.name
        ),
      ) ||
    entry.sha256 !== digest || entry.category !== icon.category ||
    entry.canvas !== icon.canvas || entry.aliasOf !== icon.aliasOf
  ) throw new Error(`Stale catalog record: ${icon.name}`);
  if (icon.aliasOf) {
    const original = icons.find((entry) => entry.name === icon.aliasOf);
    if (
      !original || JSON.stringify(original.rows) !== JSON.stringify(icon.rows)
    ) throw new Error(`Broken alias: ${icon.name}`);
  }
}
if (await Deno.readTextFile("previews/overview.svg") !== renderOverview()) {
  throw new Error("Stale overview export");
}
if (provenance.initialCount !== provenance.icons.length) {
  throw new Error("Invalid initial import inventory");
}
console.log(
  `Verified all ${icons.length} grids, SVG exports, catalog hashes, aliases, and static overview`,
);

const previewReceipt = JSON.parse(
  await Deno.readTextFile("previews/receipt.json"),
);
for (
  const [path, expectedHash] of [[
    "previews/overview.svg",
    previewReceipt.svgSha256,
  ], ["previews/overview.png", previewReceipt.pngSha256]]
) {
  const bytes = await Deno.readFile(path);
  const hash = Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer),
    ),
    (n) => n.toString(16).padStart(2, "0"),
  ).join("");
  if (hash !== expectedHash) {
    throw Error(`Stale static preview: ${path}; run deno task preview:png`);
  }
}
console.log("Static PNG and SVG receipt verified");
