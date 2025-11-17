/*************************************************
 * 1. 基本設定：讀取 config.js 中的 WEB_APP_URL
 *************************************************/
// WEB_APP_URL 在 config.js 中定義，這裡不需要重複宣告

/*************************************************
 * 2. DOM 元素 (注意新的 ID 和結構)
 *************************************************/
const pageTitle = document.getElementById('pageTitle');
const pageSubtitle = document.getElementById('pageSubtitle');

const gradeSelect = document.getElementById('gradeSelect');
const classSelect = document.getElementById('classSelect');
const seatSelect = document.getElementById('seatSelect');
const studentNameInput = document.getElementById('studentName'); // 新 ID

const btnDraw = document.getElementById('btnDraw');
const btnClear = document.getElementById('btnClear');

const resultSection = document.getElementById('resultSection');
const drawNumberDisplay = document.getElementById('drawNumber');
const resultGradeDisplay = document.getElementById('resultGrade');
const resultClassDisplay = document.getElementById('resultClass');
const resultSeatDisplay = document.getElementById('resultSeat');
const resultNameDisplay = document.getElementById('resultName');
const footerText = document.getElementById('footerText');

// --- 輔助函式 ---

// 顯示結果區塊
function showResult(number, grade, classNum, seatNum, name) {
    drawNumberDisplay.textContent = number;
    resultGradeDisplay.textContent = `${grade}年級`;
    resultClassDisplay.textContent = `${classNum}班`;
    resultSeatDisplay.textContent = `${seatNum}號`;
    resultNameDisplay.textContent = name;
    
    // 使用新的 show class 顯示結果區塊
    resultSection.classList.add('show');
}

// 隱藏結果區塊
function hideResult() {
    resultSection.classList.remove('show');
}

// 渲染選單選項 (通用函式)
function renderOptions(selectElement, options, placeholderText) {
    selectElement.innerHTML = `<option value="">${placeholderText}</option>`;
    options.forEach(opt => {
        const option = document.createElement('option');
        if (typeof opt === 'string') {
            option.value = opt;
            option.textContent = `${opt} ${placeholderText.includes('年級') ? '年級' : '班'}`;
        } else {
            // 處理座號/姓名的物件選項 { seat: number, name: string }
            option.value = opt.seat;
            option.textContent = `${opt.seat}號`;
            option.dataset.name = opt.name;
        }
        selectElement.appendChild(option);
    });
    selectElement.disabled = false;
}

// 鎖定所有控制項並重置
function disableControls() {
    classSelect.innerHTML = '<option value="">請先選擇年級</option>';
    seatSelect.innerHTML = '<option value="">請先選擇班級</option>';
    studentNameInput.value = '選擇座號後自動帶出';
    classSelect.disabled = true;
    seatSelect.disabled = true;
    btnDraw.disabled = true;
}

// --- 3. 初始化：抓 config (標題 + 年級 / 班級) ---
async function initPage() {
    // 檢查 WEB_APP_URL 是否存在 (從 config.js 載入)
    if (typeof WEB_APP_URL === 'undefined' || WEB_APP_URL.indexOf("https://script.google.com") !== 0) {
        console.error("WEB_APP_URL 未設定或格式錯誤，請檢查 config.js。");
        return;
    }

    try {
        const res = await fetch(`${WEB_APP_URL}?mode=config`);
        const data = await res.json();
        
        // 更新標題/註腳
        if (data.title) pageTitle.textContent = data.title;
        if (data.subtitle) pageSubtitle.textContent = data.subtitle;
        if (data.footer_text) footerText.textContent = data.footer_text;

        // 渲染年級選項
        const grades = data.grades.map(g => g.id);
        renderOptions(gradeSelect, grades, '請選擇年級');
        
        disableControls();
    } catch (err) {
        alert("初始化失敗，無法連接到 Google 試算表後端。\n錯誤: " + err.message);
        disableControls();
    }
}

// --- 4. 連動：年級 → 班級 → 座號 (GAS 呼叫) ---

// 年級選擇事件
gradeSelect.addEventListener('change', function() {
    const grade = this.value;
    hideResult();
    
    if (!grade) {
        disableControls();
        return;
    }
    
    // 從 GAS 獲取該年級的所有班級
    fetch(`${WEB_APP_URL}?mode=config`)
        .then(res => res.json())
        .then(data => {
            const gradeInfo = data.grades.find(g => g.id.toString() === grade.toString());
            if (gradeInfo && gradeInfo.classes) {
                renderOptions(classSelect, gradeInfo.classes, '請選擇班級');
                seatSelect.disabled = true;
                btnDraw.disabled = true;
            } else {
                alert("找不到該年級的班級資料。");
                disableControls();
            }
        })
        .catch(err => {
            alert("載入班級資訊時發生錯誤。");
            disableControls();
        });
});

// 班級選擇事件：載入座號和姓名
classSelect.addEventListener('change', async function() {
    const grade = gradeSelect.value;
    const cls = this.value;
    hideResult();
    studentNameInput.value = '選擇座號後自動帶出';
    
    if (!grade || !cls) {
        seatSelect.innerHTML = '<option value="">請先選擇班級</option>';
        seatSelect.disabled = true;
        btnDraw.disabled = true;
        return;
    }
    
    // 呼叫 GAS 獲取座號/姓名數據
    try {
        const url = `${WEB_APP_URL}?mode=seats&grade=${encodeURIComponent(grade)}&className=${encodeURIComponent(cls)}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.ok && data.students && data.students.length > 0) {
            renderOptions(seatSelect, data.students, '請選擇座號');
            btnDraw.disabled = true;
        } else {
            seatSelect.innerHTML = '<option value="">此班無座號名單</option>';
            seatSelect.disabled = true;
            btnDraw.disabled = true;
        }
    } catch (err) {
        alert("載入座號資料時發生錯誤。");
        seatSelect.disabled = true;
        btnDraw.disabled = true;
    }
});

// 座號選擇事件：自動填入姓名
seatSelect.addEventListener('change', function() {
    const selectedOption = this.options[this.selectedIndex];
    hideResult();
    
    if (selectedOption && selectedOption.value) {
        const name = selectedOption.dataset.name || "";
        studentNameInput.value = name;
        btnDraw.disabled = false;
    } else {
        studentNameInput.value = '選擇座號後自動帶出';
        btnDraw.disabled = true;
    }
});

// --- 5. 抽籤 / 清空 ---

// 抽籤按鈕事件
btnDraw.addEventListener('click', async function() {
    const grade = gradeSelect.value;
    const classNum = classSelect.value;
    const seatNum = seatSelect.value;
    const name = studentNameInput.value;
    
    if (!grade || !classNum || !seatNum || !name) return;

    // 顯示載入狀態
    const originalText = this.innerHTML;
    // 使用新的 loading spinner
    this.innerHTML = '<span class="loading"></span> 抽籤中...'; 
    this.disabled = true;
    
    // 呼叫 GAS 進行抽籤
    try {
        const url = `${WEB_APP_URL}?grade=${encodeURIComponent(grade)}&className=${encodeURIComponent(classNum)}&seatNo=${encodeURIComponent(seatNum)}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.found) {
            showResult(data.order, grade, classNum, seatNum, name);
        } else {
            alert("找不到這位同學的資料，請確認是否輸入正確。");
            hideResult();
        }
    } catch (err) {
        alert("抽籤時發生錯誤，請稍後再試。\n錯誤: " + err.message);
        hideResult();
    } finally {
        this.innerHTML = originalText;
        this.disabled = false;
    }
});

// 清空按鈕事件
btnClear.addEventListener('click', function() {
    gradeSelect.value = '';
    hideResult();
    disableControls();
});

// 頁面啟動
document.addEventListener('DOMContentLoaded', initPage);
