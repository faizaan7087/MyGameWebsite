document.addEventListener('DOMContentLoaded', () => {

    // --- TODO: SUPABASE SETUP ---
    const supabaseUrl = 'https://fzxgtneqlqdcphkezaps.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6eGd0bmVxbHFkY3Boa2V6YXBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NDAzMDQsImV4cCI6MjA3NDExNjMwNH0.oR-0AXdWwNLAgTIBQCe_9ss0Q_mTL0N9nR33D0_vHSo';
    const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
    // -----------------------------

     // --- DOM Elements ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const playerScoreEl = document.getElementById('player-score');
    const aiScoreEl = document.getElementById('ai-score');
    const startScreen = document.getElementById('start-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const startButton = document.getElementById('start-button');
    const restartButton = document.getElementById('restart-button');
    const winnerText = document.getElementById('winner-text');
    const leaderboardList = document.getElementById('leaderboard-list');
    const scoreForm = document.getElementById('score-form');
    const playerNameInput = document.getElementById('player-name');
    
    // --- Game State ---
    const WINNING_SCORE = 5;
    const MAX_BALL_SPEED = 12; // NEW: A maximum speed for the ball
    let ball, player, ai;
    let gameRunning = false;
    let baseBallSpeed = 6;
    let touchY = null;
    let countdownValue = 0; // NEW: For the 3-2-1 countdown
    let countdownInterval;

    // --- Canvas Sizing ---
    function resizeCanvas() {
        const cssWidth = canvas.clientWidth;
        const cssHeight = canvas.clientHeight;
        canvas.width = cssWidth;
        canvas.height = cssHeight;
        if (!gameRunning) { initGameObjects(); render(); }
    }
    window.addEventListener('resize', resizeCanvas);
    
    // --- Game Initialization ---
    function initGameObjects() {
        baseBallSpeed = 6;
        ball = {
            x: canvas.width / 2, y: canvas.height / 2,
            radius: 8, speedX: baseBallSpeed, speedY: baseBallSpeed
        };
        player = {
            x: 10, y: (canvas.height - 100) / 2,
            width: 15, height: 100, score: 0
        };
        ai = {
            x: canvas.width - 25, y: (canvas.height - 100) / 2,
            width: 15, height: 100, score: 0
        };
    }

    // --- Drawing ---
    function drawCountdown() {
        if (countdownValue > 0) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "white";
            ctx.font = "60px 'Press Start 2P'";
            ctx.textAlign = "center";
            ctx.fillText(countdownValue, canvas.width / 2, canvas.height / 2);
        }
    }

    function render() {
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < canvas.height; i += 15) {
            ctx.fillStyle = "white";
            ctx.fillRect(canvas.width / 2 - 1, i, 2, 10);
        }
        ctx.fillStyle = "#4caf50";
        ctx.fillRect(player.x, player.y, player.width, player.height);
        ctx.fillStyle = "#f44336";
        ctx.fillRect(ai.x, ai.y, ai.width, ai.height);
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = "white";
        ctx.fill();

        // NEW: Draw the countdown if it's active
        drawCountdown();
    }
    
    // --- THE FAIR RESET FIX ---
    function startRoundWithCountdown() {
        ball.x = canvas.width / 2;
        ball.y = canvas.height / 2;
        
        // Keep the same speed, but reverse direction for the loser
        ball.speedX = -ball.speedX > 0 ? baseBallSpeed : -baseBallSpeed;
        ball.speedY = (Math.random() > 0.5 ? 1 : -1) * baseBallSpeed;
        
        countdownValue = 3;
        if (countdownInterval) clearInterval(countdownInterval);

        countdownInterval = setInterval(() => {
            countdownValue--;
            if (countdownValue <= 0) {
                clearInterval(countdownInterval);
                gameRunning = true; // Resume game logic
            }
        }, 1000); // 1 second interval
    }

    function update() {
        // Don't move anything if the countdown is active
        if (!gameRunning) return;

        ball.x += ball.speedX;
        ball.y += ball.speedY;

        if (ball.y - ball.radius < 0) { ball.y = ball.radius; ball.speedY = -ball.speedY; }
        else if (ball.y + ball.radius > canvas.height) { ball.y = canvas.height - ball.radius; ball.speedY = -ball.speedY; }
        
        ai.y += (ball.y - (ai.y + ai.height / 2)) * 0.1;
        ai.y = Math.max(0, Math.min(canvas.height - ai.height, ai.y));

        let currentPaddle = (ball.x < canvas.width / 2) ? player : ai;
        if (collision(ball, currentPaddle)) {
            let collidePoint = (ball.y - (currentPaddle.y + currentPaddle.height / 2)) / (currentPaddle.height / 2);
            let angleRad = (Math.PI / 4) * collidePoint;
            let direction = (ball.x < canvas.width / 2) ? 1 : -1;
            
            // Increase base speed but cap it
            baseBallSpeed = Math.min(MAX_BALL_SPEED, baseBallSpeed + 0.3);

            ball.speedX = direction * baseBallSpeed * Math.cos(angleRad);
            ball.speedY = baseBallSpeed * Math.sin(angleRad);
        }

        // Scoring logic
        if (ball.x - ball.radius < 0) { 
            ai.score++; 
            aiScoreEl.textContent = ai.score;
            gameRunning = false; // Pause the game
            startRoundWithCountdown(); // Start the countdown
        }
        else if (ball.x + ball.radius > canvas.width) { 
            player.score++; 
            playerScoreEl.textContent = player.score;
            gameRunning = false; // Pause the game
            startRoundWithCountdown(); // Start the countdown
        }
        
        if (player.score >= WINNING_SCORE || ai.score >= WINNING_SCORE) {
            endGame();
        }
    }
    
    function collision(b, p) {
        return b.x + b.radius > p.x && b.x - b.radius < p.x + p.width && b.y + b.radius > p.y && b.y - b.radius < p.y + p.height;
    }

    // --- Controls ---
    function movePaddleWithMouse(evt) {
        let rect = canvas.getBoundingClientRect();
        player.y = evt.clientY - rect.top - player.height / 2;
        clampPaddlePosition();
    }
    function handleTouchStart(evt) { if (evt.touches.length > 0) touchY = evt.touches[0].clientY; }
    function handleTouchMove(evt) {
        evt.preventDefault();
        if (touchY === null || evt.touches.length === 0) return;
        let newY = evt.touches[0].clientY;
        let deltaY = newY - touchY;
        touchY = newY;
        player.y += deltaY;
        clampPaddlePosition();
    }
    function handleTouchEnd() { touchY = null; }
    function clampPaddlePosition() {
        if (player.y < 0) player.y = 0;
        else if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;
    }
    canvas.addEventListener("mousemove", movePaddleWithMouse);
    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd);
    
    // --- Game Flow ---
    function gameLoop() {
        update();
        render();
        requestAnimationFrame(gameLoop);
    }

    function startGame() {
        resizeCanvas();
        initGameObjects();
        playerScoreEl.textContent = '0';
        aiScoreEl.textContent = '0';
        startScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';
        gameRunning = false; // Don't start immediately
        startRoundWithCountdown(); // Start with a countdown
        requestAnimationFrame(gameLoop);
    }

    function endGame() {
        gameRunning = false;
        if(countdownInterval) clearInterval(countdownInterval);
        const playerWon = player.score >= WINNING_SCORE;
        winnerText.textContent = playerWon ? "You Win!" : "AI Wins!";
        scoreForm.style.display = playerWon ? 'block' : 'none';
        gameOverScreen.style.display = 'flex';
    }

    // --- Leaderboard Functions ---
    async function fetchLeaderboard() {
        leaderboardList.innerHTML = '<li>Loading...</li>';
        const { data, error } = await supabaseClient.from('pong_scores').select('player_name, score').order('score', { ascending: false }).limit(10);
        if (error) { console.error('Error fetching scores:', error); leaderboardList.innerHTML = '<li>Error loading scores</li>'; return; }
        leaderboardList.innerHTML = '';
        if (data && data.length > 0) {
            data.forEach((entry, index) => {
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
        const submitScoreButton = document.getElementById('submit-score-button');
        submitScoreButton.disabled = true;
        const playerScore = player.score - ai.score;
        const { error } = await supabaseClient.from('pong_scores').insert([{ player_name: playerName, score: playerScore }]);
        if (error) {
            console.error('Error submitting score:', error);
            submitScoreButton.disabled = false;
        } else {
            scoreForm.style.display = 'none';
            await fetchLeaderboard();
        }
    }

    // --- Initial Setup ---
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', startGame);
    scoreForm.addEventListener('submit', handleScoreSubmit);
    
    resizeCanvas();
    fetchLeaderboard();
});