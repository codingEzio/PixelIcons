# X-PixelIcons artwork

![X-PixelIcons documentation mark](docs/icon.svg)

[English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md)
· [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

98 selected SVG assets. Open catalog.json for semantic IDs and source/export
hashes. Use icons/<id>.svg directly; grids.json preserves editable dot grids.

## Use

Use `icons/<id>.svg` directly. The package also includes `editable grids.json`.
`catalog.json` records stable IDs and source/export hashes; filenames remain
stable. No server, account or build tool is needed to use the exported assets.

SVGs use currentColor. Inline an SVG to inherit CSS color; an img element does
not inherit the surrounding text color. The editable grids and original canvas
dimensions are preserved.

![Selected artwork](previews/overview.png)

## License and attribution

Credit X-PixelIcons and the supplied source/provenance; link to
https://creativecommons.org/licenses/by/4.0/ and state changes. CC BY 4.0
applies only to owned rights. Trademarks and other third-party rights are not
granted. These are project-authored dot grids; learning references supplied no
imported artwork.

Document mark: codingEzio,
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
([ARTWORK-LICENSE.md](ARTWORK-LICENSE.md)); indicate changes. This separate
grant covers only `docs/icon.svg` and does not change the selected collection
artwork scope.

## Source boundary

This local source candidate contains a reproducible source tree for 98 selected
icons. Its Git history is independent of the original private repository. It
excludes private originals and the two unselected brand-related icons. The
source, metadata and visual review is bounded and does not establish universal
rights clearance. See LICENSE-SCOPE.json and public-files.json.

## Optional private local assembly

Keep a JSON array of private `IconDefinition` grids in the ignored
`Local/private-icons.json`, then run `deno task private:build`. It verifies the
public assets first and writes a separate private directory under `Local/` with
SVGs, a catalog, an overview and a self-contained gallery. Private entries have
no public artwork grant. Retain private originals and provenance separately;
this assembly does not migrate or publish them. Never commit or upload `Local/`.
Run `deno task private:png --build Local/private-build-...` to create the PNG
and hash receipt, then
`deno task private:serve --build Local/private-build-...
--port 18230` for the
gallery and assets on 127.0.0.1 only. The build directory is printed by
`private:build`. PNG export requires librsvg. Private output and receipts remain
in the ignored directory.
