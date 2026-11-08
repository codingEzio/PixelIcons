/** Assemble a private local collection without changing public assets. */
import { type IconDefinition, icons } from "../src/icons.ts";
import { renderIconSvg, validateIcon } from "../src/render.ts";
import { renderOverview } from "../src/overview.ts";
import { renderGallery } from "../src/gallery.ts";

if (Deno.args.length) throw Error("Usage: deno task private:build");
const local = await Deno.lstat("Local");
if (!local.isDirectory || local.isSymlink) {
  throw Error("Local must be a real directory");
}
const input = "Local/private-icons.json";
const stat = await Deno.lstat(input);
if (!stat.isFile || stat.isSymlink) {
  throw Error("Private input must be a regular file");
}
const overlay: unknown = JSON.parse(await Deno.readTextFile(input));
if (!Array.isArray(overlay)) {
  throw Error("Private input must be an array of icon definitions");
}
const names = new Set(icons.map((icon) => icon.name));
const allowed = new Set([
  "navigation",
  "actions",
  "categories",
  "status",
  "typography",
  "brands",
]);
for (const item of overlay) {
  if (
    !item || typeof item !== "object" || Array.isArray(item) ||
    typeof item.name !== "string" || typeof item.category !== "string" ||
    !allowed.has(item.category) || !Array.isArray(item.rows) ||
    !item.rows.every((row: unknown) => typeof row === "string") ||
    (item.aliasOf !== undefined && typeof item.aliasOf !== "string")
  ) {
    throw Error("Invalid private icon definition");
  }
  validateIcon(item as IconDefinition);
  if (names.has(item.name)) throw Error(`Duplicate icon name: ${item.name}`);
  names.add(item.name);
}
const all: readonly IconDefinition[] = [...icons, ...overlay];
for (const icon of all) {
  if (icon.aliasOf) {
    const original = all.find((candidate) => candidate.name === icon.aliasOf);
    if (
      !original || JSON.stringify(original.rows) !== JSON.stringify(icon.rows)
    ) {
      throw Error(`Broken alias: ${icon.name}`);
    }
  }
}
const publicCatalog = JSON.parse(await Deno.readTextFile("catalog.json"));
if (publicCatalog.count !== icons.length) {
  throw Error("Public catalog does not match sources; run verify");
}
const output = await Deno.makeTempDir({
  dir: "Local",
  prefix: "private-build-",
});
await Deno.chmod(output, 0o700);
await Deno.mkdir(`${output}/icons`, { mode: 0o700 });
const privateEntries = [];
for (const icon of all) {
  const svg = renderIconSvg(icon);
  await Deno.writeTextFile(`${output}/icons/${icon.name}.svg`, svg, {
    createNew: true,
    mode: 0o600,
  });
  if (!icons.includes(icon)) {
    const hash = Array.from(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", new TextEncoder().encode(svg)),
      ),
      (n) => n.toString(16).padStart(2, "0"),
    ).join("");
    privateEntries.push({
      name: icon.name,
      category: icon.category,
      canvas: icon.canvas,
      grid: [9, 9],
      svg: `icons/${icon.name}.svg`,
      sha256: hash,
      ...(icon.aliasOf ? { aliasOf: icon.aliasOf } : {}),
      distribution: { status: "private; not granted for publication" },
    });
  }
}
await Deno.writeTextFile(
  `${output}/catalog.json`,
  JSON.stringify(
    {
      ...publicCatalog,
      count: all.length,
      icons: [...publicCatalog.icons, ...privateEntries],
      note:
        "Private local assembly; private entries are not covered by the public artwork grant.",
    },
    null,
    2,
  ) + "\n",
  { createNew: true, mode: 0o600 },
);
await Deno.writeTextFile(
  `${output}/overview.svg`,
  renderOverview(
    all,
    "Private local assembly; rights for private entries are not granted.",
  ),
  { createNew: true, mode: 0o600 },
);
await Deno.writeTextFile(
  `${output}/gallery.html`,
  renderGallery(all.map((icon) => ({ ...icon, svg: renderIconSvg(icon) }))),
  { createNew: true, mode: 0o600 },
);
console.log(
  `Built ${all.length} icons in ${output}; private output is not for publication`,
);
