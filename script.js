const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const imageInput = document.getElementById('imageInput');
const csvInput = document.getElementById('csvInput');
const findPathBtn = document.getElementById('findPathBtn');

let paths = [];
let startPoint = null;
let endPoint = null;
let baseImage = null;

// Set initial canvas size
canvas.width = 800;
canvas.height = 600;

function resetCanvas() {
    if (baseImage) {
        ctx.drawImage(baseImage, 0, 0);
    } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    // Redraw paths
    paths.forEach(path => {
        ctx.fillStyle = 'red';
        ctx.fillRect(path.x, path.y, 1, 1);
    });
    // Redraw points
    if (startPoint) {
        ctx.fillStyle = 'green';
        ctx.fillRect(startPoint.x - 2, startPoint.y - 2, 5, 5);
    }
    if (endPoint) {
        ctx.fillStyle = 'blue';
        ctx.fillRect(endPoint.x - 2, endPoint.y - 2, 5, 5);
    }
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
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(e.clientX - rect.left);
    const y = Math.floor(e.clientY - rect.top);
    
    if (!startPoint) {
        startPoint = { x, y };
        resetCanvas();
    } else if (!endPoint) {
        endPoint = { x, y };
        resetCanvas();
    }
});

findPathBtn.addEventListener('click', async () => {
    if (!startPoint || !endPoint) {
        alert('Please select both start and end points first.');
        return;
    }

    try {
        const response = await fetch(`/path?startX=${startPoint.x}&startY=${startPoint.y}&endX=${endPoint.x}&endY=${endPoint.y}`);
        if (!response.ok) throw new Error('Path finding failed');
        
        const pathData = await response.text();
        const coordinates = pathData.trim().split('\n');
        ctx.strokeStyle = 'lime';
        ctx.lineWidth = 2;
        ctx.beginPath();

        const firstPoint = coordinates[0].split(',');
        ctx.moveTo(parseInt(firstPoint[0]), parseInt(firstPoint[1]));

        coordinates.slice(1).forEach(coord => {
        const [x, y] = coord.split(',');
        ctx.lineTo(parseInt(x), parseInt(y));
        });

        ctx.stroke();

    } catch (error) {
        console.error('Error finding path:', error);
        alert('Error finding path. Please try again.');
    }
});