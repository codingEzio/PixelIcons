import { privateBuildPath, regularFile } from "./private-path.ts";
if (Deno.args.length !== 2 || Deno.args[0] !== "--build") {
  throw Error("Usage: deno task private:png --build Local/private-build-...");
}
const build = await privateBuildPath(Deno.args[1]);
const svgPath = `${build}/overview.svg`;
const svg = await regularFile(svgPath);
const text = new TextDecoder().decode(svg);
const width = Number(text.match(/width="(\d+)"/)?.[1]);
const height = Number(text.match(/height="(\d+)"/)?.[1]);
if (!width || !height) throw Error("Missing static preview dimensions");
const result = await new Deno.Command("rsvg-convert", {
  args: ["--format=png", svgPath],
  stdout: "piped",
  stderr: "piped",
}).output();
if (!result.success) throw Error(new TextDecoder().decode(result.stderr));
const png = result.stdout;
if (png.length < 24) throw Error("Invalid PNG");
const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
if (
  view.getUint32(0) !== 0x89504e47 || view.getUint32(16) !== width ||
  view.getUint32(20) !== height
) throw Error("Invalid PNG or dimensions");
const hash = async (bytes: Uint8Array) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer),
    ),
    (n) => n.toString(16).padStart(2, "0"),
  ).join("");
const receipt = {
  renderer:
    "librsvg rsvg-convert at intrinsic SVG dimensions; local system fonts",
  svgSha256: await hash(svg),
  pngSha256: await hash(png),
  width,
  height,
};
await Deno.writeFile(`${build}/overview.png`, png, {
  createNew: true,
  mode: 0o600,
});
await Deno.writeTextFile(
  `${build}/receipt.json`,
  JSON.stringify(receipt, null, 2) + "\n",
  { createNew: true, mode: 0o600 },
);
console.log(
  `Exported ${width} × ${height} private PNG and hash receipt to ${build}`,
);
