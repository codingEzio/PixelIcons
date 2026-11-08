# X-PixelIcons 素材

![X-PixelIcons documentation mark](docs/icon.svg)

[English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md)
· [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

98 件入选 SVG 素材。catalog.json 提供稳定语义 ID 与来源／输出哈希。可直接使用
icons/<id>.svg；grids.json 保留可编辑点阵。

## 使用

直接使用 `icons/<id>.svg`，另附 `editable grids.json`。catalog.json 提供稳定 ID
与来源／输出哈希；文件名保持稳定。使用素材不需要服务器、账号或构建工具。 SVG
使用 currentColor；内嵌才能继承 CSS 颜色，img
不继承周围文字颜色。保留可编辑点阵和原画布尺寸。

![入选素材](previews/overview.png)

## 许可与署名

请标注 X-PixelIcons 与所附来源／出处、链接
https://creativecommons.org/licenses/by/4.0/ 并说明修改。CC BY 4.0
仅涵盖可授权的自有权利，不授予商标或第三方权利。素材为项目自绘点阵；学习参考未供应导入图稿。

文档标志：codingEzio，[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
([ARTWORK-LICENSE.md](ARTWORK-LICENSE.md))；请注明修改。此独立授权仅涵盖
`docs/icon.svg`，不改变已选定的收藏作品范围。

## 来源范围

本地源码候选包含 98 件入选图标的可重建源码。其 Git 历史独立于原私人仓库；
不含私人原稿和两件未选的品牌相关图标。来源、元数据及可见内容审查范围
有限，不构成全面权利保证。详见 LICENSE-SCOPE.json 与 public-files.json。

## 可选的私人本地组合

将私人 `IconDefinition` 点阵的 JSON 数组放在 Git 忽略的
`Local/private-icons.json`，执行 `deno task private:build`。工具先验证公开素材，
再于 `Local/` 的独立私人目录生成 SVG、目录、总览及独立图库。私人项目不适用公开
图稿授权。私人原稿与来源记录须另行保留；此操作不迁移或公开它们。勿提交或上传
`Local/`。
