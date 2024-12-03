const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const imageInput = document.getElementById('imageInput');
const csvInput = document.getElementById('csvInput');
const findPathBtn = document.getElementById('findPathBtn');
const algorithmSelect = document.getElementById('algorithmSelect');

let paths = [];
let startPoint = null;
let endPoint = null;
let baseImage = null;
let isAnimating = false;
const ANIMATION_DELAY = 15;

// Set initial canvas size
canvas.width = 800;
canvas.height = 600;

function drawMarker(x, y, color) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
}

function drawMarkerWithOutline(x, y, color) {
    ctx.save();
    // Outer circle for outline
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    
    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Inner circle for the marker
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    
    ctx.restore();
}

function getCanvasCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: Math.round((e.clientX - rect.left) * scaleX),
        y: Math.round((e.clientY - rect.top) * scaleY)
    };
}

function resetCanvas() {
    if (baseImage) {
        ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#2d3748';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    paths.forEach(path => {
        ctx.fillStyle = '#9f7aea';
        ctx.fillRect(path.x, path.y, 2, 2);
    });
    
    if (startPoint) drawMarkerWithOutline(startPoint.x, startPoint.y, '#48bb78');
    if (endPoint) drawMarkerWithOutline(endPoint.x, endPoint.y, '#f56565');

    startPoint = null;
    endPoint = null;
}

function drawExploredPath(point, algorithm) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = algorithm === 'astar' 
        ? 'rgba(255, 0, 0, 0.2)' // Red for A*
        : 'rgba(59, 130, 246, 0.2)'; // Light blue for Dijkstra
    ctx.fill();
}

async function drawFinalPath(path) {
    if (path.length === 0) {
        console.log('No final path to draw');
        return;
    }

    console.log('Drawing final path with', path.length, 'points');

    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#FFD700'; // Gold color
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Add a glow effect
    ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
    ctx.shadowBlur = 10;

    for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
        ctx.stroke();
        await new Promise(resolve => setTimeout(resolve, 30));
    }

    // Reset shadow effect
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    console.log('Final path drawing completed');
}

imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            baseImage = img;
            resetCanvas();
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

csvInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = (event) => {
        const csv = event.target.result;
        const rows = csv.split('\n');
        paths = [];
        rows.slice(1).forEach(row => {
            const [x, y, path] = row.split(',');
            if (x && y) {
                paths.push({
                    x: parseInt(x),
                    y: parseInt(y),
                    path: parseInt(path)
                });
            }
        });
        resetCanvas();
    };
    reader.readAsText(file);
});

canvas.addEventListener('click', (e) => {
    const coords = getCanvasCoordinates(e);
    
    if (!startPoint) {
        startPoint = coords;
        drawMarkerWithOutline(coords.x, coords.y, '#48bb78');
    } else if (!endPoint) {
        endPoint = coords;
        drawMarkerWithOutline(coords.x, coords.y, '#f56565');
    }
});

findPathBtn.addEventListener('click', async () => {
    if (!startPoint || !endPoint) {
        alert('Please select both start and end points first.');
        return;
    }

    if (isAnimating) return;
    isAnimating = true;

    try {
        const algorithm = algorithmSelect.value;
        const response = await fetch(`/path?startX=${startPoint.x}&startY=${startPoint.y}&endX=${endPoint.x}&endY=${endPoint.y}&algorithm=${algorithm}`);
        if (!response.ok) throw new Error('Path finding failed');
        
        const pathData = await response.text();
        if (!pathData.trim()) {
            throw new Error('No path data received');
        }

        const lines = pathData.trim().split('\n');
        resetCanvas();
        
        const visitedNodes = [];
        const finalPath = [];
        let isCollectingPath = false;

        // Parse the output
        for (const line of lines) {
            if (!line.trim()) continue;
            
            if (line.startsWith('VISITED')) {
                const coords = line.split(' ')[1];
                if (coords) {
                    const [x, y] = coords.split(',').map(Number);
                    if (!isNaN(x) && !isNaN(y)) {
                        visitedNodes.push({x, y});
                    }
                }
            } else if (line === 'PATH_START') {
                // Start collecting the final path after encountering PATH_START
                isCollectingPath = true;
            } else if (isCollectingPath && line.includes(',')) {
                const [x, y] = line.split(',').map(Number);
                if (!isNaN(x) && !isNaN(y)) {
                    finalPath.push({x, y});
                }
            }
        }
        
        // Show exploration visualization
        for (let i = 0; i < visitedNodes.length; i++) {
            if (i % 3 === 0) {
                await new Promise(resolve => setTimeout(resolve, 10));
            }
            drawExploredPath(visitedNodes[i], algorithm);
        }

        // After visualization is done, draw the final path
        await drawFinalPath(finalPath);

        // Redraw markers on top
        drawMarkerWithOutline(startPoint.x, startPoint.y, '#48bb78');
        drawMarkerWithOutline(endPoint.x, endPoint.y, '#f56565');

    } catch (error) {
        console.error('Error in pathfinding:', error);
        if (startPoint) drawMarkerWithOutline(startPoint.x, startPoint.y, '#48bb78');
        if (endPoint) drawMarkerWithOutline(endPoint.x, endPoint.y, '#f56565');
    } finally {
        isAnimating = false;
    }
});