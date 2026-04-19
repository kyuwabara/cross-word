// クロスワードパズル生成ロジック

const SMALL_TO_LARGE = {
  "ぁ": "あ", "ぃ": "い", "ぅ": "う", "ぇ": "え", "ぉ": "お",
  "っ": "つ", "ゃ": "や", "ゅ": "ゆ", "ょ": "よ",
};

function toGridForm(word) {
  let out = "";
  for (const ch of word) {
    out += SMALL_TO_LARGE[ch] || ch;
  }
  return out;
}

const ACROSS = "across";
const DOWN = "down";

function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

class CrosswordGenerator {
  constructor(width, height, wordList) {
    this.width = width;
    this.height = height;
    const maxLen = Math.max(width, height);
    this.wordList = wordList.filter(([w]) => toGridForm(w).length <= maxLen);
    this.grid = null;
    this.placed = null;
  }

  generate(attempts = 80) {
    let best = null;
    let bestCount = 0;

    for (let i = 0; i < attempts; i++) {
      this._reset();
      this._tryGenerate();
      const count = this.placed.length;
      if (count > bestCount) {
        bestCount = count;
        best = [this._copyGrid(), this.placed.slice()];
      }
      if (count >= 12) break;
    }

    if (best) {
      this.grid = best[0];
      this.placed = best[1];
      return this._buildResult();
    }

    return { error: "パズルを生成できませんでした。マスのサイズを大きくしてください。" };
  }

  _reset() {
    this.grid = Array.from({ length: this.height }, () =>
      new Array(this.width).fill(null)
    );
    this.placed = [];
  }

  _copyGrid() {
    return this.grid.map((row) => row.slice());
  }

  _tryGenerate() {
    let words = shuffled(this.wordList);
    if (words.length === 0) return;

    const firstCandidates = words.filter(
      ([w]) => toGridForm(w).length <= this.width
    );
    if (firstCandidates.length === 0) return;

    const [firstWord, firstClue] =
      firstCandidates[Math.floor(Math.random() * firstCandidates.length)];
    words = words.filter(([w]) => w !== firstWord);

    const gridWord = toGridForm(firstWord);
    const col = Math.floor((this.width - gridWord.length) / 2);
    const row = Math.floor(this.height / 2);
    this._place(firstWord, firstClue, row, col, ACROSS);

    for (const [word, clue] of words) {
      const placements = this._findPlacements(word);
      if (placements.length > 0) {
        placements.sort((a, b) => b.score - a.score);
        const top = placements.slice(0, Math.min(3, placements.length));
        const chosen = top[Math.floor(Math.random() * top.length)];
        this._place(word, clue, chosen.row, chosen.col, chosen.dir);
      }
    }
  }

  _place(word, clue, row, col, direction) {
    const gridWord = toGridForm(word);
    const dr = direction === ACROSS ? 0 : 1;
    const dc = direction === ACROSS ? 1 : 0;
    for (let i = 0; i < gridWord.length; i++) {
      this.grid[row + dr * i][col + dc * i] = gridWord[i];
    }
    this.placed.push([word, clue, row, col, direction]);
  }

  _findPlacements(word) {
    const gridWord = toGridForm(word);
    const results = [];

    for (const direction of [ACROSS, DOWN]) {
      const dr = direction === ACROSS ? 0 : 1;
      const dc = direction === ACROSS ? 1 : 0;

      let maxRow, maxCol;
      if (direction === ACROSS) {
        maxRow = this.height - 1;
        maxCol = this.width - gridWord.length;
      } else {
        maxRow = this.height - gridWord.length;
        maxCol = this.width - 1;
      }

      if (maxCol < 0 || maxRow < 0) continue;

      for (let row = 0; row <= maxRow; row++) {
        for (let col = 0; col <= maxCol; col++) {
          const score = this._checkPlacement(gridWord, row, col, dr, dc);
          if (score !== null) {
            results.push({ row, col, dir: direction, score });
          }
        }
      }
    }

    return results;
  }

  _checkPlacement(gridWord, row, col, dr, dc) {
    const length = gridWord.length;

    const pr = row - dr;
    const pc = col - dc;
    if (pr >= 0 && pr < this.height && pc >= 0 && pc < this.width) {
      if (this.grid[pr][pc] !== null) return null;
    }

    const ar = row + dr * length;
    const ac = col + dc * length;
    if (ar >= 0 && ar < this.height && ac >= 0 && ac < this.width) {
      if (this.grid[ar][ac] !== null) return null;
    }

    let intersections = 0;
    for (let i = 0; i < length; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      const cell = this.grid[r][c];
      const ch = gridWord[i];

      if (cell !== null) {
        if (cell === ch) {
          intersections++;
        } else {
          return null;
        }
      } else {
        if (dr === 0) {
          if (r > 0 && this.grid[r - 1][c] !== null) return null;
          if (r < this.height - 1 && this.grid[r + 1][c] !== null) return null;
        } else {
          if (c > 0 && this.grid[r][c - 1] !== null) return null;
          if (c < this.width - 1 && this.grid[r][c + 1] !== null) return null;
        }
      }
    }

    if (intersections === 0 && this.placed.length > 0) return null;

    return intersections;
  }

  _buildResult() {
    const grid = this.grid.map((row) =>
      row.map((ch) => (ch !== null ? ch : ""))
    );

    const wordMap = new Map();
    for (const [word, clue, row, col, direction] of this.placed) {
      wordMap.set(`${row},${col},${direction}`, [word, clue]);
    }

    const cellNumbers = Array.from({ length: this.height }, () =>
      new Array(this.width).fill(0)
    );
    const cluesAcross = [];
    const cluesDown = [];
    const answers = {};
    let number = 1;

    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width; c++) {
        if (this.grid[r][c] === null) continue;

        const startsAcross =
          (c === 0 || this.grid[r][c - 1] === null) &&
          c + 1 < this.width &&
          this.grid[r][c + 1] !== null;

        const startsDown =
          (r === 0 || this.grid[r - 1][c] === null) &&
          r + 1 < this.height &&
          this.grid[r + 1][c] !== null;

        if (startsAcross || startsDown) {
          cellNumbers[r][c] = number;

          if (startsAcross) {
            const key = `${r},${c},${ACROSS}`;
            if (wordMap.has(key)) {
              const [word, clue] = wordMap.get(key);
              cluesAcross.push({ number, clue });
              answers[`${number}-across`] = toGridForm(word);
            }
          }

          if (startsDown) {
            const key = `${r},${c},${DOWN}`;
            if (wordMap.has(key)) {
              const [word, clue] = wordMap.get(key);
              cluesDown.push({ number, clue });
              answers[`${number}-down`] = toGridForm(word);
            }
          }

          number++;
        }
      }
    }

    return {
      width: this.width,
      height: this.height,
      grid,
      cell_numbers: cellNumbers,
      clues_across: cluesAcross,
      clues_down: cluesDown,
      answers,
    };
  }
}

function generateCrossword(width, height) {
  width = Math.max(5, Math.min(15, width));
  height = Math.max(5, Math.min(15, height));
  const generator = new CrosswordGenerator(width, height, WORDS);
  return generator.generate();
}
