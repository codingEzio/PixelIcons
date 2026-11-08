/** Only generated private builds under a real ignored Local directory are valid. */
export async function privateBuildPath(
  value: string | undefined,
): Promise<string> {
  if (!value || !/^Local\/private-build-[a-f0-9]+$/.test(value)) {
    throw Error("Specify a generated Local/private-build-... directory");
  }
  for (const path of ["Local", value]) {
    const stat = await Deno.lstat(path);
    if (!stat.isDirectory || stat.isSymlink) {
      throw Error(`Unsafe private directory: ${path}`);
    }
  }
  return value;
}
export async function regularFile(path: string): Promise<Uint8Array> {
  const stat = await Deno.lstat(path);
  if (!stat.isFile || stat.isSymlink) {
    throw Error(`Unsafe private file: ${path}`);
  }
  return await Deno.readFile(path);
}
