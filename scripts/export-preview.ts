/** Optional portable PNG export through librsvg; no browser or network. */
const outputFlag = Deno.args.indexOf("--output");
const output = outputFlag < 0 ? "previews" : Deno.args[outputFlag + 1];
if (
  !output ||
  Deno.args.some((arg, i) => arg !== "--output" && i !== outputFlag + 1)
) {
  throw Error("Usage: deno task preview:png [--output directory]");
}
const svg = await Deno.readFile("previews/overview.svg");
const text = new TextDecoder().decode(svg);
const width = Number(text.match(/width="(\d+)"/)?.[1]);
const height = Number(text.match(/height="(\d+)"/)?.[1]);
if (!width || !height) throw Error("Missing static preview dimensions");
let result: Deno.CommandOutput;
try {
  result = await new Deno.Command("rsvg-convert", {
    args: ["--format=png", "previews/overview.svg"],
    stdout: "piped",
    stderr: "piped",
  }).output();
} catch (error) {
  if (!(error instanceof Deno.errors.NotFound)) throw error;
  throw Error(
    "Install librsvg: brew install librsvg (macOS). Existing SVG and PNG assets remain usable.",
  );
}
if (!result.success) throw Error(new TextDecoder().decode(result.stderr));
const png = result.stdout;
const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
if (
  png.length < 24 || view.getUint32(0) !== 0x89504e47 ||
  view.getUint32(16) !== width || view.getUint32(20) !== height
) {
  throw Error("Renderer returned an invalid PNG or incorrect dimensions");
}
const hash = async (bytes: Uint8Array) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer),
    ),
    (n) => n.toString(16).padStart(2, "0"),
  ).join("");
await Deno.mkdir(output, { recursive: true });
// Validate rendering before replacing outputs; publish receipt after assets.
await Deno.writeFile(`${output}/overview.png`, png);
if (output !== "previews") await Deno.writeFile(`${output}/overview.svg`, svg);
await Deno.writeTextFile(
  `${output}/receipt.json`,
  JSON.stringify(
    {
      renderer:
        "librsvg rsvg-convert at intrinsic SVG dimensions; local system fonts",
      svgSha256: await hash(svg),
      pngSha256: await hash(png),
      width,
      height,
    },
    null,
    2,
  ) + "\n",
);
console.log(`Exported ${width} × ${height} PNG and hash receipt to ${output}`);
