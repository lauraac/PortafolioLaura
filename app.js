const menuBtn = document.getElementById("menuBtn");
const nav = document.getElementById("nav");
const topBtn = document.getElementById("topBtn");

if (menuBtn && nav) {
  menuBtn.addEventListener("click", () => {
    nav.classList.toggle("active");
  });

  document.querySelectorAll(".nav a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("active");
    });
  });
}

const reveals = document.querySelectorAll(".reveal");

function revealOnScroll() {
  reveals.forEach((item) => {
    const top = item.getBoundingClientRect().top;
    const windowHeight = window.innerHeight;

    if (top < windowHeight - 80) {
      item.classList.add("active");
    }
  });

  if (topBtn) {
    topBtn.style.display = window.scrollY > 500 ? "block" : "none";
  }
}

window.addEventListener("scroll", revealOnScroll);
window.addEventListener("load", revealOnScroll);

if (topBtn) {
  topBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

/* TETRIS */
const tetrisCanvas = document.getElementById("tetris");

if (tetrisCanvas) {
  const ctx = tetrisCanvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const levelEl = document.getElementById("level");
  const timerEl = document.getElementById("timer");
  const recordEl = document.getElementById("record");

  const COLS = 10;
  const ROWS = 20;
  const BLOCK = 30;

  ctx.scale(BLOCK, BLOCK);

  const colors = [
    null,
    "#ff3b3b",
    "#ff9f1c",
    "#ffe600",
    "#39ff14",
    "#00d9ff",
    "#ff2bd6",
    "#8b5cf6",
  ];

  const pieces = {
    T: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    O: [
      [2, 2],
      [2, 2],
    ],
    L: [
      [0, 0, 3],
      [3, 3, 3],
      [0, 0, 0],
    ],
    J: [
      [4, 0, 0],
      [4, 4, 4],
      [0, 0, 0],
    ],
    I: [
      [0, 0, 0, 0],
      [5, 5, 5, 5],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    S: [
      [0, 6, 6],
      [6, 6, 0],
      [0, 0, 0],
    ],
    Z: [
      [7, 7, 0],
      [0, 7, 7],
      [0, 0, 0],
    ],
  };

  let board = createBoard();
  let player = randomPiece();
  let score = 0;
  let level = 1;
  let dropCounter = 0;
  let dropInterval = 900;
  let lastTime = 0;
  let playing = false;
  let startTime = 0;
  let elapsedSeconds = 0;
  let recordSeconds = Number(localStorage.getItem("tetrisRecord")) || 0;

  function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  }

  function randomPiece() {
    const keys = Object.keys(pieces);
    const key = keys[Math.floor(Math.random() * keys.length)];

    return {
      matrix: pieces[key],
      pos: {
        x: Math.floor(COLS / 2) - 1,
        y: 0,
      },
    };
  }

  function formatTime(seconds) {
    const min = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const sec = (seconds % 60).toString().padStart(2, "0");
    return `${min}:${sec}`;
  }

  function drawMatrix(matrix, offset) {
    matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          ctx.fillStyle = colors[value];
          ctx.shadowColor = colors[value];
          ctx.shadowBlur = 0.35;
          ctx.fillRect(x + offset.x, y + offset.y, 1, 1);
          ctx.shadowBlur = 0;

          ctx.strokeStyle = "rgba(255,255,255,.28)";
          ctx.lineWidth = 0.04;
          ctx.strokeRect(x + offset.x, y + offset.y, 1, 1);
        }
      });
    });
  }

  function drawGrid() {
    ctx.strokeStyle = "rgba(255,255,255,.05)";
    ctx.lineWidth = 0.02;

    for (let x = 0; x < COLS; x++) {
      for (let y = 0; y < ROWS; y++) {
        ctx.strokeRect(x, y, 1, 1);
      }
    }
  }

  function draw() {
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, COLS, ROWS);

    drawGrid();
    drawMatrix(board, { x: 0, y: 0 });
    drawMatrix(player.matrix, player.pos);
  }

  function collide(currentBoard, currentPlayer) {
    const matrix = currentPlayer.matrix;
    const pos = currentPlayer.pos;

    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < matrix[y].length; x++) {
        if (
          matrix[y][x] !== 0 &&
          (currentBoard[y + pos.y] && currentBoard[y + pos.y][x + pos.x]) !== 0
        ) {
          return true;
        }
      }
    }

    return false;
  }

  function merge(currentBoard, currentPlayer) {
    currentPlayer.matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          currentBoard[y + currentPlayer.pos.y][x + currentPlayer.pos.x] =
            value;
        }
      });
    });
  }

  function clearLines() {
    let lines = 0;

    outer: for (let y = board.length - 1; y >= 0; y--) {
      for (let x = 0; x < board[y].length; x++) {
        if (board[y][x] === 0) continue outer;
      }

      const row = board.splice(y, 1)[0].fill(0);
      board.unshift(row);
      y++;
      lines++;
    }

    if (lines > 0) {
      score += lines * 100;
      level = Math.floor(score / 400) + 1;
      dropInterval = Math.max(150, 900 - (level - 1) * 90);

      scoreEl.textContent = score;
      levelEl.textContent = level;
    }
  }

  function rotate(matrix) {
    return matrix[0].map((_, i) => matrix.map((row) => row[i]).reverse());
  }

  function playerRotate() {
    if (!playing) return;

    const original = player.matrix;
    player.matrix = rotate(player.matrix);

    if (collide(board, player)) {
      player.matrix = original;
    }
  }

  function playerMove(direction) {
    if (!playing) return;

    player.pos.x += direction;

    if (collide(board, player)) {
      player.pos.x -= direction;
    }

    draw();
  }

  function playerDrop() {
    if (!playing) return;

    player.pos.y++;

    if (collide(board, player)) {
      player.pos.y--;
      merge(board, player);
      clearLines();

      player = randomPiece();

      if (collide(board, player)) {
        playing = false;
        drawGameOver();
        return;
      }
    }

    dropCounter = 0;
    draw();
  }

  function drawGameOver() {
    if (elapsedSeconds > recordSeconds) {
      recordSeconds = elapsedSeconds;
      localStorage.setItem("tetrisRecord", recordSeconds);
    }

    recordEl.textContent = formatTime(recordSeconds);

    ctx.fillStyle = "rgba(0,0,0,.85)";
    ctx.fillRect(0, 0, COLS, ROWS);

    ctx.fillStyle = "#ff4fa3";
    ctx.font = "1px Arial";
    ctx.textAlign = "center";
    ctx.fillText("PERDISTE 😢", COLS / 2, 8);

    ctx.fillStyle = "white";
    ctx.font = "0.6px Arial";
    ctx.fillText(`Tiempo: ${formatTime(elapsedSeconds)}`, COLS / 2, 10);
    ctx.fillText(`Récord: ${formatTime(recordSeconds)}`, COLS / 2, 11);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "0.45px Arial";
    ctx.fillText("Presiona INICIAR para volver", COLS / 2, 13);
  }

  function update(time = 0) {
    if (!playing) return;

    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;

    if (dropCounter > dropInterval) {
      playerDrop();
    }

    elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    timerEl.textContent = formatTime(elapsedSeconds);

    draw();
    requestAnimationFrame(update);
  }

  function startTetris() {
    board = createBoard();
    player = randomPiece();

    score = 0;
    level = 1;
    dropInterval = 900;
    dropCounter = 0;
    lastTime = 0;
    startTime = Date.now();
    elapsedSeconds = 0;
    playing = true;

    scoreEl.textContent = score;
    levelEl.textContent = level;
    timerEl.textContent = "00:00";
    recordEl.textContent = formatTime(recordSeconds);

    draw();
    requestAnimationFrame(update);
  }

  document
    .getElementById("startTetris")
    ?.addEventListener("click", startTetris);
  document
    .getElementById("leftTetris")
    ?.addEventListener("click", () => playerMove(-1));
  document
    .getElementById("rightTetris")
    ?.addEventListener("click", () => playerMove(1));
  document
    .getElementById("rotateTetris")
    ?.addEventListener("click", playerRotate);
  document.getElementById("downTetris")?.addEventListener("click", playerDrop);

  window.addEventListener("keydown", (event) => {
    if (!playing) return;

    if (event.key === "ArrowLeft") playerMove(-1);
    if (event.key === "ArrowRight") playerMove(1);
    if (event.key === "ArrowDown") playerDrop();
    if (event.key === "ArrowUp") playerRotate();
  });

  recordEl.textContent = formatTime(recordSeconds);
  timerEl.textContent = "00:00";
  draw();
}
