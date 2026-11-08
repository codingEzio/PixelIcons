import type { IconDefinition } from "./icons.ts";

export function validateIcon(icon: IconDefinition): void {
  if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(icon.name)) {
    throw new Error(`Invalid name: ${icon.name}`);
  }
  if (
    icon.rows.length !== 9 || icon.rows.some((row) => !/^[01]{9}$/.test(row))
  ) throw new Error(`Invalid 9×9 grid: ${icon.name}`);
  if (!icon.rows.some((row) => row.includes("1"))) {
    throw new Error(`Empty icon: ${icon.name}`);
  }
  if (
    ![icon.canvas, icon.origin, icon.step, icon.radius].every(
      Number.isFinite,
    ) || icon.step <= 0 || icon.radius <= 0 || icon.origin - icon.radius < 0 ||
    icon.origin + 8 * icon.step + icon.radius > icon.canvas
  ) throw new Error(`Invalid geometry: ${icon.name}`);
}

/** Uses the exact geometry of each original consumer, with a transparent canvas. */
export function renderIconSvg(icon: IconDefinition): string {
  validateIcon(icon);
  const arcRadius = String(icon.radius).replace(/^0\./, ".");
  const arcRadii = arcRadius.startsWith(".")
    ? `${arcRadius}${arcRadius}`
    : `${arcRadius} ${arcRadius}`;
  const body = icon.canvas === 22
    ? `<path d="${
      icon.rows.flatMap((row, y) =>
        [...row].flatMap((cell, x) =>
          cell === "1"
            ? [
              `M${icon.origin + x * icon.step - icon.radius} ${
                icon.origin + y * icon.step
              }a${arcRadii} 0 1 0 ${icon.radius * 2} 0a${arcRadii} 0 1 0-${
                icon.radius * 2
              } 0`,
            ]
            : []
        )
      ).join("")
    }"/>`
    : icon.rows.flatMap((row, y) =>
      [...row].flatMap((cell, x) =>
        cell === "1"
          ? [
            `<circle cx="${icon.origin + x * icon.step}" cy="${
              icon.origin + y * icon.step
            }" r="${icon.radius}"/>`,
          ]
          : []
      )
    ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${icon.canvas}" height="${icon.canvas}" viewBox="0 0 ${icon.canvas} ${icon.canvas}" fill="currentColor" role="img"><title>${icon.name}</title>${body}</svg>\n`;
}
