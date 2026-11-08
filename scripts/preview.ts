import { icons } from "../src/icons.ts";
import { renderIconSvg } from "../src/render.ts";
import { renderGallery } from "../src/gallery.ts";
await Deno.mkdir("Local", { recursive: true });
await Deno.writeTextFile(
  "Local/gallery.html",
  renderGallery(
    icons.map((icon) => ({
      name: icon.name,
      category: icon.category,
      svg: renderIconSvg(icon),
    })),
  ),
);
console.log("Optional local tool: Local/gallery.html (ignored by Git)");
