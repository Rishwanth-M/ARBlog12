import express from 'express';
import axios from 'axios';
import cors from 'cors';

const app = express();
const port = 5000;

app.use(express.json());
app.use(cors()); // Enable CORS for all requests

let savedToken = null; // Store the token in memory for simplicity

// Endpoint for login
app.post('/login', async (req, res) => {
    const { mobilenumber } = req.body;
    const password = 'Kmit123$';

    try {
        console.log('Login request received:', mobilenumber);

        // Make a POST request to the external login API
        const response = await axios.post(
            'http://apps.teleuniv.in/api/auth/netralogin.php?college=KMIT',
            { mobilenumber, password }
        );

        console.log('Login response:', response.data);

        if (response.data.success === 1) {
            savedToken = response.data.token; // Save the token in memory
            res.json({ success: true, token: response.data.token });
        } else {
            res.status(400).json({ success: false, error: 'Login failed' });
        }
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to authenticate', details: error.message });
    }
});

// Endpoint to fetch data using the token and method: 314
app.post('/data', async (req, res) => {
    if (!savedToken) {
        return res.status(400).json({ error: 'Token is not available. Please log in first.' });
    }

    try {
        console.log('Attempting to fetch data using the token:', savedToken);

        // Make a POST request to the external API with method: 314
        const response = await axios.post(
            'http://apps.teleuniv.in/api/netraapi.php?college=KMIT',
            { method: '314' }, // Send method in the request body
            {
                headers: {
                    'Authorization': `Bearer ${savedToken}`, // Use the saved token
                    'Content-Type': 'application/json',
                    'Origin': 'http://kmit-netra.teleuniv.in',
                    'Referer': 'http://kmit-netra.teleuniv.in/',
                },
            }
        );

        console.log('Data API Response:', response.data);

        if (response.data.eid === 'error') {
            res.status(400).json({ success: false, error: 'Error from external API', details: response.data });
        } else {
            res.json({ success: true, data: response.data }); // Forward the response to the frontend
        }
    } catch (error) {
        console.error('Data fetch error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch data', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
