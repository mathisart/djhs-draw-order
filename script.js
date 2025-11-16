/*************************************************
 * 1. 基本設定：讀取 config.js 的 Web App 網址
 *************************************************/
const WEB_APP_URL =
  (window.APP_CONFIG && window.APP_CONFIG.WEB_APP_URL) || "";

/*************************************************
 * 2. DOM 元素
 *************************************************/
const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");

const selGrade = document.getElementById("gradeSelect");
const selClass = document.getElementById("classSelect");
const selSeat = document.getElementById("seatSelect");
const inputName = document.getElementById("studentName");

const btnDraw = document.getElementById("btnDraw");
const btnClear = document.getElementById("btnClear");

const resultSection = document.getElementById("resultSection");
const drawNumber = document.getElementById("drawNumber");
const resultGrade = document.getElementById("resultGrade");
const resultClass = document.getElementById("resultClass");
const resultSeat = document.getElementById("resultSeat");
const resultName = document.getElementById("resultName");

// 暫存年級／班級資訊
let gradeMeta = [];

// 用來判斷「程式在重設表單，不要隱藏結果」
let suppressHideResult = false;

/*************************************************
 * 3. 初始化：抓 config（標題 + 年級 / 班級）
 *************************************************/
async function initPage() {
  // 先把表單鎖住
  selGrade.disabled = true;
  selClass.disabled = true;
  selSeat.disabled = true;
  btnDraw.disabled = true;

  if (!WEB_APP_URL || !WEB_APP_URL.startsWith("https://script.google.com")) {
    resultSection.classList.add("show");
    drawNumber.textContent = "-";
    resultGrade.textContent = "";
    resultClass.textContent = "";
    resultSeat.textContent = "";
    resultName.textContent = "";
    resultSection.innerHTML =
      "<p style='color:#b91c1c; text-align:center;'>後端網址未設定，請先在 config.js 設定 WEB_APP_URL。</p>";
    return;
  }

  try {
    const res = await fetch(`${WEB_APP_URL}?mode=config`);
    const data = await res.json();

    if (data.title) pageTitle.textContent = data.title;
    if (data.subtitle) pageSubtitle.textContent = data.subtitle;

    gradeMeta = data.grades || [];
    renderGradeOptions();

    selGrade.disabled = false;
  } catch (err) {
    resultSection.classList.add("show");
    drawNumber.textContent = "-";
    resultGrade.textContent = "";
    resultClass.textContent = "";
    resultSeat.textContent = "";
    resultName.textContent = "";
    resultSection.innerHTML =
      "<p style='color:#b91c1c; text-align:center;'>初始化失敗，請稍後再試或洽承辦老師。<br>錯誤訊息：" +
      err.message +
      "</p>";
  }
}

function renderGradeOptions() {
  selGrade.innerHTML = '<option value="">請選擇年級</option>';

  gradeMeta.forEach((g) => {
    const opt = document.createElement("option");
    opt.value = g.id; // 例如 "7"
    opt.textContent = `${g.label} 年級`;
    selGrade.appendChild(opt);
  });

  resetClassAndSeat("請先選擇年級");
}

function resetClassAndSeat(classPlaceholderText) {
  selClass.innerHTML = `<option value="">${classPlaceholderText}</option>`;
  selSeat.innerHTML = '<option value="">請先選擇班級</option>';
  selClass.disabled = true;
  selSeat.disabled = true;
  inputName.value = "";
  btnDraw.disabled = true;
}

/*************************************************
 * 4. 連動：年級 → 班級 → 座號 → 自動帶出姓名
 *************************************************/

// 年級改變
selGrade.addEventListener("change", () => {
  const grade = selGrade.value;

  if (!grade) {
    resetClassAndSeat("請先選擇年級");
    if (!suppressHideResult) hideResult();
    return;
  }

  const gInfo = gradeMeta.find((g) => g.id.toString() === grade.toString());
  resetClassAndSeat("請選擇班級");

  if (!gInfo || !Array.isArray(gInfo.classes)) {
    if (!suppressHideResult) hideResult();
    return;
  }

  selClass.disabled = false;
  gInfo.classes.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = `${c} 班`;
    selClass.appendChild(opt);
  });

  if (!suppressHideResult) hideResult();
});

// 班級改變
selClass.addEventListener("change", async () => {
  const grade = selGrade.value;
  const cls = selClass.value;

  inputName.value = "";
  btnDraw.disabled = true;

  if (!grade || !cls) {
    selSeat.innerHTML = '<option value="">請先選擇班級</option>';
    selSeat.disabled = true;
    if (!suppressHideResult) hideResult();
    return;
  }

  try {
    const url = `${WEB_APP_URL}?mode=seats&grade=${encodeURIComponent(
      grade
    )}&className=${encodeURIComponent(cls)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.ok) {
      selSeat.innerHTML =
        '<option value="">座號載入失敗，請稍後再試</option>';
      selSeat.disabled = true;
      if (!suppressHideResult) hideResult();
      return;
    }

    const seats = data.seats || [];
    if (seats.length === 0) {
      selSeat.innerHTML =
        '<option value="">此班尚未設定座號名單</option>';
      selSeat.disabled = true;
      if (!suppressHideResult) hideResult();
      return;
    }

    selSeat.disabled = false;
    selSeat.innerHTML = '<option value="">請選擇座號</option>';
    seats.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = `${s} 號`;
      selSeat.appendChild(opt);
    });

    if (!suppressHideResult) hideResult();
  } catch (err) {
    selSeat.innerHTML =
      '<option value="">座號載入失敗，請稍後再試</option>';
    selSeat.disabled = true;
    if (!suppressHideResult) hideResult();
  }
});

// 座號改變 → 自動帶出姓名
selSeat.addEventListener("change", async () => {
  const grade = selGrade.value;
  const cls = selClass.value;
  const seat = selSeat.value;

  inputName.value = "";
  btnDraw.disabled = true;

  if (!grade || !cls || !seat) {
    if (!suppressHideResult) hideResult();
    return;
  }

  try {
    const url = `${WEB_APP_URL}?mode=info&grade=${encodeURIComponent(
      grade
    )}&className=${encodeURIComponent(cls)}&seatNo=${encodeURIComponent(
      seat
    )}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.ok && data.name) {
      inputName.value = data.name;
      btnDraw.disabled = false;
    } else {
      inputName.value = "";
      btnDraw.disabled = true;
    }
  } catch (err) {
    console.error(err);
  }

  if (!suppressHideResult) hideResult();
});

/*************************************************
 * 5. 抽籤 / 查看結果
 *************************************************/
btnDraw.addEventListener("click", async () => {
  const grade = selGrade.value;
  const cls = selClass.value;
  const seat = selSeat.value;

  if (!grade || !cls || !seat) {
    alert("請先完整選擇年級、班級與座號！");
    return;
  }

  btnDraw.disabled = true;
  const originalText = btnDraw.innerHTML;
  btnDraw.innerHTML = '<span class="loading"></span> 抽籤中…';

  try {
    const url = `${WEB_APP_URL}?grade=${encodeURIComponent(
      grade
    )}&className=${encodeURIComponent(cls)}&seatNo=${encodeURIComponent(
      seat
    )}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.found) {
      alert("找不到這位同學的報名資料，請確認年級 / 班級 / 座號。");
      hideResult();
      return;
    }

    // 後端一定會回傳 name 與 order
    inputName.value = data.name || "";
    showResult({
      grade,
      cls,
      seat,
      name: data.name || "",
      order: data.order,
    });
  } catch (err) {
    alert("查詢時發生錯誤，請稍後再試或洽承辦老師。\n\n" + err.message);
  } finally {
    btnDraw.disabled = false;
    btnDraw.innerHTML = originalText;
  }
});

function showResult({ grade, cls, seat, name, order }) {
  drawNumber.textContent = order;
  resultGrade.textContent = `${grade} 年級`;
  resultClass.textContent = `${cls} 班`;
  resultSeat.textContent = `${seat} 號`;
  resultName.textContent = name || "-";
  resultSection.classList.add("show");
}

function hideResult() {
  resultSection.classList.remove("show");
}

/*************************************************
 * 6. 🔄 清空欄位（保留上一位結果）
 *************************************************/
btnClear.addEventListener("click", () => {
  suppressHideResult = true; // 暫時關閉「自動隱藏結果」

  selGrade.value = "";
  resetClassAndSeat("請先選擇年級");
  selGrade.disabled = false;

  suppressHideResult = false;
  // 不呼叫 hideResult() → 保留 resultSection，老師可以看到上一位結果
});

/*************************************************
 * 7. 啟動
 *************************************************/
document.addEventListener("DOMContentLoaded", initPage);
