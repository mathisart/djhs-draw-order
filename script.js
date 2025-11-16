/*************************************************
 * 1. 基本設定：請把 WEB_APP_URL 換成你自己的網址
 *************************************************/

// 例：const WEB_APP_URL = "https://script.google.com/macros/s/xxxxxxx/exec";
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbx_ls62nLUz9rP0wWpYetKBMerQnEuOid-uPqBycFayIi_Yp23EFnKnf_pI1h9yQM8/exec";

/*************************************************
 * 2. DOM 元素
 *************************************************/

const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");

const selGrade = document.getElementById("gradeSelect");
const selClass = document.getElementById("classSelect");
const selSeat = document.getElementById("seatSelect");
seatSelect.addEventListener("change", async () => {
  const grade = document.getElementById("gradeSelect").value;
  const className = document.getElementById("classSelect").value;
  const seatNo = seatSelect.value;

  if (!grade || !className || !seatNo) return;

  const url = `${WEB_APP_URL}?mode=info&grade=${grade}&className=${className}&seatNo=${seatNo}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.ok) {
      document.getElementById("studentName").value = data.name;
    } else {
      document.getElementById("studentName").value = "";
    }
  } catch (err) {
    console.error(err);
  }
});


const btnDraw = document.getElementById("btnDraw");
const btnClear = document.getElementById("btnClear");

const resultBox = document.getElementById("resultBox");

// 從後端拿到的年級資訊會暫存這裡
let gradeMeta = [];

/*************************************************
 * 3. 初始化：抓 config（標題 + 年級 / 班級）
 *************************************************/

async function initPage() {
  if (!WEB_APP_URL || WEB_APP_URL.indexOf("https://script.google.com") !== 0) {
    resultBox.classList.remove("empty");
    resultBox.innerHTML =
      "<p style='color:#b91c1c;'>後端網址未設定，請先在 script.js 設定 WEB_APP_URL。</p>";
    return;
  }

  try {
    const res = await fetch(`${WEB_APP_URL}?mode=config`);
    const data = await res.json();

    // 標題、副標題
    if (data.title) pageTitle.textContent = data.title;
    if (data.subtitle) pageSubtitle.textContent = data.subtitle;

    // 年級列表
    gradeMeta = data.grades || [];
    renderGradeOptions();
    resultBox.classList.add("empty");
    resultBox.innerHTML = "";
  } catch (err) {
    resultBox.classList.remove("empty");
    resultBox.innerHTML =
      "<p style='color:#b91c1c;'>初始化失敗，請稍後再試或洽承辦老師。<br>錯誤訊息：" +
      err.message +
      "</p>";
  }
}

function renderGradeOptions() {
  selGrade.innerHTML = '<option value="">請選擇年級</option>';

  gradeMeta.forEach((g) => {
    const opt = document.createElement("option");
    opt.value = g.id; // 例如 "7"
    opt.textContent = `${g.label} 年級`; // 顯示：7 年級
    selGrade.appendChild(opt);
  });

  // 班級、座號先重置
  resetClassAndSeat("請先選擇年級");
}

/*************************************************
 * 4. 連動：年級 → 班級 → 座號
 *************************************************/

function resetClassAndSeat(classPlaceholderText) {
  selClass.innerHTML = `<option value="">${classPlaceholderText}</option>`;
  selSeat.innerHTML = '<option value="">請先選擇班級</option>';
}

selGrade.addEventListener("change", () => {
  const grade = selGrade.value;

  if (!grade) {
    resetClassAndSeat("請先選擇年級");
    return;
  }

  const gInfo = gradeMeta.find((g) => g.id.toString() === grade.toString());
  resetClassAndSeat("請選擇班級");

  if (!gInfo || !Array.isArray(gInfo.classes)) return;

  // 填班級下拉（1 班、2 班…）
  gInfo.classes.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = `${c} 班`;
    selClass.appendChild(opt);
  });

  // 同時重置座號
  selSeat.innerHTML = '<option value="">請先選擇班級</option>';
});

selClass.addEventListener("change", async () => {
  const grade = selGrade.value;
  const cls = selClass.value;

  if (!grade || !cls) {
    selSeat.innerHTML = '<option value="">請先選擇班級</option>';
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
      return;
    }

    const seats = data.seats || [];
    if (seats.length === 0) {
      selSeat.innerHTML =
        '<option value="">此班尚未設定座號名單</option>';
      return;
    }

    selSeat.innerHTML = '<option value="">請選擇座號</option>';
    seats.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = `${s} 號`;
      selSeat.appendChild(opt);
    });
  } catch (err) {
    selSeat.innerHTML =
      '<option value="">座號載入失敗，請稍後再試</option>';
  }
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

  try {
    const url = `${WEB_APP_URL}?grade=${encodeURIComponent(
      grade
    )}&className=${encodeURIComponent(cls)}&seatNo=${encodeURIComponent(seat)}`;

    const res = await fetch(url);
    const data = await res.json();

    resultBox.classList.remove("empty");

    if (!data.found) {
      resultBox.innerHTML =
        "<p style='color:#b91c1c;'>找不到這位同學的資料，請確認是否輸入正確。</p>";
      return;
    }

    // 顯示抽籤結果
    resultBox.innerHTML = `
      <p>
        ${grade} 年 ${cls} 班 ${seat} 號 ${data.name} 同學：<br>
        你抽到的上台順序是：第 <strong>${data.order}</strong> 位。
      </p>
    `;
  } catch (err) {
    resultBox.classList.remove("empty");
    resultBox.innerHTML =
      "<p style='color:#b91c1c;'>查詢時發生錯誤，請稍後再試或洽承辦老師。<br>錯誤訊息：" +
      err.message +
      "</p>";
  }
});

/*************************************************
 * 6. 🔄 清空欄位（僅清空選單，不清除結果）
 *************************************************/

btnClear.addEventListener("click", () => {
  selGrade.value = "";
  resetClassAndSeat("請先選擇年級");
  // 結果區保留，老師可以回顧上一位同學的號碼
});

/*************************************************
 * 7. 啟動
 *************************************************/

document.addEventListener("DOMContentLoaded", initPage);
