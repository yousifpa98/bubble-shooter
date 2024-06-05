// Get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game variables
let bubbles = [];
let playerBubble = null;
let mouseX = canvas.width / 2;
let mouseY = canvas.height - 30;
const colors = ['blue', 'green', 'red', 'pink', 'yellow', 'orange'];
const bubbleRadius = 20;
const bubbleDiameter = bubbleRadius * 2;
const rows = 20;
const cols = Math.floor(canvas.width / bubbleDiameter);
let grid = Array.from({ length: rows }, () => Array(cols).fill(null));
let shotsFired = 0;
const maxShotsWithoutBurst = 5;

// Bubble class
class Bubble {
    constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.dx = 0;
        this.dy = 0;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }

    move() {
        this.x += this.dx;
        this.y += this.dy;

        // Handle bouncing off the sides
        if (this.x - this.radius < 0 || this.x + this.radius > canvas.width) {
            this.dx = -this.dx;
        }
    }
}

// Initialize game
function init() {
    createInitialBubbles();
    createPlayerBubble();
    setupEventListeners();
    requestAnimationFrame(gameLoop);
}

// Create initial bubbles
function createInitialBubbles() {
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < cols; col++) {
            let x = col * bubbleDiameter + bubbleRadius;
            let y = row * (bubbleRadius * Math.sqrt(3)) + bubbleRadius;
            if (row % 2 !== 0) x += bubbleRadius;
            let color = colors[Math.floor(Math.random() * colors.length)];
            let bubble = new Bubble(x, y, bubbleRadius, color);
            bubbles.push(bubble);
            grid[row][col] = bubble;
        }
    }
}

// Create player bubble
function createPlayerBubble() {
    playerBubble = new Bubble(canvas.width / 2, canvas.height - 30, bubbleRadius, getRandomColor());
}

// Setup event listeners for player controls
function setupEventListeners() {
    canvas.addEventListener('mousemove', trackMouse);
    canvas.addEventListener('click', shootBubble);
}

// Track mouse movement
function trackMouse(event) {
    let rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
}

// Shoot player bubble on click
function shootBubble() {
    if (playerBubble.dy === 0 && playerBubble.dx === 0) {
        let angle = Math.atan2(mouseY - playerBubble.y, mouseX - playerBubble.x);
        playerBubble.dx = Math.cos(angle) * 20;
        playerBubble.dy = Math.sin(angle) * 20;
    }
}

// Game loop
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// Update game state
function update() {
    playerBubble.move();
    checkCollisions();
    checkLoseCondition();
}

// Check for collisions and snap into position
function checkCollisions() {
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            let bubble = grid[row][col];
            if (bubble) {
                let dx = bubble.x - playerBubble.x;
                let dy = bubble.y - playerBubble.y;
                let distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < bubbleDiameter) {
                    // Snap player bubble into the nearest grid position
                    snapBubble(row, col);
                    return;
                }
            }
        }

        // Check if player bubble hits the top
        if (playerBubble.y - playerBubble.radius <= 0) {
            playerBubble.dy = 0;
            playerBubble.y = canvas.height - 30;
            playerBubble.x = canvas.width / 2;
        }
    }
}

// Snap the player bubble to the nearest grid position and handle bursting
function snapBubble(row, col) {
    let snapRow, snapCol;
    if (row % 2 === 0) {
        snapRow = Math.round(playerBubble.y / (bubbleRadius * Math.sqrt(3)));
        snapCol = Math.round((playerBubble.x - bubbleRadius) / bubbleDiameter);
    } else {
        snapRow = Math.round(playerBubble.y / (bubbleRadius * Math.sqrt(3)));
        snapCol = Math.round((playerBubble.x - bubbleRadius - bubbleRadius) / bubbleDiameter);
    }

    let snapX = snapCol * bubbleDiameter + bubbleRadius;
    let snapY = snapRow * (bubbleRadius * Math.sqrt(3)) + bubbleRadius;
    if (snapRow % 2 !== 0) snapX += bubbleRadius;

    playerBubble.x = snapX;
    playerBubble.y = snapY;
    playerBubble.dx = 0;
    playerBubble.dy = 0;

    let newBubble = new Bubble(snapX, snapY, bubbleRadius, playerBubble.color);
    grid[snapRow][snapCol] = newBubble;
    bubbles.push(newBubble);

    let matches = getMatchingBubbles(snapRow, snapCol, newBubble.color);
    if (matches.length >= 3) {
        burstBubbles(matches);
        removeFloatingBubbles();
        shotsFired = 0; // Reset the shot counter if bubbles are burst
    } else {
        shotsFired++;
        if (shotsFired >= maxShotsWithoutBurst) {
            addNewBubbleRow();
            shotsFired = 0;
        }
    }

    createPlayerBubble();
}

// Get all matching bubbles connected to a given bubble
function getMatchingBubbles(row, col, color, visited = {}) {
    let key = `${row},${col}`;
    if (visited[key] || row < 0 || row >= rows || col < 0 || col >= cols || !grid[row][col] || grid[row][col].color !== color) {
        return [];
    }

    visited[key] = true;
    let matches = [{ row, col }];
    let deltas = [
        [0, -1], [0, 1], [-1, 0], [1, 0], 
        [row % 2 === 0 ? -1 : 1, -1], [row % 2 === 0 ? -1 : 1, 1], 
        [row % 2 === 0 ? 1 : -1, -1], [row % 2 === 0 ? 1 : -1, 1]
    ];

    for (let [dr, dc] of deltas) {
        matches = matches.concat(getMatchingBubbles(row + dr, col + dc, color, visited));
    }
    return matches;
}

// Burst bubbles
function burstBubbles(matches) {
    for (let { row, col } of matches) {
        grid[row][col] = null;
    }
    bubbles = bubbles.filter(bubble => !matches.some(match => match.row === Math.round(bubble.y / (bubbleRadius * Math.sqrt(3))) && match.col === Math.round((bubble.x - (Math.round(bubble.y / (bubbleRadius * Math.sqrt(3))) % 2 === 0 ? 0 : bubbleRadius)) / bubbleDiameter)));
}

// Remove floating bubbles
function removeFloatingBubbles() {
    let visited = {};
    for (let col = 0; col < cols; col++) {
        if (grid[0][col]) getFloatingBubbles(0, col, visited);
    }

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if (grid[row][col] && !visited[`${row},${col}`]) grid[row][col] = null;
        }
    }
    bubbles = bubbles.filter(bubble => grid[Math.round(bubble.y / (bubbleRadius * Math.sqrt(3)))][Math.round((bubble.x - (Math.round(bubble.y / (bubbleRadius * Math.sqrt(3))) % 2 === 0 ? 0 : bubbleRadius)) / bubbleDiameter)] !== null);
}

// Get all bubbles connected to the top row
function getFloatingBubbles(row, col, visited) {
    let key = `${row},${col}`;
    if (visited[key] || row < 0 || row >= rows || col < 0 || col >= cols || !grid[row][col]) return;

    visited[key] = true;
    let deltas = [
        [0, -1], [0, 1], [-1, 0], [1, 0], 
        [row % 2 === 0 ? -1 : 1, -1], [row % 2 === 0 ? -1 : 1, 1], 
        [row % 2 === 0 ? 1 : -1, -1], [row % 2 === 0 ? 1 : -1, 1]
    ];

    for (let [dr, dc] of deltas) {
        getFloatingBubbles(row + dr, col + dc, visited);
    }
}

// Add new row of bubbles
function addNewBubbleRow() {
    for (let row = rows - 1; row > 0; row--) {
        for (let col = 0; col < cols; col++) {
            grid[row][col] = grid[row - 1][col];
            if (grid[row][col]) {
                grid[row][col].y += bubbleRadius * Math.sqrt(3);
            }
        }
    }
    for (let col = 0; col < cols; col++) {
        let x = col * bubbleDiameter + bubbleRadius;
        let y = bubbleRadius;
        let color = colors[Math.floor(Math.random() * colors.length)];
        let bubble = new Bubble(x, y, bubbleRadius, color);
        bubbles.push(bubble);
        grid[0][col] = bubble;
    }
}

// Check lose condition
function checkLoseCondition() {
    bubbles.forEach(bubble => {
        if (bubble.y + bubble.radius >= canvas.height) {
            alert('Game Over!');
            document.location.reload();
        }
    });
}

// Render game
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    bubbles.forEach(bubble => bubble.draw());
    playerBubble.draw();
    drawLineIndicator();
}

// Draw line indicator
function drawLineIndicator() {
    if (playerBubble.dx === 0 && playerBubble.dy === 0) {
        ctx.beginPath();
        ctx.moveTo(playerBubble.x, playerBubble.y);
        ctx.lineTo(mouseX, mouseY);
        ctx.strokeStyle = 'white';
        ctx.stroke();
        ctx.closePath();
    }
}

// Get a random color for the new player bubble
function getRandomColor() {
    return colors[Math.floor(Math.random() * colors.length)];
}

// Start the game
init();

