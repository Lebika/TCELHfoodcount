const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;
const uri = 'mongodb://localhost:27017/hostel_db';

// Connect to MongoDB
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Define Slot Schema and Model
const slotSchema = new mongoose.Schema({
  date: String,       // Date in the format "YYYY-MM-DD"
  morning: Number,    // Available slots in the morning
  afternoon: Number,  // Available slots in the afternoon
  evening: Number,    // Available slots in the evening
  night: Number       // Available slots in the night
});

const Slot = mongoose.model('Slot', slotSchema);

// Endpoint to get slots data for the current month
app.get('/api/slots', async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const startStr = startOfMonth.toISOString().split('T')[0];
    const endStr = endOfMonth.toISOString().split('T')[0];

    const slots = await Slot.find({
      date: { $gte: startStr, $lte: endStr }
    });

    res.json(slots);
  } catch (error) {
    console.error('Error fetching slots data:', error);
    res.status(500).json({ message: 'Error fetching slots data' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
