// クロスワードパズル クライアント

let puzzleData = null;
let userGrid = null;
let selectedRow = -1;
let selectedCol = -1;
let direction = "across"; // "across" or "down"

// キーボードレイアウト（各配列が縦1列、右から左に並ぶ）
const KEYBOARD_SEION = [
  ["あ", "い", "う", "え", "お"],
  ["か", "き", "く", "け", "こ"],
  ["さ", "し", "す", "せ", "そ"],
  ["た", "ち", "つ", "て", "と"],
  ["な", "に", "ぬ", "ね", "の"],
  ["は", "ひ", "ふ", "へ", "ほ"],
  ["ま", "み", "む", "め", "も"],
  ["や", "", "ゆ", "", "よ"],
  ["ら", "り", "る", "れ", "ろ"],
  ["わ", "", "", "", "ん"],
];

const KEYBOARD_DAKUTEN = [
  ["が", "ぎ", "ぐ", "げ", "ご"],
  ["ざ", "じ", "ず", "ぜ", "ぞ"],
  ["だ", "ぢ", "づ", "で", "ど"],
  ["ば", "び", "ぶ", "べ", "ぼ"],
  ["ぱ", "ぴ", "ぷ", "ぺ", "ぽ"],
];

document.addEventListener("DOMContentLoaded", () => {
  buildKeyboard();
  document.getElementById("generate").addEventListener("click", fetchPuzzle);
  document.getElementById("check").addEventListener("click", checkAnswers);
  document.getElementById("clear").addEventListener("click", clearAll);
  document.getElementById("print").addEventListener("click", () => {
    window.print();
  });

  // 初回パズル生成
  fetchPuzzle();
});

async function fetchPuzzle() {
  const width = parseInt(document.getElementById("width").value) || 8;
  const height = parseInt(document.getElementById("height").value) || 8;

  document.getElementById("loading").style.display = "block";
  document.getElementById("puzzle-area").style.display = "none";
  removeMessage();

  try {
    const res = await fetch(`/api/generate?width=${width}&height=${height}`);
    const data = await res.json();

    if (data.error) {
      document.getElementById("loading").textContent = data.error;
      return;
    }

    puzzleData = data;
    userGrid = Array.from({ length: data.height }, () =>
      Array(data.width).fill(""),
    );
    selectedRow = -1;
    selectedCol = -1;
    direction = "across";

    renderGrid();
    renderClues();

    document.getElementById("loading").style.display = "none";
    document.getElementById("puzzle-area").style.display = "flex";
  } catch {
    document.getElementById("loading").textContent =
      "エラーがおきました。もういちどためしてください。";
  }
}

function renderGrid() {
  const table = document.getElementById("grid");
  table.innerHTML = "";

  for (let r = 0; r < puzzleData.height; r++) {
    const tr = document.createElement("tr");

    for (let c = 0; c < puzzleData.width; c++) {
      const td = document.createElement("td");
      const ch = puzzleData.grid[r][c];

      if (ch === "") {
        td.className = "black";
      } else {
        td.className = "white";
        td.dataset.row = r;
        td.dataset.col = c;
        td.addEventListener("click", () => onCellClick(r, c));

        const num = puzzleData.cell_numbers[r][c];
        if (num > 0) {
          const numSpan = document.createElement("span");
          numSpan.className = "cell-number";
          numSpan.textContent = num;
          td.appendChild(numSpan);
        }

        const charSpan = document.createElement("span");
        charSpan.className = "cell-char";
        charSpan.textContent = userGrid[r][c];
        td.appendChild(charSpan);
      }

      tr.appendChild(td);
    }

    table.appendChild(tr);
  }

  updateHighlight();
}

function renderClues() {
  renderClueList("clues-across", puzzleData.clues_across, "across");
  renderClueList("clues-down", puzzleData.clues_down, "down");
}

function renderClueList(elementId, clues, dir) {
  const ul = document.getElementById(elementId);
  ul.innerHTML = "";

  for (const clue of clues) {
    const li = document.createElement("li");
    li.dataset.number = clue.number;
    li.dataset.direction = dir;
    li.innerHTML = `<span class="clue-number">${clue.number}</span> ${clue.clue}`;
    li.addEventListener("click", () => onClueClick(clue.number, dir));
    ul.appendChild(li);
  }
}

function onCellClick(r, c) {
  if (puzzleData.grid[r][c] === "") return;

  removeCheckColors();

  if (selectedRow === r && selectedCol === c) {
    direction = direction === "across" ? "down" : "across";
  } else {
    selectedRow = r;
    selectedCol = c;
    direction = getBestDirection(r, c);
  }

  updateHighlight();
}

function onClueClick(number, dir) {
  for (let r = 0; r < puzzleData.height; r++) {
    for (let c = 0; c < puzzleData.width; c++) {
      if (puzzleData.cell_numbers[r][c] === number) {
        selectedRow = r;
        selectedCol = c;
        direction = dir;
        removeCheckColors();
        updateHighlight();
        return;
      }
    }
  }
}

function getBestDirection(r, c) {
  const hasAcross = isPartOfWord(r, c, "across");
  const hasDown = isPartOfWord(r, c, "down");

  if (hasAcross && hasDown) return direction;
  if (hasAcross) return "across";
  if (hasDown) return "down";
  return "across";
}

function isPartOfWord(r, c, dir) {
  if (dir === "across") {
    const left = c > 0 && puzzleData.grid[r][c - 1] !== "";
    const right = c < puzzleData.width - 1 && puzzleData.grid[r][c + 1] !== "";
    return left || right;
  } else {
    const up = r > 0 && puzzleData.grid[r - 1][c] !== "";
    const down = r < puzzleData.height - 1 && puzzleData.grid[r + 1][c] !== "";
    return up || down;
  }
}

function getWordCells(r, c, dir) {
  if (r < 0 || puzzleData.grid[r][c] === "") return [];

  const cells = [];
  const dr = dir === "down" ? 1 : 0;
  const dc = dir === "across" ? 1 : 0;

  let sr = r,
    sc = c;
  while (
    sr - dr >= 0 &&
    sc - dc >= 0 &&
    puzzleData.grid[sr - dr][sc - dc] !== ""
  ) {
    sr -= dr;
    sc -= dc;
  }

  let cr = sr,
    cc = sc;
  while (
    cr < puzzleData.height &&
    cc < puzzleData.width &&
    puzzleData.grid[cr][cc] !== ""
  ) {
    cells.push({ r: cr, c: cc });
    cr += dr;
    cc += dc;
  }

  return cells.length >= 2 ? cells : [];
}

function updateHighlight() {
  const allCells = document.querySelectorAll(".grid td.white");
  allCells.forEach((td) => {
    td.classList.remove("selected", "highlighted");
  });

  document.querySelectorAll(".clues-section li").forEach((li) => {
    li.classList.remove("clue-highlighted");
  });

  if (selectedRow < 0) return;

  const wordCells = getWordCells(selectedRow, selectedCol, direction);
  wordCells.forEach(({ r, c }) => {
    const td = getCellElement(r, c);
    if (td) td.classList.add("highlighted");
  });

  const selectedTd = getCellElement(selectedRow, selectedCol);
  if (selectedTd) {
    selectedTd.classList.remove("highlighted");
    selectedTd.classList.add("selected");
  }

  if (wordCells.length > 0) {
    const startR = wordCells[0].r;
    const startC = wordCells[0].c;
    const num = puzzleData.cell_numbers[startR][startC];
    if (num > 0) {
      const clueEl = document.querySelector(
        `li[data-number="${num}"][data-direction="${direction}"]`,
      );
      if (clueEl) {
        clueEl.classList.add("clue-highlighted");
        clueEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }
}

function getCellElement(r, c) {
  const table = document.getElementById("grid");
  if (table.rows[r] && table.rows[r].cells[c]) {
    const td = table.rows[r].cells[c];
    return td.classList.contains("white") ? td : null;
  }
  return null;
}

function inputChar(ch) {
  if (selectedRow < 0 || selectedCol < 0) return;
  if (puzzleData.grid[selectedRow][selectedCol] === "") return;

  removeCheckColors();

  userGrid[selectedRow][selectedCol] = ch;

  const td = getCellElement(selectedRow, selectedCol);
  if (td) {
    const charSpan = td.querySelector(".cell-char");
    if (charSpan) charSpan.textContent = ch;
  }

  moveToNextCell();
}

function deleteChar() {
  if (selectedRow < 0 || selectedCol < 0) return;

  removeCheckColors();

  if (userGrid[selectedRow][selectedCol] !== "") {
    userGrid[selectedRow][selectedCol] = "";
    const td = getCellElement(selectedRow, selectedCol);
    if (td) {
      const charSpan = td.querySelector(".cell-char");
      if (charSpan) charSpan.textContent = "";
    }
  } else {
    moveToPrevCell();
    if (selectedRow >= 0) {
      userGrid[selectedRow][selectedCol] = "";
      const td = getCellElement(selectedRow, selectedCol);
      if (td) {
        const charSpan = td.querySelector(".cell-char");
        if (charSpan) charSpan.textContent = "";
      }
    }
  }

  updateHighlight();
}

function moveToNextCell() {
  const dr = direction === "down" ? 1 : 0;
  const dc = direction === "across" ? 1 : 0;

  let nr = selectedRow + dr;
  let nc = selectedCol + dc;

  if (
    nr < puzzleData.height &&
    nc < puzzleData.width &&
    puzzleData.grid[nr][nc] !== ""
  ) {
    selectedRow = nr;
    selectedCol = nc;
  }

  updateHighlight();
}

function moveToPrevCell() {
  const dr = direction === "down" ? 1 : 0;
  const dc = direction === "across" ? 1 : 0;

  let nr = selectedRow - dr;
  let nc = selectedCol - dc;

  if (nr >= 0 && nc >= 0 && puzzleData.grid[nr][nc] !== "") {
    selectedRow = nr;
    selectedCol = nc;
  }

  updateHighlight();
}

function checkAnswers() {
  if (!puzzleData) return;

  let totalCells = 0;
  let correctCells = 0;

  for (let r = 0; r < puzzleData.height; r++) {
    for (let c = 0; c < puzzleData.width; c++) {
      if (puzzleData.grid[r][c] === "") continue;

      totalCells++;
      const td = getCellElement(r, c);
      if (!td) continue;

      const userChar = userGrid[r][c];
      const correctChar = puzzleData.grid[r][c];
      const charSpan = td.querySelector(".cell-char");

      if (userChar === correctChar) {
        correctCells++;
        td.classList.add("correct");
      } else {
        td.classList.add("incorrect");
        // 正解を表示する
        if (charSpan) {
          charSpan.textContent = correctChar;
          charSpan.classList.add("answer-reveal");
        }
      }
    }
  }

  removeMessage();
  const msg = document.createElement("div");
  msg.className = "message";
  msg.id = "result-message";

  if (correctCells === totalCells) {
    msg.classList.add("message-success");
    msg.textContent = "すごい！ぜんぶせいかい！";
  } else {
    msg.classList.add("message-partial");
    msg.textContent = `${totalCells}もじちゅう ${correctCells}もじ せいかい！`;
  }

  document.querySelector(".actions").after(msg);
}

function removeCheckColors() {
  document.querySelectorAll(".grid td").forEach((td) => {
    td.classList.remove("correct", "incorrect");
  });

  // 正解表示を元のユーザー入力に戻す
  document.querySelectorAll(".cell-char.answer-reveal").forEach((span) => {
    span.classList.remove("answer-reveal");
    const td = span.closest("td");
    if (td && td.dataset.row !== undefined) {
      const r = parseInt(td.dataset.row);
      const c = parseInt(td.dataset.col);
      if (!isNaN(r) && !isNaN(c)) {
        span.textContent = userGrid[r][c];
      }
    }
  });

  removeMessage();
}

function removeMessage() {
  const msg = document.getElementById("result-message");
  if (msg) msg.remove();
}

function clearAll() {
  if (!puzzleData) return;

  for (let r = 0; r < puzzleData.height; r++) {
    for (let c = 0; c < puzzleData.width; c++) {
      userGrid[r][c] = "";
    }
  }

  removeCheckColors();
  renderGrid();
}

// キーボード構築（五十音表レイアウト：右から縦にあいうえお）
function buildKeyboard() {
  const keyboard = document.getElementById("keyboard");
  keyboard.innerHTML = "";

  // 清音
  const seionSection = buildKeyboardSection(KEYBOARD_SEION);
  keyboard.appendChild(seionSection);

  // 濁音・半濁音
  const dakutenSection = buildKeyboardSection(KEYBOARD_DAKUTEN);
  keyboard.appendChild(dakutenSection);

  // 削除ボタン
  const delRow = document.createElement("div");
  delRow.className = "keyboard-delete-row";
  const delBtn = document.createElement("button");
  delBtn.className = "key-delete";
  delBtn.textContent = "けす";
  delBtn.addEventListener("click", (e) => {
    e.preventDefault();
    deleteChar();
  });
  delRow.appendChild(delBtn);
  keyboard.appendChild(delRow);
}

function buildKeyboardSection(columns) {
  const section = document.createElement("div");
  section.className = "keyboard-section";

  for (const col of columns) {
    const colDiv = document.createElement("div");
    colDiv.className = "keyboard-col";

    for (const ch of col) {
      if (ch === "") {
        const spacer = document.createElement("div");
        spacer.className = "key key-spacer";
        colDiv.appendChild(spacer);
      } else {
        const btn = document.createElement("button");
        btn.className = "key";
        btn.textContent = ch;
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          inputChar(ch);
        });
        colDiv.appendChild(btn);
      }
    }

    section.appendChild(colDiv);
  }

  return section;
}
