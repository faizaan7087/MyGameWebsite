document.addEventListener('DOMContentLoaded', () => {

    const supabaseUrl = 'https://fzxgtneqlqdcphkezaps.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6eGd0bmVxbHFkY3Boa2V6YXBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NDAzMDQsImV4cCI6MjA3NDExNjMwNH0.oR-0AXdWwNLAgTIBQCe_9ss0Q_mTL0N9nR33D0_vHSo';
    const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

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

    let paddle, ball, bricks;
    let score, lives, gameRunning, paused;
    let isMobile = window.innerWidth <= 850;

    const brickInfo = {
        rowCount: 6, columnCount: 7, height: 20, padding: 10, offsetTop: 50, offsetLeft: 30, width: 0
    };
    
    const lifeLostMessage = { text: "LIFE -1", alpha: 0 };

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
    function drawLifeLostMessage() {
        if (lifeLostMessage.alpha > 0) {
            ctx.font = `${canvas.width * 0.06}px 'Press Start 2P'`; // Font size is now responsive
            ctx.fillStyle = `rgba(255, 255, 255, ${lifeLostMessage.alpha})`;
            ctx.textAlign = "center";
            ctx.fillText(lifeLostMessage.text, canvas.width / 2, canvas.height / 2);
            lifeLostMessage.alpha -= 0.01;
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBricks();
        drawPaddle();
        drawBall();
        drawLifeLostMessage();
    }

    function resizeAndCalculateLayout() {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;

        brickInfo.width = (canvas.width - brickInfo.offsetLeft * 2 - brickInfo.padding * (brickInfo.columnCount - 1)) / brickInfo.columnCount;
        
        const newPaddleWidth = canvas.width * 0.2;
        const newBallRadius = Math.max(8, canvas.width * 0.02);

        if (paddle) paddle.width = newPaddleWidth;
        if (ball) ball.radius = newBallRadius;

        if (!gameRunning) {
            resetBallAndPaddle();
            createBricks();
            draw();
        }
    }

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
        
        if (ball.y + ball.radius > canvas.height) {
            lives--;
            livesEl.textContent = `Lives: ${lives}`;
            paused = true;
            lifeLostMessage.alpha = 1.0;

            if (lives <= 0) {
                endGame("Game Over");
            } else {
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
        let allBricksCleared = true;
        bricks.forEach(column => {
            column.forEach(brick => {
                if (brick.status === 1) {
                    allBricksCleared = false;
                    if (ball.x > brick.x && ball.x < brick.x + brickInfo.width && ball.y > brick.y && ball.y < brick.y + brickInfo.height) {
                        ball.dy *= -1;
                        brick.status = 0;
                        score++;
                        scoreEl.textContent = `Score: ${score}`;
                    }
                }
            });
        });
        if (allBricksCleared) endGame("You Win!");
    }

    function gameLoop() {
        if (!gameRunning) return;
        if (!paused) {
            movePaddle();
            moveBall();
            brickCollision();
        }
        draw();
        requestAnimationFrame(gameLoop);
    }
    
    function resetBallAndPaddle() {
        paddle = { 
            x: canvas.width / 2 - (canvas.width * 0.2) / 2, 
            y: canvas.height - 30, 
            width: canvas.width * 0.2, 
            height: 15, 
            speed: 8, 
            dx: 0 
        };
        ball = { 
            x: canvas.width / 2, 
            y: paddle.y - 15, 
            radius: Math.max(8, canvas.width * 0.02),
            dx: 4, 
            dy: -4 
        };
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
        resizeAndCalculateLayout();
        initializeGame();
        gameRunning = true;
        paused = false;
        lifeLostMessage.alpha = 0;
        startScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';
        gameLoop();
    }

    function endGame(message) {
        if (isMobile) leaderboardContainer.style.display = 'block';
        gameRunning = false;
        gameOverText.textContent = message;
        scoreForm.style.display = (message === "You Win!" || score > 0) ? 'block' : 'none';
        playerNameInput.value = '';
        gameOverScreen.style.display = 'flex';
    }

    document.addEventListener('keydown', (e) => {
        if (paddle) {
            if (e.key === 'ArrowRight') paddle.dx = paddle.speed;
            else if (e.key === 'ArrowLeft') paddle.dx = -paddle.speed;
        }
    });
    document.addEventListener('keyup', () => { if (paddle) paddle.dx = 0; });
    
    function handleMove(e) {
        if (paddle) {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const clientX = e.clientX || e.touches[0].clientX;
            paddle.x = clientX - rect.left - paddle.width / 2;
        }
    }
    canvas.addEventListener('touchmove', handleMove, { passive: false });
    canvas.addEventListener('mousemove', handleMove);

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
    
    function init() {
        startButton.addEventListener('click', startGame);
        restartButton.addEventListener('click', startGame);
        scoreForm.addEventListener('submit', handleScoreSubmit);
        
        window.addEventListener('resize', resizeAndCalculateLayout);

        resizeAndCalculateLayout();
        
        if (!isMobile) leaderboardContainer.style.display = 'block';
        fetchLeaderboard();
    }
    
    init();
});
