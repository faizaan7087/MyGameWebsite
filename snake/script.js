// This ensures our script runs only after the entire HTML page is loaded.
document.addEventListener('DOMContentLoaded', () => {

    // --- SUPABASE SETUP ---
    let supabaseClient;
    try {
        const { createClient } = supabase;
        const supabaseUrl = 'https://fzxgtneqlqdcphkezaps.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6eGd0bmVxbHFkY3Boa2V6YXBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NDAzMDQsImV4cCI6MjA3NDExNjMwNH0.oR-0AXdWwNLAgTIBQCe_9ss0Q_mTL0N9nR33D0_vHSo';
        supabaseClient = createClient(supabaseUrl, supabaseKey);
    } catch (e) {
        console.error("CRITICAL ERROR: Supabase library not found.", e);
        alert("CRITICAL ERROR: Cannot connect to database.");
        return;
    }
    // -----------------------------

    // --- DOM ELEMENT SELECTION ---
    const gameBoard = document.getElementById('game-board');
    const scoreDisplay = document.getElementById('score-display');
    const startScreen = document.getElementById('start-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const finalScoreDisplay = document.getElementById('final-score');
    const startButton = document.getElementById('start-button');
    const restartButton = document.getElementById('restart-button');
    const leaderboardList = document.getElementById('leaderboard-list');
    const scoreForm = document.getElementById('score-form');
    const playerNameInput = document.getElementById('player-name');
    const submitScoreButton = document.getElementById('submit-score-button');
    const upBtn = document.getElementById('up-btn');
    const downBtn = document.getElementById('down-btn');
    const leftBtn = document.getElementById('left-btn');
    const rightBtn = document.getElementById('right-btn');
    // NEW: Get the leaderboard container itself
    const leaderboardContainer = document.querySelector('.leaderboard-container');


    // --- GAME VARIABLES ---
    const gridSize = 20;
    let snake, food, direction, score, gameInterval, gameStarted;

    // --- GAME LOGIC ---
    function draw() {
        gameBoard.innerHTML = '';
        drawSnake();
        drawFood();
    }
    function drawSnake() {
        snake.forEach(segment => {
            const el = document.createElement('div');
            el.style.gridRowStart = segment.y;
            el.style.gridColumnStart = segment.x;
            el.classList.add('snake');
            gameBoard.appendChild(el);
        });
    }
    function drawFood() {
        const el = document.createElement('div');
        el.style.gridRowStart = food.y;
        el.style.gridColumnStart = food.x;
        el.classList.add('food');
        gameBoard.appendChild(el);
    }
    function generateFood() {
        food = { x: Math.floor(Math.random() * gridSize) + 1, y: Math.floor(Math.random() * gridSize) + 1 };
        while (snake.some(s => s.x === food.x && s.y === food.y)) {
            food = { x: Math.floor(Math.random() * gridSize) + 1, y: Math.floor(Math.random() * gridSize) + 1 };
        }
    }
    function move() {
        const head = { ...snake[0] };
        if (direction === 'up') head.y--;
        if (direction === 'down') head.y++;
        if (direction === 'left') head.x--;
        if (direction === 'right') head.x++;
        snake.unshift(head);
        if (head.x === food.x && head.y === food.y) {
            score++;
            scoreDisplay.textContent = `Score: ${score}`;
            generateFood();
        } else {
            snake.pop();
        }
    }
    function checkCollision() {
        const head = snake[0];
        if (head.x < 1 || head.x > gridSize || head.y < 1 || head.y > gridSize || snake.slice(1).some(s => s.x === head.x && s.y === head.y)) {
            endGame();
            return true;
        }
        return false;
    }
    function gameLoop() {
        if (!gameStarted) return;
        move();
        if (checkCollision()) return;
        draw();
    }

    // --- GAME FLOW (WITH LEADERBOARD VISIBILITY CHANGES) ---
    function startGame() {
        // NEW: Hide leaderboard when game starts
        leaderboardContainer.style.display = 'none';

        gameStarted = true;
        startScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';
        score = 0;
        scoreDisplay.textContent = `Score: 0`;
        snake = [{ x: 10, y: 10 }];
        direction = 'right';
        generateFood();
        if (gameInterval) clearInterval(gameInterval);
        gameInterval = setInterval(gameLoop, 150);
        draw();
    }

    function endGame() {
        // NEW: Show leaderboard when game ends
        leaderboardContainer.style.display = 'block';

        gameStarted = false;
        clearInterval(gameInterval);
        finalScoreDisplay.textContent = score;
        gameOverScreen.style.display = 'flex';
        scoreForm.style.display = 'block';
        submitScoreButton.disabled = false;
        playerNameInput.value = '';
    }

    // --- LEADERBOARD FUNCTIONS ---
    async function fetchLeaderboard() {
        leaderboardList.innerHTML = '<li>Loading...</li>';
        const { data, error } = await supabaseClient.from('snake_scores').select('player_name, score').order('score', { ascending: false }).limit(10);
        if (error) { console.error('Error fetching scores:', error); leaderboardList.innerHTML = '<li>Error loading scores</li>'; return; }
        const scores = data;
        leaderboardList.innerHTML = '';
        if (scores && scores.length > 0) {
            scores.forEach((entry, index) => {
                const li = document.createElement('li');
                li.innerHTML = `<span class="rank">${index + 1}.</span><span class="name">${entry.player_name}</span><span class="score">${entry.score}</span>`;
                leaderboardList.appendChild(li);
            });
        } else {
            leaderboardList.innerHTML = '<li>Be the first to score!</li>';
        }
    }

    async function handleScoreSubmit(event) {
        event.preventDefault();
        const playerName = playerNameInput.value.trim().toUpperCase();
        if (!playerName) return alert('Please enter a name!');
        if (score <= 0) return alert('Score must be greater than 0!');
        submitScoreButton.disabled = true;
        const { error } = await supabaseClient.from('snake_scores').insert([{ player_name: playerName, score: score }]);
        if (error) { console.error('Error submitting score:', error); submitScoreButton.disabled = false; }
        else { scoreForm.style.display = 'none'; await fetchLeaderboard(); }
    }

    // --- CONTROL LOGIC ---
    function changeDirection(newDirection) {
        if (!gameStarted) return;
        const isReversing = (newDirection === 'up' && direction === 'down') || (newDirection === 'down' && direction === 'up') || (newDirection === 'left' && direction === 'right') || (newDirection === 'right' && direction === 'left');
        if (!isReversing) {
            direction = newDirection;
        }
    }

    // --- EVENT LISTENERS ---
    document.addEventListener('keydown', (event) => {
        const keyMap = { 'ArrowUp': 'up', 'ArrowDown': 'down', 'ArrowLeft': 'left', 'ArrowRight': 'right' };
        const newDirection = keyMap[event.key];
        if (newDirection) changeDirection(newDirection);
    });

    upBtn.addEventListener('click', () => changeDirection('up'));
    downBtn.addEventListener('click', () => changeDirection('down'));
    leftBtn.addEventListener('click', () => changeDirection('left'));
    rightBtn.addEventListener('click', () => changeDirection('right'));
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', startGame);
    scoreForm.addEventListener('submit', handleScoreSubmit);

    // --- INITIAL LOAD ---
    // NEW: Show leaderboard on initial page load
    leaderboardContainer.style.display = 'block';
    fetchLeaderboard();
});
