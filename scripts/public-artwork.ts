/** Selected artwork export only; full source review remains a separate payload. */
import { icons } from "../src/icons.ts";
import { renderIconSvg } from "../src/render.ts";
import { renderOverview } from "../src/overview.ts";
const encoder = new TextEncoder();
const encode = (value: unknown) =>
  encoder.encode(JSON.stringify(value, null, 2) + "\n");
const hash = async (bytes: Uint8Array) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer),
    ),
    (n) => n.toString(16).padStart(2, "0"),
  ).join("");
const read = async (path: string) => {
  if (!/^(icons\/[A-Za-z]+\.svg|assets\/webp\/[a-z]+\.webp)$/.test(path)) {
    throw Error("Invalid artwork path");
  }
  const parts = path.split("/");
  for (let i = 1; i <= parts.length; i++) {
    const stat = await Deno.lstat(parts.slice(0, i).join("/"));
    if (stat.isSymlink) throw Error("Artwork symlink rejected");
  }
  return await Deno.readFile(path);
};
export async function artworkFiles(): Promise<Map<string, Uint8Array>> {
  const scope = JSON.parse(await Deno.readTextFile("LICENSE-SCOPE.json"));
  const provenance = JSON.parse(await Deno.readTextFile("provenance.json"));
  const selected = scope.artwork.assets.filter((a: { selection: string }) =>
    a.selection === "selected"
  );
  if (
    !selected.length || selected.length !== scope.artwork.selectedCount ||
    new Set(selected.map((a: { id: string }) => a.id)).size !== selected.length
  ) throw Error("Invalid selected artwork scope");
  const files = new Map<string, Uint8Array>();
  const mark = scope.documentationArtwork;
  if (
    mark?.file !== "docs/icon.svg" ||
    mark.licenseFile !== "ARTWORK-LICENSE.md" ||
    mark.license !== "CC-BY-4.0" || mark.attribution !== "codingEzio"
  ) throw Error("Invalid documentation mark scope");
  for (const path of ["docs", mark.file, mark.licenseFile]) {
    if ((await Deno.lstat(path)).isSymlink) {
      throw Error("Documentation mark symlink rejected");
    }
  }
  const markBytes = await Deno.readFile(mark.file);
  if (await hash(markBytes) !== mark.sha256) {
    throw Error("Documentation mark differs from licensed bytes");
  }
  files.set(mark.file, markBytes);
  files.set(mark.licenseFile, await Deno.readFile(mark.licenseFile));
  for (const asset of selected) {
    const bytes = await read(asset.file);
    if (
      await hash(bytes) !== asset.sha256 ||
      asset.visualReview !== scope.artwork.visualReview ||
      !asset.metadataReview ||
      asset.license !== "CC-BY-4.0-to-extent-of-owned-rights"
    ) throw Error(`Unreviewed or changed artwork: ${asset.id}`);
    files.set(asset.file, bytes);
  }
  const ids = new Set(selected.map((a: { id: string }) => a.id));
  const chosen = icons.filter((i) => ids.has(i.name));
  if (chosen.length !== selected.length) throw Error("Missing selected grid");
  for (const icon of chosen) {
    const initial = provenance.icons.find((i: { name: string }) =>
      i.name === icon.name
    );
    if (
      !initial ||
      JSON.stringify(initial.initialRows) !== JSON.stringify(icon.rows)
    ) throw Error(`Grid/source receipt differs: ${icon.name}`);
    if (
      new TextDecoder().decode(files.get(`icons/${icon.name}.svg`)!) !==
        renderIconSvg(icon)
    ) throw Error("SVG differs from grid");
  }
  const catalog = JSON.parse(await Deno.readTextFile("catalog.json"));
  files.set(
    "catalog.json",
    encode({
      ...catalog,
      count: chosen.length,
      license: "CC-BY-4.0-to-extent-of-owned-rights",
      icons: catalog.icons.filter((i: { name: string }) => ids.has(i.name)),
    }),
  );
  files.set("grids.json", encode(chosen));
  // Keep the full owner import receipt private. The exported record preserves
  // source hashes and original grids without exposing the private origin.
  const sourceHashes = new Map<string, string>(
    provenance.sources.map((source: { path: string; sha256: string }) => [
      source.path,
      source.sha256,
    ]),
  );
  const selectedOrigins = provenance.icons
    .filter((icon: { name: string }) => ids.has(icon.name))
    .map((icon: { name: string; source: string; initialRows: string[] }) => {
      const sourceSha256 = sourceHashes.get(icon.source);
      if (!sourceSha256 || !/^[0-9a-f]{64}$/.test(sourceSha256)) {
        throw Error(`Missing source hash for ${icon.name}`);
      }
      return { name: icon.name, sourceSha256, initialRows: icon.initialRows };
    });
  files.set(
    "provenance.json",
    encode({
      schemaVersion: 1,
      attribution: "codingEzio",
      importedOn: provenance.importedOn,
      description:
        "Project-authored grids; source identities are retained privately. Initial rows and source SHA-256 values are preserved.",
      license: provenance.license,
      selectedCount: chosen.length,
      icons: selectedOrigins,
    }),
  );
  const svg = renderOverview(
    chosen,
    "Selected artwork · CC BY 4.0 to the extent of owned rights",
  );
  const png = await new Deno.Command("rsvg-convert", {
    args: ["--format=png"],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const writer = png.stdin.getWriter();
  await writer.write(encoder.encode(svg));
  await writer.close();
  const output = await png.output();
  if (!output.success) throw Error(new TextDecoder().decode(output.stderr));
  files.set("previews/overview.svg", encoder.encode(svg));
  files.set("previews/overview.png", output.stdout);
  files.set(
    "previews/receipt.json",
    encode({
      renderer: "local librsvg rsvg-convert; selected grids only",
      svgSha256: await hash(encoder.encode(svg)),
      pngSha256: await hash(output.stdout),
    }),
  );
  const selectedScope = {
    ...scope,
    artwork: {
      ...scope.artwork,
      assets: selected.map((asset: { id: string }) => ({
        ...asset,
        sourceReference: `grids.json#${asset.id}`,
      })),
      candidateCount: 0,
      excludedCount: 0,
    },
    excludedFromThisPackage: scope.artwork.excludedCount,
  };
  selectedScope.code.files = [];
  files.set("LICENSE-SCOPE.json", encode(selectedScope));
  files.set("LICENSE", encoder.encode(await Deno.readTextFile("LICENSE")));
  files.set(
    "LICENSE-ARTWORK.md",
    encoder.encode(await Deno.readTextFile("LICENSE-ARTWORK.md")),
  );
  const terms = {
    en: `# X-PixelIcons artwork

[English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

${selected.length} selected SVG assets. Open catalog.json for semantic IDs and source/export hashes. Use icons/<id>.svg directly; grids.json preserves editable dot grids.

## Use

Use \`icons/<id>.svg\` directly. The package also includes \`editable grids.json\`. \`catalog.json\` records stable IDs and source/export hashes; filenames remain stable. No server, account or build tool is needed to use the exported assets.

SVGs use currentColor. Inline an SVG to inherit CSS color; an img element does not inherit the surrounding text color. The editable grids and original canvas dimensions are preserved.

![Selected artwork](previews/overview.png)

## License and attribution

Credit X-PixelIcons and the supplied source/provenance; link to https://creativecommons.org/licenses/by/4.0/ and state changes. CC BY 4.0 applies only to owned rights. Trademarks and other third-party rights are not granted. These are project-authored dot grids; learning references supplied no imported artwork.

## Source boundary

This local candidate excludes unresolved material, private originals, full tools source and Git history. See LICENSE-SCOPE.json and candidate-receipt.json. Selection is a bounded source, metadata and visual review, not a guarantee of copyright or legal clearance.
`,
    "zh-TW": `# X-PixelIcons 素材

[English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

${selected.length} 件入選 SVG 素材。catalog.json 提供穩定語意 ID 與來源／輸出雜湊。可直接使用 icons/<id>.svg；grids.json 保留可編輯點陣。

## 使用

直接使用 \`icons/<id>.svg\`，另附 \`editable grids.json\`。catalog.json 提供穩定 ID 與來源／輸出雜湊；檔名保持穩定。使用素材不需要伺服器、帳號或建置工具。 SVG 使用 currentColor；內嵌才能繼承 CSS 顏色，img 不繼承周圍文字顏色。保留可編輯點陣與原畫布尺寸。

![入選素材](previews/overview.png)

## 授權與署名

請標示 X-PixelIcons 與所附來源／出處、連結 https://creativecommons.org/licenses/by/4.0/ 並註明修改。CC BY 4.0 僅涵蓋可授權的自有權利，不授予商標或第三方權利。素材為專案自繪點陣；學習參考未供應匯入圖稿。

## 來源範圍

本機候選包排除來源未解素材、私人原檔、完整工具原始碼及 Git 歷史。詳見 LICENSE-SCOPE.json 與 candidate-receipt.json。此次僅核對來源、容器中繼資料與可見內容，不保證著作權成立或全面法律清除。
`,
    "zh-CN": `# X-PixelIcons 素材

[English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

${selected.length} 件入选 SVG 素材。catalog.json 提供稳定语义 ID 与来源／输出哈希。可直接使用 icons/<id>.svg；grids.json 保留可编辑点阵。

## 使用

直接使用 \`icons/<id>.svg\`，另附 \`editable grids.json\`。catalog.json 提供稳定 ID 与来源／输出哈希；文件名保持稳定。使用素材不需要服务器、账号或构建工具。 SVG 使用 currentColor；内嵌才能继承 CSS 颜色，img 不继承周围文字颜色。保留可编辑点阵和原画布尺寸。

![入选素材](previews/overview.png)

## 许可与署名

请标注 X-PixelIcons 与所附来源／出处、链接 https://creativecommons.org/licenses/by/4.0/ 并说明修改。CC BY 4.0 仅涵盖可授权的自有权利，不授予商标或第三方权利。素材为项目自绘点阵；学习参考未供应导入图稿。

## 来源范围

本地候选包排除来源未明素材、私人原文件、完整工具源码及 Git 历史。参见 LICENSE-SCOPE.json 与 candidate-receipt.json。此次仅核对来源、容器元数据与可见内容，不保证版权成立或全面法律审查通过。
`,
    "ja": `# X-PixelIcons artwork

[English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

${selected.length}点の選定済みSVG素材です。安定したIDと由来／出力ハッシュを持つカタログを添付します。

## 使う

\`icons/<id>.svg\` を直接使用し、\`editable grids.json\` も同梱します。catalog.json に安定IDと元／出力ハッシュがあり、使用にサーバー・アカウント・ビルドツールは不要です。 SVG の currentColor はインラインで CSS 色を継承し、img では周囲の文字色を継承しません。編集グリッドと元のキャンバス寸法を保持します。

![Selected artwork](previews/overview.png)

## ライセンスと出典

X-PixelIconsと同梱の出典を表示し、https://creativecommons.org/licenses/by/4.0/ へリンクして変更を明記してください。CC BY4.0 は所有者が許諾できる権利だけを対象とし、商標や第三者の権利を与えません。自作の丸点グリッドから生成し、学習参考から画像やコードを輸入していません。

## ソース範囲

このローカル候補は未解決素材、私有原本、完全なツールソースとGit履歴を除外します。LICENSE-SCOPE.jsonとcandidate-receipt.jsonを確認してください。範囲内の出典、容器メタデータと可視内容の審査であり、包括的な権利保証ではありません。
`,
    "ko": `# X-PixelIcons artwork

[English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

선택한SVG자산${selected.length}개와 안정된 ID、원본／출력 해시를 가진 카탈로그입니다.

## 사용

\`icons/<id>.svg\`를 직접 사용하며 \`editable grids.json\`도 포함합니다. catalog.json에 안정된ID와 원본／출력 해시가 있으며 사용에 서버、계정、빌드 도구가 필요하지 않습니다. SVG currentColor는 inline에서 CSS 색을 상속하며 img는 주변 글자색을 상속하지 않습니다. 편집 그리드와 원래 캔버스 크기를 유지합니다.

![Selected artwork](previews/overview.png)

## 라이선스와 출처

X-PixelIcons와 동봉 출처를 표시하고 https://creativecommons.org/licenses/by/4.0/ 에 연결하며 변경을 명시합니다. CC BY4.0은 보유자가 허가할 수 있는 권리만 적용하며 상표나 제3자 권리를 부여하지 않습니다.자체 둥근 점 그리드에서 생성하며 학습 참고의 이미지나 코드를 가져오지 않았습니다.

## 소스 범위

로컬 후보는 미해결 자산、개인 원본、전체 도구 소스와 Git 이력을 제외합니다. LICENSE-SCOPE.json과candidate-receipt.json을 확인하십시오. 출처、컨테이너 메타데이터、보이는 내용의 한정 검토이며 포괄적 권리 보증은 아닙니다.
`,
    "es": `# X-PixelIcons artwork

[English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

${selected.length} recursos SVG seleccionados, con catálogo de ID estables y hashes de fuente y exportación.

## Uso

Use \`icons/<id>.svg\` directamente; se incluye también \`editable grids.json\`. catalog.json conserva ID y hashes estables. Para usar los archivos no necesita servidor, cuenta o herramientas de compilación. Los SVG usan currentColor: sólo al insertarlos inline heredan color CSS. Un img no hereda el color del texto. Se conservan rejillas editables y tamaños de lienzo originales.

![Selected artwork](previews/overview.png)

## Licencia y atribución

Atribuya X-PixelIcons y la procedencia incluida; enlace https://creativecommons.org/licenses/by/4.0/ e indique cambios. CC BY4.0 cubre sólo derechos propios disponibles. No concede marcas ni derechos ajenos. Proceden de rejillas de puntos propias; las referencias de aprendizaje no aportaron arte ni código importado.

## Ámbito de fuente

Este candidato local excluye material sin resolver, originales privados, fuentes completas de herramientas e historia Git. Consulte LICENSE-SCOPE.json y candidate-receipt.json. Es revisión limitada de procedencia, metadatos y contenido visible, no garantía jurídica universal.
`,
  };
  const documentMarkNotes: Record<string, string> = {
    "en":
      "Document mark: codingEzio, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) ([ARTWORK-LICENSE.md](ARTWORK-LICENSE.md)); indicate changes. This separate grant covers only `docs/icon.svg` and does not change the selected collection artwork scope.",
    "zh-TW":
      "文件標誌：codingEzio，[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) ([ARTWORK-LICENSE.md](ARTWORK-LICENSE.md))；請註明修改。此獨立授權僅涵蓋 `docs/icon.svg`，不變更已選定的收藏作品範圍。",
    "zh-CN":
      "文档标志：codingEzio，[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) ([ARTWORK-LICENSE.md](ARTWORK-LICENSE.md))；请注明修改。此独立授权仅涵盖 `docs/icon.svg`，不改变已选定的收藏作品范围。",
    "ja":
      "文書用マーク：codingEzio、[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) ([ARTWORK-LICENSE.md](ARTWORK-LICENSE.md))。変更を明記してください。この独立した許諾は `docs/icon.svg` だけを対象とし、選定済みコレクションの作品範囲は変更しません。",
    "ko":
      "문서 마크: codingEzio, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) ([ARTWORK-LICENSE.md](ARTWORK-LICENSE.md)). 변경 사항을 표시하십시오. 이 별도 허가는 `docs/icon.svg`에만 적용되며 선택한 컬렉션 작품의 범위를 변경하지 않습니다.",
    "es":
      "Marca de documentación: codingEzio, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) ([ARTWORK-LICENSE.md](ARTWORK-LICENSE.md)); indique los cambios. Esta licencia separada cubre solo `docs/icon.svg` y no cambia el alcance de las obras seleccionadas de la colección.",
  };
  for (const [locale, text] of Object.entries(terms)) {
    files.set(
      locale === "en" ? "README.md" : `README.${locale}.md`,
      encoder.encode(
        text.replace(
          /^(# .+\n)/,
          "$1\n![X-PixelIcons documentation mark](docs/icon.svg)\n",
        ).replace(
          /^## (?:Source boundary|來源範圍|来源范围|ソース範囲|소스 범위|Ámbito de fuente)$/m,
          `${documentMarkNotes[locale]}\n\n$&`,
        ),
      ),
    );
  }
  return files;
}
