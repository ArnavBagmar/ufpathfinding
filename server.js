const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const app = express();

// Serve static files from current directory
app.use(express.static(__dirname));

// Path finding endpoint
app.get('/path', (req, res) => {
    const { startX, startY, endX, endY, algorithm } = req.query;
    
    const coordinates = [startX, startY, endX, endY];

    // Convert algorithm to number (0 for astar, 1 for dijkstra)
    const algorithmChoice = algorithm === 'astar' ? '0' : '1';
    
    const pathfinderExecutable = process.platform === 'win32' ? 'pathfinder.exe' : './pathfinder';

    //Convert coordinates to integers
    const args = [
        Math.round(Number(startX)),
        Math.round(Number(startY)),
        Math.round(Number(endX)),
        Math.round(Number(endY)),
        algorithmChoice
    ].map(String);

    console.log(`Executing pathfinder with coordinates: ${args.join(',')}`);

    // Spawn the pathfinder process with the required arguments
    const pathfinder = spawn(pathfinderExecutable, args, {
        cwd: __dirname
    });

    let output = '';
    let error = '';

    pathfinder.stdout.on('data', (data) => {
        output += data.toString();
        console.log('Pathfinder output:', data.toString());
    });

    pathfinder.stderr.on('data', (data) => {
        error += data.toString();
        console.error('Pathfinder error:', data.toString());
    });

    pathfinder.on('error', (err) => {
        console.error('Failed to start pathfinder:', err);
        res.status(500).send('Failed to start pathfinder process');
    });

    pathfinder.on('close', (code) => {
        if (code !== 0) {
            console.error(`Pathfinder process exited with code ${code}`);
            console.error('Error output:', error);
            res.status(500).send(`Pathfinder process failed: ${error}`);
            return;
        }
        res.send(output);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
