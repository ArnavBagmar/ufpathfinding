const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const findPathBtn = document.getElementById('findPathBtn');
const algorithmSelect = document.getElementById('algorithmSelect');

let paths = [];
let startPoint = null;
let endPoint = null;
let baseImage = null;
let isAnimating = false;
let animationCancelled = false;

const ANIMATION_DELAY = 5;

baseImage = new Image();
baseImage.src = 'ufmap.png'; 
baseImage.onload = () => {
    canvas.width = baseImage.width;
    canvas.height = baseImage.height;
    ctx.drawImage(baseImage, 0, 0);
    resetCanvas();
};

fetch('map_data (2).csv')
    .then(response => response.text())
    .then(csv => {
        const rows = csv.trim().split('\n');
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
    })
    .catch(error => {
        console.error('Error loading CSV data:', error);
    });

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

    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

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
    } 
    else {
        ctx.fillStyle = '#2d3748';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    animationCancelled = true;

    startPoint = null;
    endPoint = null;
}


canvas.addEventListener('click', (e) => {
    const coords = getCanvasCoordinates(e);

    if (!startPoint) {
        startPoint = coords;
        drawMarker(coords.x, coords.y, '#48bb78');
    } 
    else if (!endPoint) {
        endPoint = coords;
        drawMarker(coords.x, coords.y, '#f56565');
    } 
    else {
        resetCanvas();
        startPoint = coords;
        drawMarker(coords.x, coords.y, '#48bb78');
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
        const algorithm = algorithmSelect.value; // 'astar' or 'dijkstra'

        const pathData = await findPath(startPoint, endPoint, algorithm);

        if (!pathData || pathData.length === 0) {
            throw new Error('No path found between the selected points.');
        }

        if (baseImage) {
            ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
        }

        // Draw the final path
        await drawFinalPath(pathData);

        // Redraw markers on top
        if (startPoint) drawMarker(startPoint.x, startPoint.y, '#48bb78');
        if (endPoint) drawMarker(endPoint.x, endPoint.y, '#f56565');

    } catch (error) {
        console.error('Error in pathfinding:', error);
        alert(error.message);
        resetCanvas();
    }
});

function drawExploredPath(point, algorithm) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = algorithm === 'astar' 
        ? 'rgba(255, 0, 0, 0.2)' // Red for A*
        : 'rgba(59, 130, 246, 0.2)'; // Light blue for Dijkstra
    ctx.fill();
}


async function drawFinalPath(path) {
    // Set up drawing styles
    if (startPoint) drawMarker(startPoint.x, startPoint.y, '#48bb78');
    if (endPoint) drawMarker(endPoint.x, endPoint.y, '#f56565');

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#FFD700';
    ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
    ctx.shadowBlur = 10;

    animationCancelled = false;

    // Draw each segment of the path individually
    for (let i = 1; i < path.length; i++) {
    
        if (animationCancelled) {
            break; 
        }     

        ctx.beginPath(); 
        ctx.moveTo(path[i - 1].x, path[i - 1].y); 
        ctx.lineTo(path[i].x, path[i].y); 
        ctx.stroke(); 
        await new Promise(resolve => setTimeout(resolve, ANIMATION_DELAY));
    }

    isAnimating = false;
}

async function findPath(start, end, algorithm) {
    const params = new URLSearchParams({
        startX: start.x,
        startY: start.y,
        endX: end.x,
        endY: end.y,
        algorithm: algorithm 
    });

    const response = await fetch('/path?' + params.toString());
    const text = await response.text();

    const lines = text.trim().split('\n');
    let pathStartIndex = lines.indexOf('PATH_START');
    

    const path = [];
    for (let i = pathStartIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '') continue;
        const [xStr, yStr] = line.split(',');
        if (xStr && yStr) {
            path.push({ x: parseInt(xStr), y: parseInt(yStr) });
        }
    }

    return path;
}
window.resetCanvas = resetCanvas;
