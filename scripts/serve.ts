/** Optional maintenance server. Snapshot verified public assets before listening. */
import { icons } from "../src/icons.ts";
import { renderIconSvg } from "../src/render.ts";
import { renderOverview } from "../src/overview.ts";
import { renderGallery } from "../src/gallery.ts";
import { publicAssetPins } from "../src/public-asset-pins.ts";
const options = new Map<string, string>();
const extraHosts: string[] = [];
for (let i = 0; i < Deno.args.length; i += 2) {
  const key = Deno.args[i], value = Deno.args[i + 1];
  if (
    !["--port", "--host", "--allow-host"].includes(key) || !value ||
    (key !== "--allow-host" && options.has(key))
  ) {
    throw Error(
      "Usage: deno task serve --port <port> [--host <address>] [--allow-host <name>]...",
    );
  }
  if (key === "--allow-host") extraHosts.push(value);
  else options.set(key, value);
}
const port = Number(options.get("--port"));
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw Error("Specify a port from 1024 to 65535");
}
const hostname = options.get("--host") ?? "127.0.0.1";
const wildcard = hostname === "0.0.0.0" || hostname === "::" ||
  hostname === "[::]";
if (wildcard && !extraHosts.length) {
  throw Error(
    "Wildcard listeners require at least one --allow-host hostname or address",
  );
}
function authority(name: string): string {
  if (/[\\/?#@]/.test(name)) throw Error("Invalid allowed host");
  const wrapped = name.includes(":") && !name.startsWith("[")
    ? `[${name}]`
    : name;
  let url: URL;
  try {
    url = new URL(`http://${wrapped}:${port}`);
  } catch {
    throw Error("Invalid allowed host");
  }
  if (
    url.port !== String(port) || url.pathname !== "/" || url.username ||
    url.password
  ) throw Error("Invalid allowed host");
  return url.host.toLowerCase();
}
const allowed = new Set(extraHosts.map(authority));
if (!wildcard) allowed.add(authority(hostname));
if (hostname === "127.0.0.1" || hostname === "localhost") {
  allowed.add(authority("127.0.0.1"));
  allowed.add(authority("localhost"));
}
// Public bytes are bounded before allocation and checked against their source.
// Directory identity checks surround each open; pinned content also prevents
// transient directory swaps from being served even if a path is swapped back.
const directories = new Map<string, Deno.FileInfo>();
for (const path of ["icons", "previews"]) {
  const stat = await Deno.lstat(path);
  if (
    !stat.isDirectory || stat.isSymlink || stat.dev === null ||
    stat.ino === null
  ) throw Error(`Unsafe public directory: ${path}`);
  directories.set(path, stat);
}
async function checkDirectory(path: string): Promise<void> {
  const current = await Deno.lstat(path), original = directories.get(path)!;
  if (
    !current.isDirectory || current.isSymlink || current.dev !== original.dev ||
    current.ino !== original.ino
  ) throw Error(`Public directory changed: ${path}`);
}
async function snapshot(
  path: string,
  expectedSize: number,
): Promise<Uint8Array> {
  const parent = path.includes("/")
    ? path.slice(0, path.lastIndexOf("/"))
    : ".";
  if (parent !== ".") await checkDirectory(parent);
  const before = await Deno.lstat(path);
  if (
    !before.isFile || before.isSymlink || before.size !== expectedSize ||
    before.dev === null || before.ino === null
  ) throw Error(`Unsafe public asset or unexpected size: ${path}`);
  const file = await Deno.open(path, { read: true });
  try {
    const opened = await file.stat();
    if (
      !opened.isFile || opened.dev !== before.dev ||
      opened.ino !== before.ino || opened.size !== expectedSize ||
      opened.mtime?.getTime() !== before.mtime?.getTime()
    ) throw Error(`Public asset changed while opening: ${path}`);
    const bytes = new Uint8Array(expectedSize);
    let offset = 0;
    while (offset < bytes.length) {
      const n = await file.read(bytes.subarray(offset));
      if (n === null || n === 0) throw Error(`Short read: ${path}`);
      offset += n;
    }
    const after = await file.stat();
    if (
      after.size !== opened.size ||
      after.mtime?.getTime() !== opened.mtime?.getTime()
    ) throw Error(`Public asset changed while reading: ${path}`);
    if (parent !== ".") await checkDirectory(parent);
    return bytes;
  } finally {
    file.close();
  }
}
const hash = async (bytes: Uint8Array) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer),
    ),
    (n) => n.toString(16).padStart(2, "0"),
  ).join("");
const decoder = new TextDecoder();
const catalogBytes = await snapshot(
  "catalog.json",
  publicAssetPins.catalog.bytes,
);
if (await hash(catalogBytes) !== publicAssetPins.catalog.sha256) {
  throw Error("Public catalog does not match the reviewed pin");
}
const catalog = JSON.parse(decoder.decode(catalogBytes));
if (
  catalog.count !== icons.length || !Array.isArray(catalog.icons) ||
  catalog.icons.length !== icons.length
) throw Error("Invalid public catalog");
const expectedOverview = renderOverview();
const overviewSvg = await snapshot(
  "previews/overview.svg",
  new TextEncoder().encode(expectedOverview).length,
);
if (decoder.decode(overviewSvg) !== expectedOverview) {
  throw Error("Stale public SVG preview");
}
const png = await snapshot("previews/overview.png", publicAssetPins.png.bytes);
if (await hash(png) !== publicAssetPins.png.sha256) {
  throw Error("Public PNG does not match the reviewed pin");
}
const gallery = renderGallery(
  icons.map((icon) => ({ ...icon, svg: renderIconSvg(icon) })),
);
const assets = new Map<string, readonly [Uint8Array, string]>([
  ["/catalog.json", [catalogBytes, "application/json"]],
  ["/previews/overview.svg", [overviewSvg, "image/svg+xml"]],
  ["/previews/overview.png", [png, "image/png"]],
]);
for (const icon of icons) {
  const expectedSvg = renderIconSvg(icon);
  const svg = await snapshot(
    `icons/${icon.name}.svg`,
    new TextEncoder().encode(expectedSvg).length,
  );
  if (decoder.decode(svg) !== expectedSvg) {
    throw Error(`Stale public icon: ${icon.name}`);
  }
  const matching = catalog.icons.filter((entry: { name: string }) =>
    entry.name === icon.name
  );
  if (matching.length !== 1 || matching[0].sha256 !== await hash(svg)) {
    throw Error(`Stale public catalog: ${icon.name}`);
  }
  assets.set(`/icons/${icon.name}.svg`, [svg, "image/svg+xml"]);
}
const controller = new AbortController();
Deno.addSignalListener("SIGINT", () => controller.abort());
Deno.addSignalListener("SIGTERM", () => controller.abort());
const server = Deno.serve(
  { hostname, port, signal: controller.signal },
  (request) => {
    const host = request.headers.get("host")?.toLowerCase();
    if (!host || !allowed.has(host)) {
      return new Response("Invalid Host", {
        status: 403,
      });
    }
    if (!["GET", "HEAD"].includes(request.method)) {
      return new Response("Method not allowed", {
        status: 405,
        headers: { Allow: "GET, HEAD" },
      });
    }
    const path = new URL(request.url).pathname;
    const headers = {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    };
    if (path === "/") {
      return new Response(request.method === "HEAD" ? null : gallery, {
        headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
      });
    }
    const asset = assets.get(path);
    if (!asset) return new Response("Not found", { status: 404 });
    return new Response(
      request.method === "HEAD" ? null : new Uint8Array(asset[0]).buffer,
      { headers: { ...headers, "Content-Type": asset[1] } },
    );
  },
);
await server.finished;
