const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const app = express();

// Serve static files from current directory
app.use(express.static(__dirname));

// Path finding endpoint
app.get('/path', (req, res) => {
    const { startX, startY, endX, endY } = req.query;
    
    // Use the correct path to the executable based on platform
    const pathfinderExecutable = process.platform === 'win32' ? 'pathfinder.exe' : './pathfinder';
    
    console.log(`Executing pathfinder with coordinates: ${startX},${startY} to ${endX},${endY}`);
    
    // Execute the C++ pathfinder program
    const pathfinder = spawn(pathfinderExecutable, [startX, startY, endX, endY], {
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
            res.status(500).send('Error finding path');
            return;
        }
        res.send(output);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});