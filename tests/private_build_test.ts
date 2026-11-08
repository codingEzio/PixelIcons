const script = new URL("../scripts/private-build.ts", import.meta.url).pathname;
const catalog = new URL("../catalog.json", import.meta.url).pathname;
const assert = (value: unknown, message: string) => {
  if (!value) throw Error(message);
};
Deno.test("private assembly rejects collisions and keeps outputs under Local", async () => {
  const dir = await Deno.makeTempDir({ prefix: "pixel-private-test-" });
  try {
    await Deno.mkdir(`${dir}/Local`);
    await Deno.copyFile(catalog, `${dir}/catalog.json`);
    const path = `${dir}/Local/private-icons.json`;
    const synthetic = {
      name: "privateTest",
      category: "brands",
      rows: [
        "000010000",
        "000010000",
        "000010000",
        "000010000",
        "000010000",
        "000010000",
        "000010000",
        "000010000",
        "000010000",
      ],
      canvas: 22,
      origin: 2,
      step: 2.25,
      radius: 0.95,
    };
    const run = () =>
      new Deno.Command(Deno.execPath(), {
        args: ["run", "--allow-read", "--allow-write=Local", script],
        cwd: dir,
        stdout: "piped",
        stderr: "piped",
      }).output();
    await Deno.writeTextFile(
      path,
      JSON.stringify([{ ...synthetic, name: "calendar" }]),
    );
    assert(!(await run()).success, "duplicate public names must fail");
    const before = await Array.fromAsync(Deno.readDir(`${dir}/Local`));
    assert(before.length === 1, "rejected input must not create output");
    await Deno.writeTextFile(path, JSON.stringify([synthetic]));
    const result = await run();
    assert(result.success, new TextDecoder().decode(result.stderr));
    const dirs = (await Array.fromAsync(Deno.readDir(`${dir}/Local`))).filter((
      e,
    ) => e.isDirectory);
    assert(dirs.length === 1, "one private output directory");
    const out = `${dir}/Local/${dirs[0].name}`;
    const built = JSON.parse(await Deno.readTextFile(`${out}/catalog.json`));
    assert(
      built.count === 99 && built.icons.length === 99,
      "public plus synthetic count",
    );
    assert(
      (await Deno.readTextFile(`${out}/icons/privateTest.svg`)).includes(
        "<svg",
      ),
      "private SVG present",
    );
    assert(
      (await Deno.readTextFile(`${out}/gallery.html`)).includes("privateTest"),
      "private gallery present",
    );
    assert(
      (await Deno.readTextFile(`${out}/catalog.json`)).includes(
        "private; not granted for publication",
      ),
      "private scope explicit",
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
