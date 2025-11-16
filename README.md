# DJHS 上台順序抽籤系統

這是一個給學生查詢 / 抽籤「上台順序」的簡易網站。  
前端使用 GitHub Pages，後端使用 Google Apps Script + 試算表。

---

## 一、使用方式（給老師）

1. **複製此專案** 到自己的 GitHub（Fork 或 Download ZIP）。
2. 在 Google 試算表與 Apps Script 建好後端（管理人已設定好範本）。
3. 取得自己的 **Web App URL**（例如 `https://script.google.com/macros/s/XXXX/exec`）。
4. 編輯 `config.js`，將裡面的 `WEB_APP_URL` 改成你自己的網址：

```js
const WEB_APP_URL = "https://script.google.com/macros/s/XXXX/exec";
