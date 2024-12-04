import express from 'express';
import axios from 'axios';
import cors from 'cors';

const app = express();
const port = 5000; // Shared port

app.use(express.json());
app.use(
  cors({
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500'], // Enable CORS for specific origins
  })
);

let savedToken = null; // Store the token in memory

/**
 * Login Endpoint
 * Authenticates user and retrieves a token
 */
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
    res
      .status(500)
      .json({ success: false, error: 'Failed to authenticate', details: error.message });
  }
});

/**
 * Data Fetch Endpoint - Method 314
 */
app.post('/data314', async (req, res) => {
  if (!savedToken) {
    return res.status(400).json({ error: 'Token is not available. Please log in first.' });
  }

  try {
    console.log('Attempting to fetch data using the token:', savedToken);

    // Make a POST request to the external API with method: 314
    const response = await axios.post(
      'http://apps.teleuniv.in/api/netraapi.php?college=KMIT',
      { method: '314' },
      {
        headers: {
          Authorization: `Bearer ${savedToken}`, // Use the saved token
          'Content-Type': 'application/json',
          Origin: 'http://kmit-netra.teleuniv.in',
          Referer: 'http://kmit-netra.teleuniv.in/',
        },
      }
    );

    console.log('Data API Response (method 314):', response.data);

    if (response.data.eid === 'error') {
      res
        .status(400)
        .json({ success: false, error: 'Error from external API', details: response.data });
    } else {
      res.json({ success: true, data: response.data }); // Forward the response to the frontend
    }
  } catch (error) {
    console.error('Data fetch error (method 314):', error.message);
    res
      .status(500)
      .json({ success: false, error: 'Failed to fetch data', details: error.message });
  }
});

/**
 * Data Fetch Endpoint - Method 32
 */
app.post('/data32', async (req, res) => {
  if (!savedToken) {
    return res.status(400).json({ error: 'Token is not available. Please log in first.' });
  }

  try {
    console.log('Attempting to fetch data using the token:', savedToken);

    // Make a POST request to the external API with method: 32
    const response = await axios.post(
      'http://apps.teleuniv.in/api/netraapi.php?college=KMIT',
      { method: '32' },
      {
        headers: {
          Authorization: `Bearer ${savedToken}`, // Use the saved token
          'Content-Type': 'application/json',
          Origin: 'http://kmit-netra.teleuniv.in',
          Referer: 'http://kmit-netra.teleuniv.in/',
        },
      }
    );

    console.log('Data API Response (method 32):', response.data);

    if (response.data.eid === 'error') {
      res
        .status(400)
        .json({ success: false, error: 'Error from external API', details: response.data });
    } else {
      res.json({ success: true, data: response.data }); // Forward the response to the frontend
    }
  } catch (error) {
    console.error('Data fetch error (method 32):', error.message);
    res
      .status(500)
      .json({ success: false, error: 'Failed to fetch data', details: error.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
