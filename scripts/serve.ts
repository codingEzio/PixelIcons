/** Optional maintenance server. Only public library assets are reachable. */
import { icons } from "../src/icons.ts";
import { renderIconSvg } from "../src/render.ts";
import { renderGallery } from "../src/gallery.ts";
const options = new Map<string, string>();
for (let i = 0; i < Deno.args.length; i += 2) {
  const key = Deno.args[i];
  const value = Deno.args[i + 1];
  if (!["--port", "--host"].includes(key) || !value || options.has(key)) {
    throw Error("Usage: deno task serve --port <port> [--host <address>]");
  }
  options.set(key, value);
}
const port = Number(options.get("--port"));
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw Error("Specify a port from 1024 to 65535");
}
const hostname = options.get("--host") ?? "127.0.0.1";
const gallery = renderGallery(
  icons.map((icon) => ({ ...icon, svg: renderIconSvg(icon) })),
);
const assets = new Map<string, readonly [string, string]>([
  ["/catalog.json", ["catalog.json", "application/json"]],
  ["/previews/overview.svg", ["previews/overview.svg", "image/svg+xml"]],
  ["/previews/overview.png", ["previews/overview.png", "image/png"]],
]);
for (const icon of icons) {
  assets.set(`/icons/${icon.name}.svg`, [
    `icons/${icon.name}.svg`,
    "image/svg+xml",
  ]);
}
const controller = new AbortController();
Deno.addSignalListener("SIGINT", () => controller.abort());
Deno.addSignalListener("SIGTERM", () => controller.abort());
const server = Deno.serve(
  { hostname, port, signal: controller.signal },
  async (request) => {
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
    try {
      const bytes = await Deno.readFile(asset[0]);
      return new Response(request.method === "HEAD" ? null : bytes, {
        headers: { ...headers, "Content-Type": asset[1] },
      });
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return new Response("Asset missing; run deno task build", {
          status: 404,
        });
      }
      console.error(error);
      return new Response("Asset read failed", { status: 500 });
    }
  },
);
await server.finished;
