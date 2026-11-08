import { icons } from "./icons.ts";
import { renderIconSvg } from "./render.ts";
/** A static contact sheet from the same grids and renderer as the SVG exports. */
export function renderOverview(
  iconsToRender = icons,
  caption?: string,
): string {
  const icons = iconsToRender;
  const columns = 10;
  const rows = Math.ceil(icons.length / columns);
  const height = 180 + rows * 92;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="${height}" viewBox="0 0 1280 ${height}" role="img" aria-labelledby="title desc">
<title id="title">X-PixelIcons — ${icons.length} round-dot icons</title>
<desc id="desc">${
    caption ??
      "Selected semantic icons rendered from the actual 9 by 9 grids. CC BY 4.0 applies to the extent of owned rights."
  }</desc>
<rect width="1280" height="${height}" fill="#f8f7f1"/>
<g font-family="Arial, sans-serif" fill="#252a20" color="#252a20">
<text x="32" y="58" font-size="36" font-weight="700">X-PixelIcons</text>
<text x="32" y="91" font-size="17" fill="#646c58">${icons.length} semantic icons · 9 × 9 round-dot grids · SVG</text>
${
    icons.map((icon, i) => {
      const x = 30 + (i % columns) * 122;
      const y = 120 + Math.floor(i / columns) * 92;
      const body = renderIconSvg(icon).replace(
        /<svg[^>]*>|<\/svg>|<title>.*?<\/title>/g,
        "",
      ).trim();
      return `<g transform="translate(${x + 37},${y}) scale(${
        48 / icon.canvas
      })">${body}</g><text x="${x + 61}" y="${
        y + 69
      }" text-anchor="middle" font-size="12">${icon.name}</text>`;
    }).join("\n")
  }
<text x="32" y="${height - 20}" font-size="13" fill="#646c58">${
    caption ??
      "Selected artwork · CC BY 4.0 to the extent of owned rights"
  }</text>
</g></svg>\n`;
}
