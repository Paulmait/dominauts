
type DominoTile = {
  left: number;
  right: number;
};

type GameMode = 'cuba' | 'usa' | 'mexico' | 'default';

type GameState = {
  mode: GameMode;
  players: DominoTile[][];
  board: DominoTile[];
  turn: number;
  scores: number[];
};

let gameState: GameState;
let currentMode: GameMode = 'default';

const countryGameModeMap: { [key: string]: GameMode } = {
  'CU': 'cuba',
  'US': 'usa',
  'MX': 'mexico',
};

const modeInstructions: { [key in GameMode]: string } = {
  cuba: `
    • 🇨🇺 *Cuba – Block Dominoes*  
    - Played with a double-nine set  
    - 2 teams (1 & 3 vs 2 & 4)  
    - No drawing tiles — if stuck, pass  
    - First team to empty hands wins  
    - Points = sum of opponents' pips
  `,
  usa: `
    • 🇺🇸 *USA – All Fives (Muggins)*  
    - Double-six set  
    - Score if ends total a multiple of 5  
    - Ex: 6 + 4 = 10 → +10 pts  
    - Missed score? Opponent can call "Muggins!"
  `,
  mexico: `
    • 🇲🇽 *Mexico – Chicken Foot*  
    - Start with highest double  
    - Build 3-branch “foot”  
    - Then continue regular play  
    - Draw until playable
  `,
  default: `
    • 🟦 *Classic Block Dominoes*  
    - Match tile ends  
    - No drawing — if stuck, pass  
    - Ends when someone empties hand  
    - Score = sum of opponents' pips
  `,
};

const generateDominoSet = (maxValue = 6): DominoTile[] => {
  const set: DominoTile[] = [];
  for (let i = 0; i <= maxValue; i++) {
    for (let j = i; j <= maxValue; j++) {
      set.push({ left: i, right: j });
    }
  }
  return set;
};

const shuffle = <T>(array: T[]): T[] => array.sort(() => Math.random() - 0.5);

const updateInstructions = (mode: GameMode) => {
  const el = document.getElementById("instructions")!;
  el.innerHTML = modeInstructions[mode].replace(/\n/g, "<br>");
};

const renderBoard = (tiles: DominoTile[]) => {
  const board = document.getElementById('game-board')!;
  board.innerHTML = '';
  tiles.forEach(tile => {
    const el = document.createElement('div');
    el.className = 'domino-tile';
    el.textContent = `${tile.left} | ${tile.right}`;
    board.appendChild(el);
  });
};

const updateTurnInfo = () => {
  const turn = document.getElementById('turn-info')!;
  turn.textContent = `Player ${gameState.turn + 1}'s Turn`;
};

const renderPlayerHand = (hand: DominoTile[]) => {
  const handDiv = document.getElementById('player-hand')!;
  handDiv.innerHTML = '';
  hand.forEach((tile, index) => {
    const el = document.createElement('div');
    el.className = 'domino-tile draggable';
    el.textContent = `${tile.left} | ${tile.right}`;
    el.draggable = true;
    el.addEventListener("dragstart", (e) => {
      (e as DragEvent).dataTransfer?.setData("tile-index", index.toString());
    });
    handDiv.appendChild(el);
  });
};

const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  const indexStr = e.dataTransfer?.getData("tile-index");
  if (indexStr != null) {
    const index = parseInt(indexStr, 10);
    const hand = gameState.players[gameState.turn];
    const tile = hand.splice(index, 1)[0];
    gameState.board.push(tile);

    if (gameState.mode === "usa") {
      const score = calculateAllFivesScore(gameState.board);
      animateScore(gameState.turn, score);
      gameState.scores[gameState.turn] += score;
    }

    if (hand.length === 0) {
      showEndModal(`🎉 Player ${gameState.turn + 1} wins the round!`);
      return;
    }

    gameState.turn = (gameState.turn + 1) % gameState.players.length;
    updateGame();
  }
};

const calculateAllFivesScore = (tiles: DominoTile[]): number => {
  if (tiles.length === 0) return 0;
  const first = tiles[0];
  const last = tiles[tiles.length - 1];
  let total = 0;

  total += (first.left === first.right) ? first.left * 2 : first.left;
  total += (last.left === last.right) ? last.right * 2 : last.right;

  return total % 5 === 0 ? total : 0;
};

const animateScore = (playerIndex: number, score: number) => {
  if (score === 0) return;
  const scoreboard = document.getElementById('scoreboard')!;
  const items = scoreboard.querySelectorAll('li');
  const target = items[playerIndex];
  if (target) {
    target.classList.add('score-changed');
    setTimeout(() => target.classList.remove('score-changed'), 1000);
  }
};

const updateScores = () => {
  const el = document.getElementById('scoreboard')!;
  el.innerHTML = `<h3>Scores</h3><ul>` +
    gameState.scores.map((s, i) => `<li>Player ${i + 1}: ${s} pts</li>`).join('') +
    `</ul>`;
};

const showEndModal = (message: string) => {
  const modal = document.getElementById('modal')!;
  const winner = document.getElementById('winner-message')!;
  winner.textContent = message;
  modal.classList.remove('hidden');
};

const updateGame = () => {
  updateTurnInfo();
  renderBoard(gameState.board);
  renderPlayerHand(gameState.players[gameState.turn]);
  updateScores();

  if (gameState.turn !== 0) {
    setTimeout(() => {
      const aiHand = gameState.players[gameState.turn];
      let bestIndex = 0, bestScore = -1;

      for (let i = 0; i < aiHand.length; i++) {
        const testTile = aiHand[i];
        const testBoard = [...gameState.board, testTile];
        const score = gameState.mode === "usa" ? calculateAllFivesScore(testBoard) : 0;
        if (score > bestScore) {
          bestScore = score;
          bestIndex = i;
        }
      }

      const tile = aiHand.splice(bestIndex, 1)[0];
      gameState.board.push(tile);
      if (gameState.mode === "usa") {
        const gained = calculateAllFivesScore(gameState.board);
        animateScore(gameState.turn, gained);
        gameState.scores[gameState.turn] += gained;
      }

      if (aiHand.length === 0) {
        showEndModal(`🎉 Player ${gameState.turn + 1} wins the round!`);
        return;
      }

      gameState.turn = (gameState.turn + 1) % gameState.players.length;
      updateGame();
    }, 1000);
  }
};

const getUserCountry = async (): Promise<string> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) resolve('US');
    else {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          resolve(data.address.country_code.toUpperCase());
        } catch { resolve('US'); }
      }, () => resolve('US'));
    }
  });
};

const setGameMode = async () => {
  const selectElement = document.getElementById('game-mode') as HTMLSelectElement;
  let selectedMode = selectElement.value as string;

  if (selectedMode === 'auto') {
    const country = await getUserCountry();
    selectedMode = countryGameModeMap[country] || 'default';
    selectElement.value = selectedMode;
  }

  currentMode = selectedMode as GameMode;
  updateInstructions(selectedMode as GameMode);

  const set = shuffle(generateDominoSet(selectedMode === "cuba" ? 9 : 6));
  const players: DominoTile[][] = [[], [], [], []];
  const handSize = selectedMode === "cuba" ? 10 : 12;

  for (let i = 0; i < handSize * 4; i++) {
    players[i % 4].push(set.pop()!);
  }

  gameState = {
    mode: selectedMode as GameMode,
    players,
    board: [],
    turn: 0,
    scores: [0, 0, 0, 0],
  };

  updateGame();
};

document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById("game-board")!;
  dropZone.addEventListener("dragover", (e) => e.preventDefault());
  dropZone.addEventListener("drop", handleDrop);

  const startButton = document.getElementById('start-button')!;
  const selectElement = document.getElementById('game-mode') as HTMLSelectElement;
  const viewRulesBtn = document.getElementById('view-rules-button')!;
  const howTo = document.getElementById('how-to-play')!;

  selectElement.addEventListener('change', () => {
    updateInstructions(selectElement.value as GameMode);
  });

  startButton.addEventListener('click', () => {
    setGameMode();
  });

  viewRulesBtn.addEventListener('click', () => {
    howTo.classList.toggle('hidden');
  });

  updateInstructions('default');
  howTo.classList.add('hidden');

  const restartGame = () => {
    document.getElementById('modal')?.classList.add('hidden');
    const select = document.getElementById('game-mode') as HTMLSelectElement;
    select.value = currentMode;
    setGameMode();
  };

  (window as any).restartGame = restartGame;
});

