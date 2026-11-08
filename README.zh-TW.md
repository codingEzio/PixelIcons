# X-PixelIcons 素材

![X-PixelIcons documentation mark](docs/icon.svg)

[English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md)
· [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

98 件入選 SVG 素材。catalog.json 提供穩定語意 ID 與來源／輸出雜湊。可直接使用
icons/<id>.svg；grids.json 保留可編輯點陣。

## 使用

直接使用 `icons/<id>.svg`，另附 `editable grids.json`。catalog.json 提供穩定 ID
與來源／輸出雜湊；檔名保持穩定。使用素材不需要伺服器、帳號或建置工具。 SVG 使用
currentColor；內嵌才能繼承 CSS 顏色，img
不繼承周圍文字顏色。保留可編輯點陣與原畫布尺寸。

![入選素材](previews/overview.png)

## 授權與署名

請標示 X-PixelIcons 與所附來源／出處、連結
https://creativecommons.org/licenses/by/4.0/ 並註明修改。CC BY 4.0
僅涵蓋可授權的自有權利，不授予商標或第三方權利。素材為專案自繪點陣；學習參考未供應匯入圖稿。

文件標誌：codingEzio，[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
([ARTWORK-LICENSE.md](ARTWORK-LICENSE.md))；請註明修改。此獨立授權僅涵蓋
`docs/icon.svg`，不變更已選定的收藏作品範圍。

## 來源範圍

本機原始碼候選包含 98 件入選圖示的可重建原始碼。其 Git 歷史獨立於原私人倉庫；
不含私人原稿和兩件未選的品牌相關圖示。來源、中繼資料及可見內容審查範圍
有限，不構成全面權利保證。詳見 LICENSE-SCOPE.json 與 public-files.json。

## 選用的私人本機組合

將私人 `IconDefinition` 點陣的 JSON 陣列放在 Git 忽略的
`Local/private-icons.json`，執行 `deno task private:build`。工具先驗證公開素材，
再於 `Local/` 的獨立私人目錄產生 SVG、目錄、總覽及獨立圖庫。私人項目不適用公開
圖稿授權。私人原稿與來源紀錄須另行保留；此操作不遷移或公開它們。勿提交或上傳
`Local/`。
