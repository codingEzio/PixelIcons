type GalleryIcon = Readonly<{
  name: string;
  svg: string;
  category: string;
}>;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character]!);
}

// The SVG definitions are trusted local sources. Escape JSON for its HTML script
// context so SVG markup, names, and Unicode separators cannot end the script.
function scriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(
    /\u2028/g,
    "\\u2028",
  ).replace(/\u2029/g, "\\u2029");
}

const categoryLabels: Record<string, string> = {
  navigation: "導覽",
  actions: "操作",
  categories: "分類",
  status: "狀態",
  typography: "字體",
  brands: "品牌",
};

/** Render a self-contained gallery that also works directly from file://. */
export function renderGallery(
  icons: readonly GalleryIcon[],
): string {
  const categories = [...new Set(icons.map((icon) => icon.category))];
  const categoryOptions = categories.map((category) =>
    `<option value="${escapeHtml(category)}">${
      escapeHtml(categoryLabels[category] ?? category)
    }</option>`
  ).join("");
  const example = icons.find((icon) => icon.name === "home") ?? icons[0];
  const cards = icons.map((icon, index) => {
    const name = escapeHtml(icon.name);
    const category = escapeHtml(icon.category);
    return `<article class="icon-card" data-name="${name}" data-category="${category}" data-index="${index}">
      <div class="preview">${icon.svg}</div>
      <div class="icon-info"><h2>${name}</h2><p class="icon-category">${
      escapeHtml(categoryLabels[icon.category] ?? icon.category)
    }</p></div>
      <div class="card-actions">
        <button class="copy" type="button" data-action="copy" aria-label="複製 ${name} 的 SVG">複製 SVG</button>
        <button class="download" type="button" data-action="download" aria-label="下載 ${name} 的 SVG">下載 SVG</button>
      </div>
    </article>`;
  }).join("\n");

  return `<!doctype html>
<html lang="zh-TW" data-theme="system">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
  <title>X-PixelIcons · 離線圖庫</title>
  <link rel="icon" href="data:,">
  <style>
    :root {
      color-scheme: light;
      --page: #f6f6f3; --surface: #fff; --ink: #20211f; --muted: #6b6e68;
      --border: #dedfd8; --soft: #eeefe9; --accent: #365f45; --focus: #477657;
      --icon-size: 44px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-synthesis: none;
    }
    :root[data-theme="dark"] {
      color-scheme: dark;
      --page: #141614; --surface: #1c1f1c; --ink: #eceee8; --muted: #a4aba1;
      --border: #383e36; --soft: #272c26; --accent: #b7d8b5; --focus: #aacfa5;
    }
    @media (prefers-color-scheme: dark) {
      :root[data-theme="system"] {
        color-scheme: dark;
        --page: #141614; --surface: #1c1f1c; --ink: #eceee8; --muted: #a4aba1;
        --border: #383e36; --soft: #272c26; --accent: #b7d8b5; --focus: #aacfa5;
      }
    }
    .capability { margin: 0 0 16px; color: var(--muted); font-size: 13px; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--page); color: var(--ink); line-height: 1.5; }
    button, input, select, textarea { font: inherit; color: inherit; }
    button, input, select { border: 1px solid var(--border); border-radius: 7px; background: var(--surface); }
    button { cursor: pointer; }
    button:hover { border-color: var(--muted); background: var(--soft); }
    :focus-visible { outline: 2px solid var(--focus); outline-offset: 3px; }
    a { color: var(--accent); text-underline-offset: 3px; }
    .shell { max-width: 1220px; margin: 0 auto; padding: 32px 24px 24px; }
    header { display: flex; align-items: start; justify-content: space-between; gap: 24px; margin-bottom: 27px; }
    .identity { min-width: 0; }
    .wordmark { display: flex; align-items: center; gap: 12px; }
    .dot-mark { width: 24px; height: 24px; flex: none; background-image: radial-gradient(circle, currentColor 1.6px, transparent 1.8px); background-size: 8px 8px; }
    h1 { margin: 0; font: 600 25px/1.2 ui-monospace, "SFMono-Regular", Consolas, monospace; letter-spacing: -1px; }
    .subtitle { margin: 9px 0 0 36px; font-size: 13px; color: var(--muted); }
    .license { display: inline-block; border: 1px solid var(--border); border-radius: 99px; padding: 4px 9px; font-size: 11px; color: var(--muted); white-space: nowrap; }
    .header-status { padding-top: 3px; }
    .toolbar { display: grid; grid-template-columns: minmax(220px, 1fr) 160px auto; gap: 12px; align-items: end; }
    .control { display: flex; min-width: 0; flex-direction: column; gap: 5px; }
    .control label { font-size: 11px; font-weight: 600; color: var(--muted); }
    input, select { min-width: 0; width: 100%; min-height: 39px; padding: 8px 10px; font-size: 13px; }
    input::placeholder { color: var(--muted); opacity: 1; }
    .settings { display: grid; grid-template-columns: 94px 108px 118px; gap: 8px; }
    .usage { margin-top: 16px; font-size: 13px; }
    .usage summary { cursor: pointer; color: var(--accent); padding: 7px 0; }
    .usage p { color: var(--muted); margin: 8px 0; }
    .usage pre { white-space: pre-wrap; overflow-wrap: anywhere; padding: 10px; background: var(--soft); border-radius: 7px; font: 12px/1.5 ui-monospace, monospace; }
    .usage-example { display: flex; align-items: center; gap: 10px; color: var(--accent); }
    .usage-example svg { width: 44px; height: 44px; flex: none; }
    .results { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 18px 0 12px; min-height: 21px; font-size: 12px; color: var(--muted); }
    #notice { margin: 0; text-align: right; color: var(--accent); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(172px, 1fr)); gap: 12px; }
    .icon-card { min-width: 0; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); overflow: hidden; }
    .icon-card[hidden] { display: none; }
    .preview { height: 124px; display: grid; place-items: center; color: var(--ink); background-image: radial-gradient(circle, var(--border) .65px, transparent .85px); background-size: 12px 12px; }
    .preview svg { display: block; width: var(--icon-size); height: var(--icon-size); max-width: 100%; }
    .icon-info { padding: 11px 12px 9px; }
    h2 { margin: 0; font: 500 12px/1.5 ui-monospace, "SFMono-Regular", Consolas, monospace; overflow-wrap: anywhere; }
    .icon-category { margin: 2px 0 0; font-size: 11px; color: var(--muted); }
    .card-actions { display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid var(--border); }
    .card-actions button { min-height: 37px; padding: 7px 4px; font-size: 11px; border: 0; border-radius: 0; background: transparent; }
    .card-actions button + button { border-left: 1px solid var(--border); }
    .card-actions button:hover { background: var(--soft); }
    #empty { padding: 48px 12px; text-align: center; color: var(--muted); font-size: 14px; }
    footer { margin-top: 28px; border-top: 1px solid var(--border); padding-top: 16px; color: var(--muted); font-size: 11px; }
    footer p { margin: 0 0 7px; }
    .reference-links { display: flex; flex-wrap: wrap; gap: 8px 18px; margin-top: 7px; }
    dialog { width: min(640px, calc(100% - 32px)); padding: 20px; border: 1px solid var(--border); border-radius: 12px; color: var(--ink); background: var(--surface); }
    dialog::backdrop { background: rgb(0 0 0 / .45); }
    dialog h2 { font: 600 17px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    dialog p { margin: 8px 0 14px; font-size: 13px; color: var(--muted); }
    textarea { width: 100%; height: 180px; display: block; resize: vertical; padding: 10px; border: 1px solid var(--border); border-radius: 7px; background: var(--page); font: 11px/1.6 ui-monospace, "SFMono-Regular", Consolas, monospace; }
    .dialog-actions { display: flex; justify-content: end; margin-top: 13px; }
    .dialog-actions button { min-height: 38px; padding: 7px 17px; font-size: 13px; }
    @media (max-width: 920px) {
      .toolbar { grid-template-columns: minmax(0, 1fr) 160px; }
      .settings { grid-column: 1 / -1; grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }
    @media (max-width: 480px) {
      .shell { padding: 22px 16px; }
      header { gap: 10px; margin-bottom: 22px; }
      h1 { font-size: 21px; }
      .wordmark { gap: 8px; }
      .subtitle { margin-left: 0; font-size: 11px; }
      .license { padding: 3px 7px; font-size: 10px; }
      .toolbar { grid-template-columns: minmax(0, 1fr) 108px; gap: 10px; }
      .settings { gap: 8px; }
      .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
      .preview { height: 114px; }
      .icon-info { padding: 10px 10px 8px; }
      .results { align-items: start; }
      #notice { max-width: 54%; }
    }
    @media print {
      .toolbar, .card-actions, #notice { display: none; }
      .shell { padding: 0; }
      .grid { grid-template-columns: repeat(5, minmax(0, 1fr)); }
      .icon-card { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <header>
      <div class="identity">
        <div class="wordmark"><span class="dot-mark" aria-hidden="true"></span><h1>X-PixelIcons</h1></div>
        <p class="subtitle" data-text="subtitle">自用圓點圖示 · 可離線瀏覽</p>
      </div>
      <div class="header-status"><span class="license" data-text="license">權利待審查</span></div>
    </header>
    <p id="external-ai-capability" class="capability" data-text="externalAiLimited" hidden></p>
    <section class="toolbar" aria-label="圖庫設定" data-label="controls">
      <div class="control"><label for="search" data-text="search">搜尋</label><input id="search" type="search" placeholder="搜尋圖示名稱…" autocomplete="off" spellcheck="false"></div>
      <div class="control"><label for="category" data-text="category">分類</label><select id="category"><option value="all">全部分類</option>${categoryOptions}</select></div>
      <div class="settings">
        <div class="control"><label for="size" data-text="size">圖示尺寸</label><select id="size"><option value="22">22 px</option><option value="44" selected>44 px</option><option value="66">66 px</option></select></div>
        <div class="control"><label for="theme" data-text="theme">外觀</label><select id="theme"><option value="system">系統</option><option value="light">淺色</option><option value="dark">深色</option></select></div>
        <div class="control"><label for="language" data-text="language">語言</label><select id="language"><option value="zh-TW">繁體中文</option><option value="zh-CN">简体中文</option><option value="en">English</option></select></div>
      </div>
    </section>
    <details class="usage" id="usage">
      <summary data-text="usageTitle">使用範例</summary>
      <div class="usage-example">${
    example?.svg ?? ""
  }<span data-text="inlinePreview">行內 SVG · 繼承文字顏色</span></div>
      <p data-text="imageHelp">下載 SVG 放入 icons 資料夾，再以圖片使用；圖片不繼承文字顏色。</p>
      <pre><code>${
    escapeHtml(
      `<img src="icons/${
        example?.name ?? "home"
      }.svg" width="44" height="44" alt="${example?.name ?? "home"}">`,
    )
  }</code></pre>
      <p data-text="inlineHelp">複製 SVG 原始碼並直接貼入 HTML，以 CSS 設定顏色與尺寸。</p>
      <pre><code>.icon { color: #365f45; }
.icon svg { width: 44px; height: 44px; }</code></pre>
    </details>
    <div class="results"><span id="result-count" role="status" aria-live="polite">顯示 ${icons.length} / ${icons.length} 個圖示</span><p id="notice" role="status" aria-live="polite"></p></div>
    <section class="grid" id="icon-grid" aria-label="圖示" data-label="icons">${cards}</section>
    <p id="empty" data-text="empty" hidden>沒有符合的圖示。請換個名稱或分類。</p>
    <footer>
      <p data-text="offline">此檔案包含全部圖示，無須連線或啟動伺服器。</p>
      <p data-text="licenseNote">程式碼採 MIT；可授權素材採 CC BY 4.0，範圍見 LICENSE-SCOPE.json。逐圖審查未完成；品牌標記不含在內。</p>
      <p data-text="references">欣賞與學習的圖庫；未使用其圖形或程式碼：</p>
      <div class="reference-links"><a href="https://pixeliconlibrary.com/" target="_blank" rel="noopener noreferrer">Pixel Icon Library</a><a href="https://github.com/halfmage/pixelarticons" target="_blank" rel="noopener noreferrer">Pixelarticons · halfmage</a></div>
    </footer>
  </main>
  <dialog id="copy-dialog" aria-labelledby="copy-title" aria-describedby="copy-help">
    <h2 id="copy-title" data-text="manualTitle">手動複製 SVG</h2>
    <p id="copy-help" data-text="manualHelp">瀏覽器無法存取剪貼簿。請選取下方內容，再使用複製快捷鍵或右鍵選單。</p>
    <textarea id="svg-source" readonly aria-label="SVG 原始碼" data-label="source" spellcheck="false"></textarea>
    <div class="dialog-actions"><button id="close-dialog" type="button" data-text="close">關閉</button></div>
  </dialog>
  <script>
    "use strict";
    const icons = ${scriptJson(icons)};
    const translations = {
      "zh-TW": {
        externalAiLimited: "外部 AI 圖片生成：功能受限。未設定生成服務或工具。本機 SVG 生成與 PNG 匯出仍可用。",
        title: "X-PixelIcons · 離線圖庫", subtitle: "自用圓點圖示 · 可離線瀏覽", license: "權利待審查",
        controls: "圖庫設定", icons: "圖示", search: "搜尋", placeholder: "搜尋圖示名稱…", category: "分類", all: "全部分類",
        size: "圖示尺寸", theme: "外觀", language: "語言", system: "系統", light: "淺色", dark: "深色",
        copy: "複製 SVG", download: "下載 SVG", copyLabel: "複製 {name} 的 SVG", downloadLabel: "下載 {name} 的 SVG",
        copied: "已複製 {name} 的 SVG", downloaded: "已開始下載 {name}.svg", manualNotice: "請手動複製 {name} 的 SVG",
        count: "顯示 {count} / {total} 個圖示", empty: "沒有符合的圖示。請換個名稱或分類。",
        offline: "此檔案包含全部圖示，無須連線或啟動伺服器。",
        licenseNote: "程式碼採 MIT；可授權素材採 CC BY 4.0，範圍見 LICENSE-SCOPE.json。逐圖審查未完成；品牌標記不含在內。",
        references: "欣賞與學習的圖庫；未使用其圖形或程式碼：",
        manualTitle: "手動複製 SVG", manualHelp: "瀏覽器無法存取剪貼簿。請選取下方內容，再使用複製快捷鍵或右鍵選單。",
        source: "SVG 原始碼", close: "關閉",
        usageTitle: "使用範例", inlinePreview: "行內 SVG · 繼承文字顏色", imageHelp: "下載 SVG 放入 icons 資料夾，再以圖片使用；圖片不繼承文字顏色。", inlineHelp: "複製 SVG 原始碼並直接貼入 HTML，以 CSS 設定顏色與尺寸。",
        categories: { navigation: "導覽", actions: "操作", categories: "分類", status: "狀態", typography: "字體", brands: "品牌" }
      },
      "zh-CN": {
        externalAiLimited: "外部 AI 图片生成：功能受限。未配置生成服务或工具。本地 SVG 生成与 PNG 导出仍可用。",
        title: "X-PixelIcons · 离线图库", subtitle: "自用圆点图标 · 可离线浏览", license: "权利待审查",
        controls: "图库设置", icons: "图标", search: "搜索", placeholder: "搜索图标名称…", category: "分类", all: "全部分类",
        size: "图标尺寸", theme: "外观", language: "语言", system: "系统", light: "浅色", dark: "深色",
        copy: "复制 SVG", download: "下载 SVG", copyLabel: "复制 {name} 的 SVG", downloadLabel: "下载 {name} 的 SVG",
        copied: "已复制 {name} 的 SVG", downloaded: "已开始下载 {name}.svg", manualNotice: "请手动复制 {name} 的 SVG",
        count: "显示 {count} / {total} 个图标", empty: "没有匹配的图标。请换个名称或分类。",
        offline: "此文件包含全部图标，无须联网或启动服务器。",
        licenseNote: "代码采用 MIT；可授权素材采用 CC BY 4.0，范围见 LICENSE-SCOPE.json。逐图审查未完成；品牌标记不含在内。",
        references: "欣赏与学习的图库；未使用其图形或代码：",
        manualTitle: "手动复制 SVG", manualHelp: "浏览器无法访问剪贴板。请选中下方内容，再使用复制快捷键或右键菜单。",
        source: "SVG 源代码", close: "关闭",
        usageTitle: "使用示例", inlinePreview: "内联 SVG · 继承文字颜色", imageHelp: "下载 SVG 放入 icons 文件夹，再作为图片使用；图片不继承文字颜色。", inlineHelp: "复制 SVG 源代码并直接粘贴到 HTML，用 CSS 设置颜色与尺寸。",
        categories: { navigation: "导航", actions: "操作", categories: "分类", status: "状态", typography: "字体", brands: "品牌" }
      },
      en: {
        externalAiLimited: "External AI image generation: Limited capability. No provider or tool is configured. Local SVG generation and PNG export remain available.",
        title: "X-PixelIcons · Offline gallery", subtitle: "Our round-dot icons · Available offline", license: "Rights review pending",
        controls: "Gallery controls", icons: "Icons", search: "Search", placeholder: "Search icon names…", category: "Category", all: "All categories",
        size: "Icon size", theme: "Theme", language: "Language", system: "System", light: "Light", dark: "Dark",
        copy: "Copy SVG", download: "Download SVG", copyLabel: "Copy SVG for {name}", downloadLabel: "Download SVG for {name}",
        copied: "Copied SVG for {name}", downloaded: "Download started: {name}.svg", manualNotice: "Copy SVG for {name} manually",
        count: "Showing {count} of {total} icons", empty: "No matching icons. Try another name or category.",
        offline: "This file includes all icons. No connection or server is needed.",
        licenseNote: "Code: MIT. Licensable art: CC BY 4.0 within LICENSE-SCOPE.json. Per-image review is pending; brand marks are excluded.",
        references: "Galleries we admire and learn from; their graphics and code are not used here:",
        manualTitle: "Copy SVG manually", manualHelp: "The browser cannot access the clipboard. Select the text below and use the copy shortcut or context menu.",
        source: "SVG source", close: "Close",
        usageTitle: "Usage examples", inlinePreview: "Inline SVG · Inherits text color", imageHelp: "Download an SVG into your icons folder, then use it as an image. Images do not inherit text color.", inlineHelp: "Copy the SVG source into your HTML. Set its color and size with CSS.",
        categories: { navigation: "Navigation", actions: "Actions", categories: "Categories", status: "Status", typography: "Typography", brands: "Brands" }
      }
    };
    const isAndroid = /Android/i.test(navigator.userAgent) || navigator.userAgentData?.platform === "Android";
    document.querySelector("#external-ai-capability").hidden = !isAndroid;
    const search = document.querySelector("#search");
    const category = document.querySelector("#category");
    const size = document.querySelector("#size");
    const theme = document.querySelector("#theme");
    const language = document.querySelector("#language");
    const cards = Array.from(document.querySelectorAll(".icon-card"));
    const notice = document.querySelector("#notice");
    const copyDialog = document.querySelector("#copy-dialog");
    const source = document.querySelector("#svg-source");
    let currentLanguage = "zh-TW";
    let lastNotice = null;

    function text(key, replacements = {}) {
      let value = translations[currentLanguage][key];
      Object.entries(replacements).forEach(([name, replacement]) => {
        value = value.replace("{" + name + "}", String(replacement));
      });
      return value;
    }

    function categoryText(key) {
      return translations[currentLanguage].categories[key] || key;
    }

    function showNotice(key, name) {
      lastNotice = { key, name };
      notice.textContent = text(key, { name });
    }

    function filterIcons() {
      const term = search.value.trim().toLocaleLowerCase(currentLanguage);
      let count = 0;
      cards.forEach((card) => {
        const icon = icons[Number(card.dataset.index)];
        const searchable = [icon.name, icon.category, categoryText(icon.category)].join(" ").toLocaleLowerCase(currentLanguage);
        const matches = (category.value === "all" || category.value === icon.category) && searchable.includes(term);
        card.hidden = !matches;
        if (matches) count++;
      });
      const formatter = new Intl.NumberFormat(currentLanguage);
      document.querySelector("#result-count").textContent = text("count", { count: formatter.format(count), total: formatter.format(icons.length) });
      document.querySelector("#empty").hidden = count !== 0;
    }

    function applyLanguage() {
      currentLanguage = language.value;
      document.documentElement.lang = currentLanguage;
      document.title = text("title");
      document.querySelectorAll("[data-text]").forEach((element) => {
        element.textContent = text(element.dataset.text);
      });
      document.querySelectorAll("[data-label]").forEach((element) => {
        element.setAttribute("aria-label", text(element.dataset.label));
      });
      search.placeholder = text("placeholder");
      Array.from(category.options).forEach((option) => {
        option.textContent = option.value === "all" ? text("all") : categoryText(option.value);
      });
      Array.from(theme.options).forEach((option) => { option.textContent = text(option.value); });
      cards.forEach((card) => {
        const icon = icons[Number(card.dataset.index)];
        card.querySelector(".icon-category").textContent = categoryText(icon.category);
        ["copy", "download"].forEach((action) => {
          const button = card.querySelector('[data-action="' + action + '"]');
          button.textContent = text(action);
          button.setAttribute("aria-label", text(action + "Label", { name: icon.name }));
        });
      });
      if (lastNotice) notice.textContent = text(lastNotice.key, { name: lastNotice.name });
      filterIcons();
    }

    function savePreferences() {
      try {
        localStorage.setItem("x-pixelicons-gallery", JSON.stringify({ language: language.value, theme: theme.value, size: size.value }));
      } catch { /* The gallery also works when file storage is unavailable. */ }
    }

    function applyThemeAndSize() {
      document.documentElement.dataset.theme = theme.value;
      document.documentElement.style.setProperty("--icon-size", size.value + "px");
    }

    async function copySvg(icon) {
      try {
        if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error("Clipboard unavailable");
        await navigator.clipboard.writeText(icon.svg);
        showNotice("copied", icon.name);
      } catch {
        source.value = icon.svg;
        copyDialog.showModal();
        source.focus();
        source.select();
        showNotice("manualNotice", icon.name);
      }
    }

    function downloadSvg(icon) {
      const url = URL.createObjectURL(new Blob([icon.svg], { type: "image/svg+xml;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = icon.name + ".svg";
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showNotice("downloaded", icon.name);
    }

    search.addEventListener("input", filterIcons);
    category.addEventListener("change", filterIcons);
    language.addEventListener("change", () => { applyLanguage(); savePreferences(); });
    [theme, size].forEach((control) => control.addEventListener("change", () => { applyThemeAndSize(); savePreferences(); }));
    document.querySelector("#icon-grid").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const card = button.closest(".icon-card");
      const icon = icons[Number(card.dataset.index)];
      if (button.dataset.action === "copy") copySvg(icon);
      if (button.dataset.action === "download") downloadSvg(icon);
    });
    document.querySelector("#close-dialog").addEventListener("click", () => copyDialog.close());

    try {
      const preferences = JSON.parse(localStorage.getItem("x-pixelicons-gallery") || "null");
      if (preferences) {
        if (Object.hasOwn(translations, preferences.language)) language.value = preferences.language;
        if (["system", "light", "dark"].includes(preferences.theme)) theme.value = preferences.theme;
        if (["22", "44", "66"].includes(preferences.size)) size.value = preferences.size;
      }
    } catch { /* Ignore absent, blocked, or invalid local preferences. */ }
    applyThemeAndSize();
    applyLanguage();
  </script>
</body>
</html>
`;
}
