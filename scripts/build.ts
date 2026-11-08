import { icons } from "../src/icons.ts";
import { renderIconSvg } from "../src/render.ts";
import { renderOverview } from "../src/overview.ts";

const digest = async (value: string) =>
  [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  ].map((n) => n.toString(16).padStart(2, "0")).join("");
const unique = new Set(icons.map((icon) => icon.name));
if (unique.size !== icons.length) throw new Error("Duplicate icon names");
await Deno.mkdir("icons", { recursive: true });
for await (const entry of Deno.readDir("icons")) {
  if (
    !entry.isFile || !unique.has(entry.name.replace(/\.svg$/, "")) ||
    !entry.name.endsWith(".svg")
  ) {
    throw new Error(
      `Unlisted asset: icons/${entry.name}; review before removing it`,
    );
  }
}
const provenance = JSON.parse(await Deno.readTextFile("provenance.json"));
const scope = JSON.parse(await Deno.readTextFile("LICENSE-SCOPE.json"));
const catalog = [];

for (const icon of icons) {
  const svg = renderIconSvg(icon);
  await Deno.writeTextFile(`icons/${icon.name}.svg`, svg);
  const distribution = scope.artwork.assets.find((asset: { id: string }) =>
    asset.id === icon.name
  );
  if (
    !distribution || distribution.file !== `icons/${icon.name}.svg` ||
    distribution.sha256 !== await digest(svg)
  ) {
    throw Error(`Stale license scope: ${icon.name}`);
  }
  catalog.push({
    name: icon.name,
    category: icon.category,
    canvas: icon.canvas,
    grid: [9, 9],
    svg: `icons/${icon.name}.svg`,
    sha256: await digest(svg),
    ...(icon.aliasOf ? { aliasOf: icon.aliasOf } : {}),
    distribution,
    initialSource: provenance.icons.find((entry: { name: string }) =>
      entry.name === icon.name
    )?.symbol ?? null,
  });
}
await Deno.writeTextFile(
  "catalog.json",
  JSON.stringify(
    {
      schemaVersion: 1,
      count: icons.length,
      license:
        "Scoped CC-BY-4.0 for selected assets; excluded assets are not granted",
      licenseScope: "LICENSE-SCOPE.json",
      icons: catalog,
    },
    null,
    2,
  ) + "\n",
);
await Deno.mkdir("previews", { recursive: true });
await Deno.writeTextFile("previews/overview.svg", renderOverview());
console.log(
  `Built ${icons.length} SVGs, catalog.json, and static preview`,
);
