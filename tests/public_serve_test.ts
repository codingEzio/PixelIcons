const root = new URL("../", import.meta.url);
const script = new URL("../scripts/serve.ts", import.meta.url).pathname;
const assert = (condition: unknown, message: string) => {
  if (!condition) throw Error(message);
};
async function port(): Promise<number> {
  const listener = Deno.listen({ hostname: "127.0.0.1", port: 0 });
  const result = (listener.addr as Deno.NetAddr).port;
  listener.close();
  return result;
}
async function request(
  port: number,
  path: string,
  host: string,
): Promise<{ status: number; body: Uint8Array }> {
  const conn = await Deno.connect({ hostname: "127.0.0.1", port });
  await conn.write(
    new TextEncoder().encode(
      `GET ${path} HTTP/1.1\r\nHost: ${host}\r\nConnection: close\r\n\r\n`,
    ),
  );
  const bytes = new Uint8Array(await new Response(conn.readable).arrayBuffer());
  const marker = new TextEncoder().encode("\r\n\r\n");
  let end = 0;
  while (
    end < bytes.length - 3 && !marker.every((v, i) => bytes[end + i] === v)
  ) end++;
  const header = new TextDecoder().decode(bytes.subarray(0, end));
  return {
    status: Number(header.match(/^HTTP\/1\.1 (\d+)/)?.[1]),
    body: bytes.subarray(end + 4),
  };
}
Deno.test({
  name: "public server snapshots assets and rejects unapproved hosts",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const tmp = await Deno.makeTempDir({ prefix: "pixel-serve-test-" });
    let child: Deno.ChildProcess | undefined;
    try {
      await Deno.mkdir(`${tmp}/icons`);
      await Deno.mkdir(`${tmp}/previews`);
      await Deno.copyFile(new URL("catalog.json", root), `${tmp}/catalog.json`);
      for await (const entry of Deno.readDir(new URL("icons/", root))) {
        await Deno.copyFile(
          new URL(`icons/${entry.name}`, root),
          `${tmp}/icons/${entry.name}`,
        );
      }
      for (const name of ["overview.svg", "overview.png", "receipt.json"]) {
        await Deno.copyFile(
          new URL(`previews/${name}`, root),
          `${tmp}/previews/${name}`,
        );
      }
      const p = await port();
      const spawn = (...args: string[]) =>
        new Deno.Command(Deno.execPath(), {
          args: [
            "run",
            "--allow-read",
            "--allow-net",
            "--allow-sys=uid,gid",
            script,
            "--port",
            String(p),
            ...args,
          ],
          cwd: tmp,
          stdout: "null",
          stderr: "null",
        }).spawn();
      child = spawn();
      let ready = false;
      for (let i = 0; i < 100; i++) {
        try {
          if ((await request(p, "/", `127.0.0.1:${p}`)).status === 200) {
            ready = true;
            break;
          }
        } catch { /* awaiting the listener */ }
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      assert(ready, "server did not start");
      const original = await Deno.readFile(`${tmp}/icons/home.svg`);
      await Deno.writeTextFile(`${tmp}/secret.txt`, "synthetic private value");
      await Deno.remove(`${tmp}/icons/home.svg`);
      await Deno.symlink(`${tmp}/secret.txt`, `${tmp}/icons/home.svg`);
      const result = await request(p, "/icons/home.svg", `127.0.0.1:${p}`);
      assert(
        result.status === 200 && result.body.length === original.length &&
          result.body.every((v, i) => v === original[i]),
        "must serve captured public bytes after symlink swap",
      );
      assert(
        (await request(p, "/", "attacker.example:" + p)).status === 403,
        "host rebinding must fail",
      );
      assert(
        (await request(p, "/secret.txt", `127.0.0.1:${p}`)).status === 404,
        "private path must fail",
      );
      child.kill("SIGTERM");
      await child.status;
      child = undefined;
      const rejected = await spawn().status;
      assert(!rejected.success, "symlink present before startup must fail");
      await Deno.remove(`${tmp}/icons/home.svg`);
      await Deno.writeFile(`${tmp}/icons/home.svg`, original);
      const pngPath = `${tmp}/previews/overview.png`;
      const receiptPath = `${tmp}/previews/receipt.json`;
      const pngOriginal = await Deno.readFile(pngPath);
      const receiptOriginal = await Deno.readTextFile(receiptPath);
      await Deno.truncate(pngPath, 2 ** 34);
      assert(
        !(await spawn().status).success,
        "oversized sparse PNG must fail before allocation",
      );
      await Deno.writeFile(pngPath, pngOriginal);
      const modified = pngOriginal.slice();
      modified[modified.length - 1] ^= 1;
      await Deno.writeFile(pngPath, modified);
      const receipt = JSON.parse(receiptOriginal);
      receipt.pngSha256 = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", modified.buffer)),
        (n) => n.toString(16).padStart(2, "0"),
      ).join("");
      await Deno.writeTextFile(receiptPath, JSON.stringify(receipt));
      assert(
        !(await spawn().status).success,
        "matching attacker-controlled PNG and receipt must fail",
      );
      await Deno.writeFile(pngPath, pngOriginal);
      await Deno.writeTextFile(receiptPath, receiptOriginal);
      await Deno.rename(`${tmp}/previews`, `${tmp}/real-previews`);
      await Deno.symlink(`${tmp}/real-previews`, `${tmp}/previews`);
      assert(
        !(await spawn().status).success,
        "symlinked preview directory must fail before reads",
      );
      await Deno.remove(`${tmp}/previews`);
      await Deno.rename(`${tmp}/real-previews`, `${tmp}/previews`);
      const catalogPath = `${tmp}/catalog.json`;
      const catalogOriginal = await Deno.readFile(catalogPath);
      const changedCatalog = catalogOriginal.slice();
      changedCatalog[changedCatalog.length - 2] ^= 1;
      await Deno.writeFile(catalogPath, changedCatalog);
      assert(!(await spawn().status).success, "unreviewed catalog must fail");
      await Deno.writeFile(catalogPath, catalogOriginal);
      const noAllow = await spawn("--host", "0.0.0.0").status;
      assert(!noAllow.success, "wildcard must require explicit hosts");
      child = spawn("--host", "0.0.0.0", "--allow-host", "pixel.example");
      ready = false;
      for (let i = 0; i < 100; i++) {
        try {
          if ((await request(p, "/", `pixel.example:${p}`)).status === 200) {
            ready = true;
            break;
          }
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      assert(ready, "explicit wildcard host must work");
      assert(
        (await request(p, "/", `attacker.example:${p}`)).status === 403,
        "wildcard must reject other hosts",
      );
    } finally {
      if (child) {
        child.kill("SIGTERM");
        await child.status;
      }
      await Deno.remove(tmp, { recursive: true });
    }
  },
});
