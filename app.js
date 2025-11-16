// app.js
// 前端抽籤系統邏輯（需搭配 config.js 中的 WEB_APP_URL）

/* global WEB_APP_URL */

document.addEventListener("DOMContentLoaded", () => {
  // 取得 DOM 元素
  const gradeSelect  = document.getElementById("gradeSelect");
  const classSelect  = document.getElementById("classSelect");
  const seatSelect   = document.getElementById("seatSelect");
  const queryBtn     = document.getElementById("queryBtn");
  const resultBox    = document.getElementById("resultBox");
  const errorBox     = document.getElementById("errorBox");
  const titleEl      = document.getElementById("title");
  const subtitleEl   = document.getElementById("subtitle");

  let gradeMeta = []; // 從後端取得的年級 + 班級資訊

  // ——— 共用顯示函式 ———
  function showError(msg) {
    if (!errorBox || !resultBox) return;
    errorBox.textContent = msg;
    errorBox.classList.remove("hidden");
    resultBox.classList.add("hidden");
  }

  function showResult(text) {
    if (!errorBox || !resultBox) return;
    resultBox.textContent = text;
    resultBox.classList.remove("hidden");
    errorBox.classList.add("hidden");
  }

  // ——— 初始化：從後端取 config（標題 + 年級 / 班級）———
  async function loadConfig() {
    if (!WEB_APP_URL || !WEB_APP_URL.startsWith("https://script.google.com/macros/")) {
      showError("尚未設定 Web App URL，請通知老師檢查 config.js。");
      return;
    }

    try {
      const res = await fetch(WEB_APP_URL + "?mode=config");
      const data = await res.json();

      if (titleEl) {
        titleEl.textContent = data.title || "上台順序抽籤系統";
      }
      if (subtitleEl) {
        subtitleEl.textContent = data.subtitle || "請選擇年級、班級與座號進行抽籤";
      }

      gradeMeta = Array.isArray(data.grades) ? data.grades : [];

      if (gradeSelect) {
        gradeSelect.innerHTML = '<option value="">請選擇年級</option>';

        gradeMeta.forEach((g) => {
          const opt = document.createElement("option");
          opt.value = g.id; // 例如：7、8、9
          opt.textContent = g.id + " 年級";
          gradeSelect.appendChild(opt);
        });
      }
    } catch (err) {
      console.error(err);
      showError("無法載入設定，請稍後再試或通知承辦老師。");
    }
  }

  // ——— 年級改變 → 更新班級選單 ———
  if (gradeSelect && classSelect && seatSelect) {
    gradeSelect.addEventListener("change", () => {
      const gradeVal = gradeSelect.value;
      classSelect.innerHTML = "";
      seatSelect.innerHTML = '<option value="">請先選班級</option>';
      seatSelect.disabled = true;

      if (!gradeVal) {
        classSelect.disabled = true;
        classSelect.innerHTML = '<option value="">請先選年級</option>';
        return;
      }

      const g = gradeMeta.find((x) => String(x.id) === String(gradeVal));
      classSelect.disabled = false;
      classSelect.innerHTML = '<option value="">請選擇班級</option>';

      if (g && Array.isArray(g.classes)) {
        // 班級用數字：1,2,3…（依你試算表填寫為準）
        g.classes
          .slice()
          .sort((a, b) => Number(a) - Number(b))
          .forEach((c) => {
            const opt = document.createElement("option");
            opt.value = c;
            opt.textContent = c + " 班";
            classSelect.appendChild(opt);
          });
      }
    });

    // ——— 班級改變 → 向 GAS 要座號清單 ———
    classSelect.addEventListener("change", async () => {
      const gradeVal = gradeSelect.value;
      const classVal = classSelect.value;

      seatSelect.innerHTML = "";
      seatSelect.disabled = true;

      if (!gradeVal || !classVal) {
        seatSelect.innerHTML = '<option value="">請先選班級</option>';
        return;
      }

      try {
        const url =
          WEB_APP_URL +
          "?mode=seats" +
          "&grade=" +
          encodeURIComponent(gradeVal) +
          "&className=" +
          encodeURIComponent(classVal);

        const res = await fetch(url);
        const data = await res.json();

        if (!data.ok) {
          showError(data.message || "無法取得座號清單");
          return;
        }

        const seats = Array.isArray(data.seats) ? data.seats : [];
        if (!seats.length) {
          seatSelect.innerHTML =
            '<option value="">此班級目前沒有報名資料</option>';
          return;
        }

        seatSelect.disabled = false;
        seatSelect.innerHTML = '<option value="">請選擇座號</option>';
        seats.forEach((s) => {
          const opt = document.createElement("option");
          opt.value = s;
          opt.textContent = s + " 號";
          seatSelect.appendChild(opt);
        });
      } catch (err) {
        console.error(err);
        showError("載入座號時發生錯誤，請稍後再試。");
      }
    });
  }

  // ——— 按下「抽籤 / 查看結果」———
  if (queryBtn && gradeSelect && classSelect && seatSelect) {
    queryBtn.addEventListener("click", async () => {
      const gradeVal = gradeSelect.value;
      const classVal = classSelect.value;
      const seatVal = seatSelect.value;

      if (!gradeVal || !classVal || !seatVal) {
        showError("請先選擇完整的年級、班級與座號。");
        return;
      }

      queryBtn.disabled = true;

      try {
        const url =
          WEB_APP_URL +
          "?grade=" +
          encodeURIComponent(gradeVal) +
          "&className=" +
          encodeURIComponent(classVal) +
          "&seatNo=" +
          encodeURIComponent(seatVal);

        const res = await fetch(url);
        const data = await res.json();

        if (!data.found) {
          showError("查無此學生報名資料，請確認是否填錯或洽承辦老師。");
          return;
        }

        const text =
          gradeVal +
          " 年 " +
          classVal +
          " 班 " +
          seatVal +
          " 號 " +
          data.name +
          " 同學：\n你抽到的上台順序是：第 " +
          data.order +
          " 位。";

        showResult(text);
      } catch (err) {
        console.error(err);
        showError("抽籤時發生錯誤，請稍後再試或洽承辦老師。");
      } finally {
        queryBtn.disabled = false;
      }
    });
  }

  // ——— 初始化呼叫 ———
  loadConfig();
});
