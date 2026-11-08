import { privateBuildPath, regularFile } from "./private-path.ts";
const options = new Map<string, string>();
for (let i = 0; i < Deno.args.length; i += 2) {
  const key = Deno.args[i], value = Deno.args[i + 1];
  if (!["--build", "--port"].includes(key) || !value || options.has(key)) {
    throw Error(
      "Usage: deno task private:serve --build Local/private-build-... --port <port>",
    );
  }
  options.set(key, value);
}
const port = Number(options.get("--port"));
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw Error("Specify a port from 1024 to 65535");
}
const build = await privateBuildPath(options.get("--build"));
const iconsDir = await Deno.lstat(`${build}/icons`);
if (!iconsDir.isDirectory || iconsDir.isSymlink) {
  throw Error("Unsafe private icons directory");
}
const catalogBytes = await regularFile(`${build}/catalog.json`);
const catalog = JSON.parse(new TextDecoder().decode(catalogBytes));
if (!Array.isArray(catalog.icons) || catalog.count !== catalog.icons.length) {
  throw Error("Invalid private catalog");
}
const overviewSvg = await regularFile(`${build}/overview.svg`);
const overviewPng = await regularFile(`${build}/overview.png`);
const receipt = JSON.parse(
  new TextDecoder().decode(await regularFile(`${build}/receipt.json`)),
);
const hash = async (bytes: Uint8Array) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer),
    ),
    (n) => n.toString(16).padStart(2, "0"),
  ).join("");
if (
  receipt.svgSha256 !== await hash(overviewSvg) ||
  receipt.pngSha256 !== await hash(overviewPng)
) throw Error("Private preview receipt mismatch");
const assets = new Map<string, [Uint8Array, string]>([
  ["/", [
    await regularFile(`${build}/gallery.html`),
    "text/html; charset=utf-8",
  ]],
  ["/catalog.json", [catalogBytes, "application/json"]],
  ["/previews/overview.svg", [
    overviewSvg,
    "image/svg+xml",
  ]],
  ["/previews/overview.png", [
    overviewPng,
    "image/png",
  ]],
]);
for (const icon of catalog.icons) {
  if (
    typeof icon.name !== "string" || !/^[a-zA-Z][a-zA-Z0-9]*$/.test(icon.name)
  ) throw Error("Invalid private icon name");
  const url = `/icons/${icon.name}.svg`;
  if (assets.has(url)) throw Error("Duplicate icon name");
  const svg = await regularFile(`${build}/icons/${icon.name}.svg`);
  if (icon.sha256 !== await hash(svg)) {
    throw Error(`Private icon hash mismatch: ${icon.name}`);
  }
  assets.set(url, [svg, "image/svg+xml"]);
}
const controller = new AbortController();
Deno.addSignalListener("SIGINT", () => controller.abort());
Deno.addSignalListener("SIGTERM", () => controller.abort());
const server = Deno.serve({
  hostname: "127.0.0.1",
  port,
  signal: controller.signal,
}, (request) => {
  const host = request.headers.get("host");
  if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) {
    return new Response("Invalid Host", { status: 403 });
  }
  if (!["GET", "HEAD"].includes(request.method)) {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD" },
    });
  }
  const asset = assets.get(new URL(request.url).pathname);
  if (!asset) return new Response("Not found", { status: 404 });
  return new Response(
    request.method === "HEAD" ? null : new Uint8Array(asset[0]).buffer,
    {
      headers: {
        "Content-Type": asset[1],
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
});
await server.finished;
