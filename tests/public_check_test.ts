const script = new URL("../scripts/public-check.ts", import.meta.url);
function assert(value: unknown, message: string): asserts value {
  if (!value) throw Error(message);
}
Deno.test("local candidate boundaries and exact readback", async () => {
  const directory = await Deno.makeTempDir({ prefix: "public-review-test-" });
  try {
    await Deno.copyFile(script, `${directory}/check.ts`);
    await Deno.writeTextFile(`${directory}/sample.txt`, "synthetic fixture\n");
    const policy = {
      files: ["sample.txt"],
      releaseBlockers: ["License review pending"],
    };
    const writePolicy = () =>
      Deno.writeTextFile(
        `${directory}/public-files.json`,
        JSON.stringify(policy),
      );
    await writePolicy();
    const run = (...args: string[]) =>
      new Deno.Command(Deno.execPath(), {
        args: [
          "run",
          "--allow-read",
          "--allow-write=Local",
          "check.ts",
          ...args,
        ],
        cwd: directory,
        stdout: "piped",
        stderr: "piped",
      }).output();
    assert((await run()).success, "valid input must pass");
    assert(
      !(await run("--release", "--export")).success,
      "pending rights must block before export",
    );
    let created = false;
    try {
      await Deno.stat(`${directory}/Local`);
      created = true;
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }
    assert(!created, "blocked release must not create output");
    const result = await run("--export");
    assert(result.success, new TextDecoder().decode(result.stderr));
    const line = new TextDecoder().decode(result.stdout).split("\n")[0];
    const output = line.slice("Candidate: ".length);
    assert(
      await Deno.readTextFile(`${directory}/${output}/sample.txt`) ===
        "synthetic fixture\n",
      "export bytes",
    );
    assert(
      (await run("--export")).success,
      "identical candidate must be reusable",
    );
    await Deno.writeTextFile(`${directory}/${output}/sample.txt`, "tampered");
    assert(!(await run("--export")).success, "tampered candidate must fail");
    assert(
      await Deno.readTextFile(`${directory}/${output}/sample.txt`) ===
        "tampered",
      "tampered bytes must not be overwritten",
    );
    await Deno.writeTextFile(
      `${directory}/${output}/sample.txt`,
      "synthetic fixture\n",
    );
    await Deno.chmod(`${directory}/${output}/sample.txt`, 0o755);
    assert(!(await run("--export")).success, "changed mode must fail");
    await Deno.chmod(`${directory}/${output}/sample.txt`, 0o644);
    await Deno.writeTextFile(`${directory}/${output}/extra.txt`, "extra");
    assert(
      !(await run("--export")).success,
      "unexpected candidate file must fail",
    );
    await Deno.remove(`${directory}/${output}/extra.txt`);
    await Deno.writeTextFile(
      `${directory}/${output}/candidate-receipt.json`,
      "{}",
    );
    assert(!(await run("--export")).success, "changed receipt must fail");
    await Deno.writeTextFile(
      `${directory}/sample.txt`,
      ["", "Users", "synthetic", "private"].join("/"),
    );
    assert(!(await run()).success, "home path must be rejected");
    policy.files = ["../sample.txt"];
    await writePolicy();
    assert(!(await run()).success, "traversal must be rejected");
    policy.files = ["link.txt"];
    await writePolicy();
    await Deno.symlink("sample.txt", `${directory}/link.txt`);
    assert(!(await run()).success, "input symlink must be rejected");
    policy.files = ["sample.txt"];
    await writePolicy();
    await Deno.writeTextFile(
      `${directory}/sample.txt`,
      "changed synthetic fixture\n",
    );
    await Deno.remove(`${directory}/Local`, { recursive: true });
    await Deno.mkdir(`${directory}/outside`);
    await Deno.symlink("outside", `${directory}/Local`);
    assert(!(await run("--export")).success, "output symlink must be rejected");
    assert(
      !(await run("--unknown")).success,
      "unknown option must be rejected",
    );
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("selected artwork keeps provenance hashes without private source identity", async () => {
  const { artworkFiles } = await import("../scripts/public-artwork.ts");
  const original = JSON.parse(await Deno.readTextFile("provenance.json"));
  const files = await artworkFiles();
  const text = new TextDecoder().decode(files.get("provenance.json"));
  const exported = JSON.parse(text);
  assert(!text.includes(original.sourceProject), "private project excluded");
  assert(!text.includes(original.sourceRevision), "private revision excluded");
  for (const source of original.sources) {
    assert(!text.includes(source.path), "private source path excluded");
  }
  const hashes = new Map(
    original.sources.map((
      s: { path: string; sha256: string },
    ) => [s.path, s.sha256]),
  );
  for (const item of exported.icons) {
    const source = original.icons.find((value: { name: string }) =>
      value.name === item.name
    );
    assert(
      source && item.sourceSha256 === hashes.get(source.source),
      "source hash retained",
    );
    assert(
      JSON.stringify(item.initialRows) === JSON.stringify(source.initialRows),
      "original grid retained",
    );
  }
  assert(
    exported.attribution === "codingEzio" && exported.icons.length === 98,
    "selected attribution and scope",
  );
});
