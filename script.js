const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let particlesArray = [];
// Variable to store available screen data
let cachedCoordinates = {
    horse: [],
    whale: [],
    eagle: [],
    tiger: []
};
let currentShape = 'horse';

// Handle mouse
const mouse = {
    x: null,
    y: null,
    radius: 100
}

window.addEventListener('mousemove', function (event) {
    mouse.x = event.x;
    mouse.y = event.y;
});

window.addEventListener('mouseout', function () {
    mouse.x = undefined;
    mouse.y = undefined;
});

class Particle {
    constructor(x, y, color) {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.baseX = x;
        this.baseY = y;
        this.size = 2;
        this.density = (Math.random() * 30) + 1;
        this.color = color || 'white';
        this.baseColor = color || 'white';
        // Random breathing offsets
        this.angleX = Math.random() * Math.PI * 2;
        this.angleY = Math.random() * Math.PI * 2;
        this.velocity = Math.random() * 0.05 + 0.02;
    }

    // Method to update target position
    morph(x, y, color) {
        this.baseX = x;
        this.baseY = y;
        this.color = color;
        this.baseColor = color;
    }

    draw() {
        if (this.size > 0) {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fill();
        }
    }

    update() {
        let dx = mouse.x - this.x;
        let dy = mouse.y - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        let forceDirectionX = dx / distance;
        let forceDirectionY = dy / distance;
        let maxDistance = mouse.radius;
        let force = (maxDistance - distance) / maxDistance;
        let directionX = forceDirectionX * force * this.density;
        let directionY = forceDirectionY * force * this.density;

        if (distance < mouse.radius) {
            this.x -= directionX;
            this.y -= directionY;

            // Change color on hover
            // Calculate a hue based on position for a rainbow effect
            const hue = (this.x + this.y) % 360;
            this.color = 'hsl(' + hue + ', 100%, 60%)';
        } else {
            if (this.color !== this.baseColor) {
                this.color = this.baseColor;
            }

            // Breathing effect
            const time = Date.now() * 0.002;
            const floatX = Math.sin(time + this.baseY * 0.01 + this.angleX) * 2;
            const floatY = Math.cos(time + this.baseX * 0.01 + this.angleY) * 2;

            const targetX = this.baseX + floatX;
            const targetY = this.baseY + floatY;

            const dx = targetX - this.x;
            const dy = targetY - this.y;

            this.x += dx / 10;
            this.y += dy / 10;
        }
    }
}

// Helper to scan text and return coordinates
function scanImage(text) {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const fontSize = Math.min(canvas.width, canvas.height) * 0.5; // Slightly smaller to ensure fit
    ctx.font = '' + fontSize + 'px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw text
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const textCoordinates = ctx.getImageData(0, 0, canvas.width, canvas.height);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let coordinates = [];
    const step = 6; // Optimization: larger step = fewer particles, faster performance

    for (let y = 0; y < textCoordinates.height; y += step) {
        for (let x = 0; x < textCoordinates.width; x += step) {
            const index = (y * textCoordinates.width + x) * 4;
            const alpha = textCoordinates.data[index + 3];
            if (alpha > 128) {
                const r = textCoordinates.data[index];
                const g = textCoordinates.data[index + 1];
                const b = textCoordinates.data[index + 2];
                const color = 'rgb(' + r + ',' + g + ',' + b + ')';
                coordinates.push({ x, y, color });
            }
        }
    }

    // Shuffle coordinates for cool morphing effect (less scanline-y)
    for (let i = coordinates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [coordinates[i], coordinates[j]] = [coordinates[j], coordinates[i]];
    }

    return coordinates;
}

function init() {
    particlesArray = [];

    // 1. Scan and cache all shapes
    cachedCoordinates.horse = scanImage('🐎');
    cachedCoordinates.whale = scanImage('🐋');
    cachedCoordinates.eagle = scanImage('🦅');
    cachedCoordinates.tiger = scanImage('🐅');

    // 2. Initialize with current shape state or default to horse
    applyShape(currentShape);
}

function applyShape(shapeName) {
    const targetCoords = cachedCoordinates[shapeName];
    if (!targetCoords) return;

    currentShape = shapeName;

    // Morph existing particles
    // Loop through the MAX length of (particles, targets)

    const loops = Math.max(particlesArray.length, targetCoords.length);

    for (let i = 0; i < loops; i++) {
        if (i < targetCoords.length) {
            // We have a target position for this index
            const target = targetCoords[i];

            if (i < particlesArray.length) {
                // Particle exists, update it
                particlesArray[i].morph(target.x, target.y, target.color);
                particlesArray[i].size = 2; // Restore size if it was hidden
            } else {
                // Particle doesn't exist, create it
                // Start random or from center? Random is fine
                particlesArray.push(new Particle(target.x, target.y, target.color));
            }
        } else {
            // No target for this particle (new shape is smaller)
            // Hide it
            if (i < particlesArray.length) {
                particlesArray[i].size = 0;
                // Set base to something wild so they fly away? 
                // Or just let them hover where they were but invisible.
                // Let's make them fly to center to hide
                particlesArray[i].baseX = canvas.width / 2;
                particlesArray[i].baseY = canvas.height / 2;
            }
        }
    }
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].draw();
        particlesArray[i].update();
    }
    requestAnimationFrame(animate);
}

// Scroll Handling
window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const windowHeight = window.innerHeight;

    // Determine section based on scroll position
    // Section 1 (Horse): 0 - 100vh
    // Section 2 (Whale): 100vh - 200vh
    // Section 3 (Eagle): 200vh - 300vh
    // Section 4 (Tiger): 300vh - 400vh

    // We base it on the center of the viewport
    const centerLine = scrollY + windowHeight * 0.5;
    const sectionIndex = Math.floor(centerLine / windowHeight);

    let targetShape = 'horse';
    if (sectionIndex === 0) targetShape = 'horse';
    if (sectionIndex === 1) targetShape = 'whale';
    if (sectionIndex === 2) targetShape = 'eagle';
    if (sectionIndex >= 3) targetShape = 'tiger'; // Fallback to tiger for anything below

    if (currentShape !== targetShape) {
        applyShape(targetShape);
    }
});

window.addEventListener('resize', function () {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    init();
});

// Wait for font to load? Emoji usually works standard.
// Just a small timeout to ensure browser is ready or Font API
setTimeout(() => {
    init();
    animate();
}, 100);
