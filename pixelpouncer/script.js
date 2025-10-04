document.addEventListener('DOMContentLoaded', () => {

    // --- SUPABASE SETUP ---
    const supabaseUrl = 'https://fzxgtneqlqdcphkezaps.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6eGd0bmVxbHFkY3Boa2V6YXBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NDAzMDQsImV4cCI6MjA3NDExNjMwNH0.oR-0AXdWwNLAgTIBQCe_9ss0Q_mTL0N9nR33D0_vHSo';
    const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

    // --- DOM Elements ---
    const container = document.querySelector('.container');
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('score');
    const startScreen = document.getElementById('start-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const gameOverText = document.getElementById('game-over-text');
    const finalScoreEl = document.getElementById('final-score');
    const startButton = document.getElementById('start-button');
    const restartButton = document.getElementById('restart-button');
    const scoreForm = document.getElementById('score-form');
    const playerNameInput = document.getElementById('player-name');
    const leaderboardContainer = document.querySelector('.leaderboard-container');
    const leaderboardList = document.getElementById('leaderboard-list');

    // --- Game State ---
    let player, platforms, score, gameRunning, gameActive, countdownValue, countdownInterval;
    const gravity = 0.4;
    const isMobile = window.innerWidth <= 768;

    // --- Initialization ---
    function init() {
        player = {
            x: canvas.width / 2 - 20, y: canvas.height - 100,
            width: 40, height: 40,
            dx: 0, dy: 0,
            hasJetpack: false, jetpackTimer: 0
        };
        platforms = [];
        score = 0;
        scoreEl.textContent = `Score: 0`;

        // Create a safe platform to start on
        platforms.push({
            x: canvas.width / 2 - 50,
            y: canvas.height - 50,
            width: 100,
            type: 'normal'
        });

        // Create the rest of the initial platforms
        for (let i = 1; i < 7; i++) {
            platforms.push({
                x: Math.random() * (canvas.width - 70),
                y: canvas.height - 50 - (i * 70),
                width: 70,
                type: 'normal'
            });
        }
    }

    // --- Drawing Functions ---
    function drawPlayer() {
        ctx.fillStyle = 'green';
        ctx.fillRect(player.x, player.y, player.width, player.height);
        if (player.hasJetpack) {
            ctx.fillStyle = '#f6e05e'; // Yellow flame
            ctx.fillRect(player.x + player.width / 4, player.y + player.height, player.width / 2, 10);
        }
    }
    function drawPlatforms() {
        platforms.forEach(p => {
            if (p.type === 'normal') {
                ctx.fillStyle = 'white';
                ctx.fillRect(p.x, p.y, p.width, 15);
            } else if (p.type === 'breakable') {
                ctx.fillStyle = 'grey';
                ctx.fillRect(p.x, p.y, p.width, 15);
            } else if (p.type === 'spring') {
                ctx.fillStyle = 'white'; // Platform part
                ctx.fillRect(p.x, p.y, p.width, 15);
                ctx.fillStyle = 'brown'; // Spring part
                ctx.fillRect(p.x + p.width / 2 - 10, p.y - 15, 20, 15);
            } else if (p.type === 'jetpack') {
                ctx.fillStyle = 'white'; // Platform part
                ctx.fillRect(p.x, p.y, p.width, 15);
                ctx.fillStyle = 'orange'; // Jetpack part
                ctx.fillRect(p.x + p.width / 2 - 15, p.y - 30, 30, 30);
            }
        });
    }
    function drawCountdown() {
        if (countdownValue > 0) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "white";
            ctx.font = "60px 'Press Start 2P'";
            ctx.textAlign = "center";
            ctx.fillText(countdownValue, canvas.width / 2, canvas.height / 2);
        }
    }

    // --- Game Loop ---
    function update() {
        if (!gameRunning) return;

        if (gameActive) {
            // Player logic
            if (player.hasJetpack) {
                player.dy = -10;
                player.jetpackTimer--;
                if (player.jetpackTimer <= 0) player.hasJetpack = false;
            } else {
                player.dy += gravity;
            }
            player.x += player.dx;
            player.y += player.dy;

            // Screen wrapping
            if (player.x > canvas.width) player.x = -player.width;
            if (player.x + player.width < 0) player.x = canvas.width;

            // Camera scroll and scoring
            if (player.y < canvas.height / 2) {
                const scrollSpeed = -player.dy;
                if (scrollSpeed > 0) {
                    score += Math.floor(scrollSpeed);
                }
                platforms.forEach(p => p.y += scrollSpeed);
                player.y += scrollSpeed;
                scoreEl.textContent = `Score: ${Math.floor(score / 10)}`;
            }

            // Collision detection
            platforms.forEach(p => {
                if (player.dy > 0 && player.x < p.x + p.width && player.x + player.width > p.x && player.y + player.height > p.y && player.y + player.height < p.y + 20) {
                    if (p.type === 'spring') player.dy = -20;
                    else if (p.type === 'jetpack') { player.hasJetpack = true; player.jetpackTimer = 180; p.type = 'used'; }
                    else player.dy = -12;
                    if (p.type === 'breakable') p.type = 'used';
                }
            });

            // Platform management
            platforms = platforms.filter(p => p.y < canvas.height && p.type !== 'used');
            while (platforms.length < 10) {
                 const lastPlatform = platforms[0]; // Highest platform
                 const newY = lastPlatform.y - (70 + Math.random() * 20);
                 let type = 'normal';
                 const rand = Math.random();
                 if (rand > 0.95) type = 'jetpack';
                 else if (rand > 0.9) type = 'spring';
                 else if (rand > 0.8) type = 'breakable';
                 platforms.unshift({ x: Math.random() * (canvas.width - 70), y: newY, width: 70, type });
            }

            // Game over condition
            if (player.y > canvas.height) endGame();
        }

        // Drawing
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawPlatforms();
        drawPlayer();
        drawCountdown();

        requestAnimationFrame(update);
    }
    
    // --- Game Flow ---
    function startGame() {
        if (isMobile) {
            container.classList.remove('mobile-game-over');
        }
        init();
        gameRunning = true;
        gameActive = false;
        startScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';

        countdownValue = 3;
        if (countdownInterval) clearInterval(countdownInterval);
        countdownInterval = setInterval(() => {
            countdownValue--;
            if (countdownValue <= 0) {
                clearInterval(countdownInterval);
                gameActive = true;
            }
        }, 1000);

        update();
    }

    function endGame() {
        if (isMobile) {
             container.classList.add('mobile-game-over');
        } else {
            leaderboardContainer.style.display = 'block';
        }
        gameRunning = false;
        gameOverText.textContent = "Game Over";
        finalScoreEl.textContent = Math.floor(Math.max(0, score / 10));
        scoreForm.style.display = 'block';
        playerNameInput.value = '';
        gameOverScreen.style.display = 'flex';
    }

    // --- Controls ---
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') player.dx = 5;
        else if (e.key === 'ArrowLeft') player.dx = -5;
    });
    document.addEventListener('keyup', () => player.dx = 0);
    function handleMove(e) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX || e.touches[0].clientX;
        player.x = clientX - rect.left - player.width / 2;
    }
    canvas.addEventListener('touchmove', handleMove, { passive: false });
    canvas.addEventListener('mousemove', handleMove);

    // --- Leaderboard Functions ---
    async function fetchLeaderboard() {
        leaderboardList.innerHTML = '<li>Loading...</li>';
        const { data, error } = await supabaseClient.from('jumper_scores').select('*').order('score', { ascending: false }).limit(10);
        if (error) { console.error('Error fetching', error); return; }
        leaderboardList.innerHTML = '';
        if (data && data.length) data.forEach((entry, i) => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="rank">${i+1}.</span><span class="name">${entry.player_name}</span><span class="score">${entry.score}</span>`;
            leaderboardList.appendChild(li);
        });
        else {
            leaderboardList.innerHTML = '<li>No scores yet!</li>';
        }
    }

    async function handleScoreSubmit(e) {
        e.preventDefault();
        const playerName = playerNameInput.value.trim().toUpperCase();
        if (!playerName) return;
        const finalScore = Math.floor(Math.max(0, score / 10));
        await supabaseClient.from('jumper_scores').insert([{ player_name: playerName, score: finalScore }]);
        scoreForm.style.display = 'none';
        gameOverText.textContent = "Score Saved!";
        fetchLeaderboard();
    }

    // --- Initial Setup ---
    function main() {
        startButton.addEventListener('click', startGame);
        restartButton.addEventListener('click', startGame);
        scoreForm.addEventListener('submit', handleScoreSubmit);
        if (!isMobile) leaderboardContainer.style.display = 'block';
        
        init();
        fetchLeaderboard();
        // Initial draw on start screen
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawPlatforms();
        drawPlayer();
    }
    
    main();
});