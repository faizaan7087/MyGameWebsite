document.addEventListener('DOMContentLoaded', () => {

    // --- TODO: SUPABASE SETUP ---
    // 1. Create a table in Supabase called 'breakout_scores'
    //    with 'player_name' (text) and 'score' (number)
    // 2. Add your Supabase URL and Key below
    const supabaseUrl = 'https://fzxgtneqlqdcphkezaps.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6eGd0bmVxbHFkY3Boa2V6YXBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NDAzMDQsImV4cCI6MjA3NDExNjMwNH0.oR-0AXdWwNLAgTIBQCe_9ss0Q_mTL0N9nR33D0_vHSo';
    const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
    // ----------------------------

    // --- DOM Elements ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('score');
    const livesEl = document.getElementById('lives');
    const startScreen = document.getElementById('start-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const gameOverText = document.getElementById('game-over-text');
    const startButton = document.getElementById('start-button');
    const restartButton = document.getElementById('restart-button');
    const scoreForm = document.getElementById('score-form');
    const playerNameInput = document.getElementById('player-name');
    const leaderboardContainer = document.querySelector('.leaderboard-container');
    const leaderboardList = document.getElementById('leaderboard-list');

    // --- Game Objects & State ---
    let paddle, ball, bricks;
    let score = 0, lives = 3, gameRunning = false, paused = false; // NEW 'paused' state
    const isMobile = window.innerWidth <= 850;

    const brickInfo = {
        rowCount: 6, columnCount: 7, height: 20, padding: 10, offsetTop: 50, offsetLeft: 30
    };
    brickInfo.width = (480 - brickInfo.offsetLeft * 2 - brickInfo.padding * (brickInfo.columnCount - 1)) / brickInfo.columnCount;
    
    // NEW: Object to manage the "Life -1" message
    const lifeLostMessage = {
        text: "LIFE -1",
        alpha: 0
    };

    // --- Drawing Functions ---
    function drawPaddle() { if(paddle) { ctx.fillStyle = '#4caf50'; ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height); }}
    function drawBall() { if(ball) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2); ctx.fill(); }}
    function drawBricks() {
        if (!bricks) return;
        bricks.forEach(column => {
            column.forEach(brick => {
                if (brick.status === 1) {
                    ctx.fillStyle = '#f44336';
                    ctx.fillRect(brick.x, brick.y, brickInfo.width, brickInfo.height);
                }
            });
        });
    }
    // NEW: Function to draw the flashing message
    function drawLifeLostMessage() {
        if (lifeLostMessage.alpha > 0) {
            ctx.font = "30px 'Press Start 2P'";
            ctx.fillStyle = `rgba(255, 255, 255, ${lifeLostMessage.alpha})`;
            ctx.textAlign = "center";
            ctx.fillText(lifeLostMessage.text, canvas.width / 2, canvas.height / 2);
            lifeLostMessage.alpha -= 0.01; // Fade out effect
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBricks();
        drawPaddle();
        drawBall();
        // NEW: Draw the message on top of everything
        drawLifeLostMessage();
    }
    
    // --- Game Logic ---
    function createBricks() {
        bricks = [];
        for (let c = 0; c < brickInfo.columnCount; c++) {
            bricks[c] = [];
            for (let r = 0; r < brickInfo.rowCount; r++) {
                const x = c * (brickInfo.width + brickInfo.padding) + brickInfo.offsetLeft;
                const y = r * (brickInfo.height + brickInfo.padding) + brickInfo.offsetTop;
                bricks[c][r] = { x, y, status: 1 };
            }
        }
    }

    function movePaddle() {
        paddle.x += paddle.dx;
        if (paddle.x < 0) paddle.x = 0;
        if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width;
    }

    function moveBall() {
        ball.x += ball.dx;
        ball.y += ball.dy;
        if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) ball.dx *= -1;
        if (ball.y - ball.radius < 0) ball.dy *= -1;
        
        // --- THE FIX IS HERE ---
        if (ball.y + ball.radius > canvas.height) {
            lives--;
            livesEl.textContent = `Lives: ${lives}`;
            paused = true; // Pause the game
            lifeLostMessage.alpha = 1.0; // Make the message visible

            if (lives <= 0) {
                endGame("Game Over");
            } else {
                // After 1.5 seconds, reset the ball and unpause
                setTimeout(() => {
                    resetBallAndPaddle();
                    paused = false;
                }, 1500);
            }
        }
        if (ball.y + ball.radius > paddle.y && ball.x > paddle.x && ball.x < paddle.x + paddle.width) {
            ball.dy = -Math.abs(ball.dy);
        }
    }

    function brickCollision() {
        bricks.forEach(column => {
            column.forEach(brick => {
                if (brick.status === 1 && ball.x > brick.x && ball.x < brick.x + brickInfo.width && ball.y > brick.y && ball.y < brick.y + brickInfo.height) {
                    ball.dy *= -1;
                    brick.status = 0;
                    score++;
                    scoreEl.textContent = `Score: ${score}`;
                    if (score === brickInfo.rowCount * brickInfo.columnCount) endGame("You Win!");
                }
            });
        });
    }

    function gameLoop() {
        if (!gameRunning) return;
        
        // Only update game logic if not paused
        if (!paused) {
            movePaddle();
            moveBall();
            brickCollision();
        }
        
        draw();
        requestAnimationFrame(gameLoop);
    }
    
    // --- Game Flow ---
    function resetBallAndPaddle() {
        paddle = { x: canvas.width / 2 - 50, y: canvas.height - 30, width: 100, height: 15, speed: 8, dx: 0 };
        ball = { x: canvas.width / 2, y: paddle.y - 15, radius: 10, dx: 4, dy: -4 };
    }

    function initializeGame() {
        score = 0;
        lives = 3;
        scoreEl.textContent = `Score: 0`;
        livesEl.textContent = `Lives: 3`;
        createBricks();
        resetBallAndPaddle();
    }

    function startGame() {
        if (isMobile) leaderboardContainer.style.display = 'none';
        initializeGame();
        gameRunning = true;
        paused = false;
        lifeLostMessage.alpha = 0;
        startScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';
        gameLoop();
    }

    function endGame(message) {
        leaderboardContainer.style.display = 'block';
        gameRunning = false;
        gameOverText.textContent = message;
        scoreForm.style.display = (message === "You Win!" || score > 0) ? 'block' : 'none';
        playerNameInput.value = '';
        gameOverScreen.style.display = 'flex';
    }

    // --- Controls ---
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') paddle.dx = paddle.speed;
        else if (e.key === 'ArrowLeft') paddle.dx = -paddle.speed;
    });
    document.addEventListener('keyup', () => paddle.dx = 0);
    
    function handleMove(e) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX || e.touches[0].clientX;
        paddle.x = clientX - rect.left - paddle.width / 2;
    }
    canvas.addEventListener('touchmove', handleMove, { passive: false });
    canvas.addEventListener('mousemove', handleMove);

    // --- Leaderboard Functions ---
    async function fetchLeaderboard() {
        leaderboardList.innerHTML = '<li>Loading...</li>';
        const { data, error } = await supabaseClient.from('breakout_scores').select('*').order('score', { ascending: false }).limit(10);
        if (error) { console.error('Error fetching scores', error); leaderboardList.innerHTML = '<li>Error</li>'; return; }
        leaderboardList.innerHTML = '';
        if (data && data.length > 0) {
            data.forEach((entry, i) => {
                const li = document.createElement('li');
                li.innerHTML = `<span class="rank">${i+1}.</span> <span class="name">${entry.player_name}</span> <span class="score">${entry.score}</span>`;
                leaderboardList.appendChild(li);
            });
        } else {
            leaderboardList.innerHTML = '<li>Be the first!</li>';
        }
    }

    async function handleScoreSubmit(e) {
        e.preventDefault();
        const playerName = playerNameInput.value.trim().toUpperCase();
        if (!playerName) return;
        const { error } = await supabaseClient.from('breakout_scores').insert([{ player_name: playerName, score: score }]);
        if (error) console.error('Error submitting score', error);
        else {
            scoreForm.style.display = 'none';
            fetchLeaderboard();
        }
    }

    // --- INITIAL SETUP ---
    function init() {
        // Set canvas size based on CSS
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;

        startButton.addEventListener('click', startGame);
        restartButton.addEventListener('click', startGame);
        scoreForm.addEventListener('submit', handleScoreSubmit);
        
        window.addEventListener('resize', () => {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
            if(!gameRunning) draw();
        });

        initializeGame();
        if (!isMobile) leaderboardContainer.style.display = 'block';
        
        fetchLeaderboard();
        draw(); // Draw the initial state of the game
    }
    
    init();
});