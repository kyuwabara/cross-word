"""クロスワードパズル生成ロジック"""

import random

# 小さい仮名を通常サイズに変換（日本語クロスワードの慣例）
SMALL_TO_LARGE = str.maketrans("ぁぃぅぇぉっゃゅょ", "あいうえおつやゆよ")


def to_grid_form(word):
    """単語をクロスワード用の表記に変換する（小文字仮名→大文字仮名）"""
    return word.translate(SMALL_TO_LARGE)


ACROSS = "across"
DOWN = "down"


class CrosswordGenerator:
    def __init__(self, width, height, word_list):
        self.width = width
        self.height = height
        max_len = max(width, height)
        self.word_list = [
            (w, c) for w, c in word_list if len(to_grid_form(w)) <= max_len
        ]
        self.grid = None
        self.placed = None

    def generate(self, attempts=80):
        """複数回試行して最良の結果を返す"""
        best = None
        best_count = 0

        for _ in range(attempts):
            self._reset()
            self._try_generate()
            count = len(self.placed)
            if count > best_count:
                best_count = count
                best = (self._copy_grid(), list(self.placed))
            if count >= 12:
                break

        if best:
            self.grid, self.placed = best
            return self._build_result()

        return {"error": "パズルを生成できませんでした。マスのサイズを大きくしてください。"}

    def _reset(self):
        self.grid = [[None] * self.width for _ in range(self.height)]
        self.placed = []

    def _copy_grid(self):
        return [row[:] for row in self.grid]

    def _try_generate(self):
        words = list(self.word_list)
        random.shuffle(words)
        words.sort(key=lambda x: len(x[0]), reverse=True)

        if not words:
            return

        # 最初の単語を中央に横向きで配置
        first_word, first_clue = words[0]
        grid_word = to_grid_form(first_word)
        col = (self.width - len(grid_word)) // 2
        row = self.height // 2

        if col >= 0 and col + len(grid_word) <= self.width:
            self._place(first_word, first_clue, row, col, ACROSS)

        # 残りの単語を配置
        for word, clue in words[1:]:
            placements = self._find_placements(word)
            if placements:
                placements.sort(key=lambda p: p["score"], reverse=True)
                top = placements[: min(3, len(placements))]
                chosen = random.choice(top)
                self._place(word, clue, chosen["row"], chosen["col"], chosen["dir"])

    def _place(self, word, clue, row, col, direction):
        grid_word = to_grid_form(word)
        dr, dc = (0, 1) if direction == ACROSS else (1, 0)
        for i, ch in enumerate(grid_word):
            self.grid[row + dr * i][col + dc * i] = ch
        self.placed.append((word, clue, row, col, direction))

    def _find_placements(self, word):
        grid_word = to_grid_form(word)
        results = []

        for direction in [ACROSS, DOWN]:
            dr, dc = (0, 1) if direction == ACROSS else (1, 0)

            if direction == ACROSS:
                max_row, max_col = self.height - 1, self.width - len(grid_word)
            else:
                max_row, max_col = self.height - len(grid_word), self.width - 1

            if max_col < 0 or max_row < 0:
                continue

            for row in range(max_row + 1):
                for col in range(max_col + 1):
                    score = self._check_placement(grid_word, row, col, dr, dc)
                    if score is not None:
                        results.append(
                            {"row": row, "col": col, "dir": direction, "score": score}
                        )

        return results

    def _check_placement(self, grid_word, row, col, dr, dc):
        length = len(grid_word)

        # 単語の前のマスが空/端であること
        pr, pc = row - dr, col - dc
        if 0 <= pr < self.height and 0 <= pc < self.width:
            if self.grid[pr][pc] is not None:
                return None

        # 単語の後のマスが空/端であること
        ar, ac = row + dr * length, col + dc * length
        if 0 <= ar < self.height and 0 <= ac < self.width:
            if self.grid[ar][ac] is not None:
                return None

        intersections = 0
        for i, ch in enumerate(grid_word):
            r = row + dr * i
            c = col + dc * i

            cell = self.grid[r][c]
            if cell is not None:
                if cell == ch:
                    intersections += 1
                else:
                    return None
            else:
                # 垂直方向の隣接マスが空であること（意図しない単語の生成を防ぐ）
                if dr == 0:  # 横方向配置 → 上下チェック
                    if r > 0 and self.grid[r - 1][c] is not None:
                        return None
                    if r < self.height - 1 and self.grid[r + 1][c] is not None:
                        return None
                else:  # 縦方向配置 → 左右チェック
                    if c > 0 and self.grid[r][c - 1] is not None:
                        return None
                    if c < self.width - 1 and self.grid[r][c + 1] is not None:
                        return None

        # 最初の単語以外は必ず交差が必要
        if intersections == 0 and len(self.placed) > 0:
            return None

        return intersections

    def _build_result(self):
        # グリッドデータの構築
        grid = []
        for row in self.grid:
            grid.append([ch if ch is not None else "" for ch in row])

        # 配置単語の位置マップ
        word_map = {}
        for word, clue, row, col, direction in self.placed:
            word_map[(row, col, direction)] = (word, clue)

        # セル番号の割り当て
        cell_numbers = [[0] * self.width for _ in range(self.height)]
        clues_across = []
        clues_down = []
        answers = {}
        number = 1

        for r in range(self.height):
            for c in range(self.width):
                if self.grid[r][c] is None:
                    continue

                starts_across = False
                starts_down = False

                # 横の単語の開始判定
                if (c == 0 or self.grid[r][c - 1] is None) and (
                    c + 1 < self.width and self.grid[r][c + 1] is not None
                ):
                    starts_across = True

                # 縦の単語の開始判定
                if (r == 0 or self.grid[r - 1][c] is None) and (
                    r + 1 < self.height and self.grid[r + 1][c] is not None
                ):
                    starts_down = True

                if starts_across or starts_down:
                    cell_numbers[r][c] = number

                    if starts_across and (r, c, ACROSS) in word_map:
                        word, clue = word_map[(r, c, ACROSS)]
                        grid_word = to_grid_form(word)
                        clues_across.append({"number": number, "clue": clue})
                        answers[f"{number}-across"] = grid_word

                    if starts_down and (r, c, DOWN) in word_map:
                        word, clue = word_map[(r, c, DOWN)]
                        grid_word = to_grid_form(word)
                        clues_down.append({"number": number, "clue": clue})
                        answers[f"{number}-down"] = grid_word

                    number += 1

        return {
            "width": self.width,
            "height": self.height,
            "grid": grid,
            "cell_numbers": cell_numbers,
            "clues_across": clues_across,
            "clues_down": clues_down,
            "answers": answers,
        }
