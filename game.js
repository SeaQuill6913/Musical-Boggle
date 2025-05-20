document.addEventListener('DOMContentLoaded', () => {
    const GRID_SIZE = 4;
    const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']; // Base letters
    // Music-themed word list (expand this considerably for a real game!)
    // For simplicity, let's use words that can be formed with A-G,
    // but a real music Boggle would need more letters (S, T, O, N, M, R, etc.)
    // So I'll add a few more letters to make the wordlist more interesting.
    const GAME_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const WORD_LIST = new Set(["AA","AB","ABA","ABACA","ABBA","ABBE","ABED","ACCEDE","ACCEDED","ACE","ACED","AD","ADAGE","ADD","ADDED","AE","AFAR","AFEARD","AFF","AG","AGA","AGE","AGED","BA","BAA","BAAED","BABA","BABE","BACCA","BACCAE","BAD","BADE","BADGE","BADGED","BAG","BAGGAGE","BAGGED","BE","BEAD","BEADED","BED","BEDAD","BEDDED","BEDABBLE","BEDABBLED","BEEBEE","BEEF","BEEFED","BEG","BEGGED","CAB","CABBED","CABBAGE","CABBAGED","CAD","CADE","CADGE","CADGED","CAECA","CAFE","CAGE","CAGED","CEDE","CEDED","DA","DAB","DABBED","DACE","DAD","DAFF","DAFFED","DAG","DE","DEAD","DEAF","DECADE","DECAF","DEED","DEEDED","DEF","DEFACE","DEFACED","EBB","EBBED","ED","EDGE","EDGED","EF","EFF","EFFACE","EFFACED","EGAD","EGER","EGG","EGGED","FA","FAB","FACADE","FACE","FACED","FAD","FADE","FADED","FADGE","FADGED","FE","FED","FEE","FEEB","FEED","GAB","GABBA","GABBED","GAD","GADDED","GAE","GAFF","GAFFED","GAG","GAGA","GAGGED","GAGE","GAGED","GED","GEE","GEED"]);
    const MIN_WORD_LENGTH = 3;

    let grid = [];
    let numPlayers = 1;
    let scores = {};
    let currentPlayer = 1;
    let currentPath = []; // [{row, col, element, letter}]
    let currentWord = "";
    let foundWords = {}; // { player1: new Set(), player2: new Set() }

    // UI Elements
    const setupScreen = document.getElementById('setup-screen');
    const gameScreen = document.getElementById('game-screen');
    const playerCountSelect = document.getElementById('player-count');
    const startGameBtn = document.getElementById('start-game-btn');
    const scoreBoardDiv = document.getElementById('score-board');
    const currentPlayerDisplay = document.getElementById('current-player-display');
    const currentPlayerNumberSpan = document.getElementById('current-player-number');
    const gridContainer = document.getElementById('grid-container');
    const currentWordDisplay = document.getElementById('current-word-display');
    const submitWordBtn = document.getElementById('submit-word-btn');
    const clearSelectionBtn = document.getElementById('clear-selection-btn');
    const p1WordListUl = document.getElementById('p1-word-list');
    const p2WordListUl = document.getElementById('p2-word-list');
    const player2WordsDiv = document.getElementById('player2-words');
    const messageArea = document.getElementById('message-area');
    const restartGameBtn = document.getElementById('restart-game-btn');

    // 1. Generate 2D random array
    function generateGrid() {
        grid = [];
        for (let i = 0; i < GRID_SIZE; i++) {
            const row = [];
            for (let j = 0; j < GRID_SIZE; j++) {
                const randomLetter = GAME_LETTERS[Math.floor(Math.random() * GAME_LETTERS.length)];
                row.push(randomLetter);
            }
            grid.push(row);
        }
    }

    // Initialize scores based on player count
    function initializeScores() {
        scores = { player1: 0 };
        foundWords = { player1: new Set() };
        if (numPlayers === 2) {
            scores.player2 = 0;
            foundWords.player2 = new Set();
            player2WordsDiv.style.display = 'block';
            currentPlayerDisplay.style.display = 'block';
        } else {
            player2WordsDiv.style.display = 'none';
            currentPlayerDisplay.style.display = 'none';
        }
        updateScoreBoard();
        updateFoundWordsDisplay();
    }

    function updateScoreBoard() {
        let scoreText = `Player 1: ${scores.player1}`;
        if (numPlayers === 2) {
            scoreText += ` | Player 2: ${scores.player2}`;
        }
        scoreBoardDiv.textContent = scoreText;
    }

    // 3. Generate UI of the array
    function renderGrid() {
        gridContainer.innerHTML = ''; // Clear previous grid
        grid.forEach((row, rowIndex) => {
            row.forEach((letter, colIndex) => {
                const cell = document.createElement('div');
                cell.classList.add('grid-cell');
                cell.textContent = letter;
                cell.dataset.row = rowIndex;
                cell.dataset.col = colIndex;
                cell.addEventListener('click', handleCellClick);
                gridContainer.appendChild(cell);
            });
        });
    }

    function handleCellClick(event) {
        const cell = event.target;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        const letter = cell.textContent;

        // Check if already selected
        if (currentPath.some(p => p.row === row && p.col === col)) {
            // If clicking the last selected cell, deselect it (optional feature)
            if (currentPath.length > 0 && currentPath[currentPath.length - 1].row === row && currentPath[currentPath.length - 1].col === col) {
                const deselected = currentPath.pop();
                deselected.element.classList.remove('selected');
                currentWord = currentWord.slice(0, -1);
                updateCurrentWordDisplay();
                // Re-enable neighbors of the new last cell if any
                if (currentPath.length > 0) {
                    const lastSelected = currentPath[currentPath.length - 1];
                    enableNeighbors(lastSelected.row, lastSelected.col);
                } else {
                     enableAllCells(); // If path is empty, enable all
                }
            } else {
                showMessage("Letter already in path!", "error");
            }
            return;
        }

        // Check if adjacent to the last selected cell (if not the first selection)
        if (currentPath.length > 0) {
            const lastSelected = currentPath[currentPath.length - 1];
            if (!isAdjacent(row, col, lastSelected.row, lastSelected.col)) {
                showMessage("Must select an adjacent letter!", "error");
                return;
            }
        }

        // Valid selection
        cell.classList.add('selected');
        currentPath.push({ row, col, element: cell, letter });
        currentWord += letter;
        updateCurrentWordDisplay();
        disableNonNeighbors(row, col); // Disable cells not adjacent to the current one
        cell.classList.add('disabled'); // Disable the current cell too, to prevent re-clicking
        showMessage("", ""); // Clear message
    }

    function isAdjacent(r1, c1, r2, c2) {
        const rowDiff = Math.abs(r1 - r2);
        const colDiff = Math.abs(c1 - c2);
        // Adjacent if diffs are 0 or 1, but not both 0 (same cell)
        return rowDiff <= 1 && colDiff <= 1 && (rowDiff !== 0 || colDiff !== 0);
    }

    function disableNonNeighbors(currentRow, currentCol) {
        document.querySelectorAll('.grid-cell').forEach(cell => {
            const r = parseInt(cell.dataset.row);
            const c = parseInt(cell.dataset.col);
            if (!isAdjacent(currentRow, currentCol, r, c) && !cell.classList.contains('selected')) {
                cell.classList.add('disabled');
            } else {
                // If it's a neighbor and not selected, ensure it's enabled
                if (!cell.classList.contains('selected')) {
                    cell.classList.remove('disabled');
                }
            }
        });
    }
    
    function enableNeighbors(lastRow, lastCol) {
        document.querySelectorAll('.grid-cell').forEach(cellElem => {
            if (cellElem.classList.contains('selected')) return; // Skip already selected
            const r = parseInt(cellElem.dataset.row);
            const c = parseInt(cellElem.dataset.col);
            if (isAdjacent(lastRow, lastCol, r, c)) {
                cellElem.classList.remove('disabled');
            } else {
                cellElem.classList.add('disabled');
            }
        });
    }

    function enableAllCells() {
        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.classList.remove('disabled');
            cell.classList.remove('selected');
        });
    }

    function updateCurrentWordDisplay() {
        currentWordDisplay.textContent = currentWord;
    }

    function clearSelection() {
        currentPath.forEach(p => p.element.classList.remove('selected'));
        currentPath = [];
        currentWord = "";
        updateCurrentWordDisplay();
        enableAllCells();
        showMessage("", "");
    }

    function handleSubmitWord() {
        if (currentWord.length < MIN_WORD_LENGTH) {
            showMessage(`Word must be at least ${MIN_WORD_LENGTH} letters long.`, "error");
            return;
        }

        if (!WORD_LIST.has(currentWord.toUpperCase())) {
            showMessage(`"${currentWord}" is not in the music word list.`, "error");
            clearSelection(); // Clear if invalid word
            return;
        }

        const currentPlayerWords = (currentPlayer === 1) ? foundWords.player1 : foundWords.player2;
        if (currentPlayerWords.has(currentWord.toUpperCase())) {
            showMessage(`"${currentWord}" already found by Player ${currentPlayer}.`, "error");
            clearSelection();
            return;
        }

        // Valid word found
        const points = calculateScore(currentWord);
        scores[`player${currentPlayer}`] += points;
        currentPlayerWords.add(currentWord.toUpperCase());

        showMessage(`Player ${currentPlayer} found "${currentWord}" for ${points} points!`, "success");
        updateScoreBoard();
        updateFoundWordsDisplay();
        clearSelection();

        if (numPlayers === 2) {
            switchPlayer();
        }
    }

    function calculateScore(word) {
        // Simple scoring: 1 point per letter for words >= MIN_WORD_LENGTH
        // Boggle scoring: 3-4 letters: 1 pt, 5: 2, 6: 3, 7: 5, 8+: 11
        if (word.length <= 4) return 1;
        if (word.length === 5) return 2;
        if (word.length === 6) return 3;
        if (word.length === 7) return 5;
        return 11; // 8+ letters
    }

    function updateFoundWordsDisplay() {
        p1WordListUl.innerHTML = '';
        foundWords.player1.forEach(word => {
            const li = document.createElement('li');
            li.textContent = word;
            p1WordListUl.appendChild(li);
        });

        if (numPlayers === 2) {
            p2WordListUl.innerHTML = '';
            foundWords.player2.forEach(word => {
                const li = document.createElement('li');
                li.textContent = word;
                p2WordListUl.appendChild(li);
            });
        }
    }

    function switchPlayer() {
        currentPlayer = (currentPlayer === 1) ? 2 : 1;
        currentPlayerNumberSpan.textContent = currentPlayer;
        showMessage(`Player ${currentPlayer}'s turn.`, "");
    }

    function showMessage(msg, type = "") { // type can be "success" or "error"
        messageArea.textContent = msg;
        messageArea.className = 'message-area'; // Reset classes
        if (type) {
            messageArea.classList.add(`message-${type}`);
        }
        // Clear message after a few seconds
        setTimeout(() => {
             if(messageArea.textContent === msg) messageArea.textContent = '';
             messageArea.className = 'message-area';
        }, 3000);
    }
    
    function startGame() {
        numPlayers = parseInt(playerCountSelect.value);
        setupScreen.style.display = 'none';
        gameScreen.style.display = 'block';
        
        initializeGame();
    }

    function initializeGame() {
        generateGrid();
        initializeScores();
        renderGrid();
        clearSelection(); // also enables all cells
        currentPlayer = 1;
        currentPlayerNumberSpan.textContent = currentPlayer;
        if (numPlayers === 1) {
             showMessage("Game Started! Find as many music words as you can.", "");
        } else {
            showMessage(`Player ${currentPlayer}'s turn.`, "");
        }
    }
    
    // Event Listeners
    startGameBtn.addEventListener('click', startGame);
    submitWordBtn.addEventListener('click', handleSubmitWord);
    clearSelectionBtn.addEventListener('click', clearSelection);
    restartGameBtn.addEventListener('click', () => {
        // Reset game state and show setup screen again
        gameScreen.style.display = 'none';
        setupScreen.style.display = 'block';
        // Optionally, you could directly re-initialize without going to setup
        // initializeGame();
        // For full restart:
        currentPath = [];
        currentWord = "";
        grid = [];
        foundWords = {};
        scores = {};
        messageArea.textContent = "";
        p1WordListUl.innerHTML = "";
        p2WordListUl.innerHTML = "";
        currentWordDisplay.textContent = "";
    });

});
