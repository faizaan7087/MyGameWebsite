const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreList = document.getElementById('score-list');

// --- INITIALIZE SUPABASE ---
// Add your actual Supabase URL and Anon Key below
const SUPABASE_URL = 'https://fzxgtneqlqdcphkezaps.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6eGd0bmVxbHFkY3Boa2V6YXBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NDAzMDQsImV4cCI6MjA3NDExNjMwNH0.oR-0AXdWwNLAgTIBQCe_9ss0Q_mTL0N9nR33D0_vHSo';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Game Constants & Variables ---
const BIRD_WIDTH = 34;
const BIRD_HEIGHT = 24;
const PIPE_WIDTH = 52;
const GRAVITY = 1200; // Was 0.4, now pixels per second squared
const LIFT = -400;    // Was -7, now pixels per second
const PIPE_GAP = 150;
const PIPE_SPEED = 180; // Was 2, now pixels per second



let bird = {
    x: 50,
    y: 150,
    width: BIRD_WIDTH,
    height: BIRD_HEIGHT,
    velocity: 0
};

let pipes = [];
let score = 0;
let frameCount = 0;
let gameOver = false;
let gameStarted = false;
let lastTime = 0
let timeToNextPipe = 0;

// --- Image Loading ---
const birdImg = new Image();
const bgImg = new Image();
const topPipeImg = new Image();
const bottomPipeImg = new Image();

birdImg.src = 'images/bird.png';
bgImg.src = 'images/bg.png';
topPipeImg.src = 'images/pipedown.png';
bottomPipeImg.src = 'images/pipeup.png';


// --- Game Functions ---

// Main game loop
// NEW gameLoop function
function gameLoop(currentTime) {
    if (gameOver) {
        displayGameOver();
        return;
    }

    // Calculate delta time
    if (lastTime === 0) {
        lastTime = currentTime;
    }
    const deltaTime = (currentTime - lastTime) / 1000; // Time in seconds
    lastTime = currentTime;

    update(deltaTime); // Pass deltaTime to the update function
    draw(deltaTime);
    requestAnimationFrame(gameLoop);
}

// Updates game state
// Reworked update function
function update(deltaTime) {
    // Bird movement
    bird.velocity += GRAVITY * deltaTime;
    bird.y += bird.velocity * deltaTime;

    // (The rest of the update function logic for pipes remains the same)
    frameCount++;
    // Inside the update(deltaTime) function...
    timeToNextPipe -= deltaTime; // Subtract the time since last frame

    if (timeToNextPipe <= 0) {
        // Reset the timer for the next pipe
        const pipeInterval = 1.5; // Seconds between pipes. Adjust for difficulty!
        timeToNextPipe = pipeInterval;

        // The rest of your pipe creation logic goes here
        const minHeight = 60;
        const availableSpace = canvas.height - PIPE_GAP - (minHeight * 2);
        const topPipeHeight = Math.floor(Math.random() * availableSpace) + minHeight;
        const bottomPipeY = topPipeHeight + PIPE_GAP;

        pipes.push({ // Top pipe
            x: canvas.width,
            y: 0,
            width: PIPE_WIDTH,
            height: topPipeHeight,
            passed: false
        });
        pipes.push({ // Bottom pipe
            x: canvas.width,
            y: bottomPipeY,
            width: PIPE_WIDTH,
            height: canvas.height - bottomPipeY,
            passed: false
        });
    }

    // Move pipes using deltaTime
    pipes.forEach(pipe => {
        pipe.x -= PIPE_SPEED * deltaTime;
    });

    // (The rest of the update function logic remains the same)
    pipes = pipes.filter(pipe => pipe.x + pipe.width > 0);
    checkCollisions();
    const firstPipe = pipes.find(pipe => !pipe.passed);
    if (firstPipe && firstPipe.x + firstPipe.width < bird.x) {
        score++;
        // Mark both parts of the pipe as passed
        const pipeIndex = pipes.indexOf(firstPipe);
        pipes[pipeIndex].passed = true;
        if(pipeIndex % 2 === 0) {
           pipes[pipeIndex + 1].passed = true;
        } else {
           pipes[pipeIndex - 1].passed = true;
        }
    }
}


// Renders everything to the canvas
function draw(deltaTime) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

    // Pipes
    for (let i = 0; i < pipes.length; i += 2) {
        ctx.drawImage(topPipeImg, pipes[i].x, pipes[i].y, pipes[i].width, pipes[i].height);
        ctx.drawImage(bottomPipeImg, pipes[i+1].x, pipes[i+1].y, pipes[i+1].width, pipes[i+1].height);
    }
    
    // Bird
    ctx.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);

    // Score
    ctx.fillStyle = 'white';
    ctx.font = '30px "Press Start 2P", cursive';
    ctx.fillText(score, canvas.width / 2 - 15, 50);

    const fps = Math.round(1 / deltaTime);

    // Set text style
    ctx.fillStyle = 'black';
    ctx.font = '18px Arial';
    ctx.textAlign = 'left';
    
    // Display the debug info
    ctx.fillText(`FPS: ${fps}`, 10, 25);
    ctx.fillText(`dT: ${deltaTime.toFixed(5)}`, 10, 50); // Show deltaTime with 5 decimal places
}

function checkCollisions() {
    // Ground and ceiling collision
    if (bird.y + bird.height > canvas.height || bird.y < 0) {
        endGame();
    }

    // Pipe collision
    for (let i = 0; i < pipes.length; i++) {
        if (
            bird.x < pipes[i].x + pipes[i].width &&
            bird.x + bird.width > pipes[i].x &&
            bird.y < pipes[i].y + pipes[i].height &&
            bird.y + bird.height > pipes[i].y
        ) {
            endGame();
        }
    }
}

function flap() {
    if (!gameStarted) {
        gameStarted = true;
        lastTime = 0; // Reset lastTime on game start
        requestAnimationFrame(gameLoop); // Start the new game loop
    }
    if (!gameOver) {
        bird.velocity = LIFT; // Use the new "per second" LIFT value
    }
}

function endGame() {
    if (gameOver) return; // Prevents it from running multiple times
    gameOver = true;
    saveScoreAndRefreshLeaderboard();
}

function resetGame() {
    bird.y = 150;
    bird.velocity = 0;
    pipes = [];
    score = 0;
    frameCount = 0;
    timeToNextPipe = 0;
    gameOver = false;
    gameStarted = false;
    drawStartScreen();
}

function displayGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 40);
    ctx.font = '20px Arial';
    ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2);
    ctx.fillText('Click to Restart', canvas.width / 2, canvas.height / 2 + 40);
    ctx.textAlign = 'start'; // Reset alignment
}

function drawStartScreen() {
     ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
     ctx.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);
     ctx.fillStyle = 'white';
     ctx.font = '24px Arial';
     ctx.textAlign = 'center';
     ctx.fillText('Click to Start', canvas.width / 2, canvas.height / 2);
     ctx.textAlign = 'start';
}

// --- Leaderboard ---
// !! THIS IS WHERE YOU'LL INTEGRATE YOUR DATABASE !!

// --- SUPABASE LEADERBOARD FUNCTIONS ---

// This function saves the player's score and then refreshes the leaderboard
async function saveScoreAndRefreshLeaderboard() {
    const playerName = prompt(`Game Over! Your score is ${score}. Enter your name:`, "Player");
    if (!playerName) return; // Do nothing if the user cancels the prompt

    try {
        // Insert the new score into the 'scores' table
        const { error } = await supabase
            .from('scores')
            .insert([{ player_name: playerName, score: score }]);
        
        if (error) throw error; // If there's an error, jump to the catch block

        // After saving, fetch the new leaderboard data
        await fetchAndDisplayLeaderboard();

    } catch (error) {
        console.error('Error saving score:', error);
    }
}

// This function fetches and displays the top 5 scores from the database
async function fetchAndDisplayLeaderboard() {
    scoreList.innerHTML = '<li>Loading...</li>'; // Show a loading message

    try {
        const { data, error } = await supabase
            .from('scores')
            .select('player_name, score')
            .order('score', { ascending: false })
            .limit(5);

        if (error) throw error;

        // Clear the list and display the fetched scores
        scoreList.innerHTML = '';
        if (data.length === 0) {
            scoreList.innerHTML = '<li>No scores yet!</li>';
        } else {
            data.forEach(s => {
                const li = document.createElement('li');
                li.textContent = `${s.player_name} - ${s.score}`;
                scoreList.appendChild(li);
            });
        }
    } catch (error) {
        console.error('Error fetching scores:', error);
        scoreList.innerHTML = `<li>Error: Could not load scores.</li>`;
    }
}

// --- Event Listeners ---
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        flap();
    }
});

canvas.addEventListener('click', () => {
    if (gameOver) {
        resetGame();
    } else {
        flap();
    }
});


// --- Initial Game Start ---
// Wait for images to load before drawing the start screen
window.onload = () => {
    drawStartScreen();
    fetchAndDisplayLeaderboard(); // Fetch scores when the game loads
};