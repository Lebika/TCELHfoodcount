const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');

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

// Define Schemas and Models
const bookingSchema = new mongoose.Schema({
  mailid: String,
  startdate: Date,
  startslot: String,
  enddate: Date,
  endslot: String
});

const slotSchema = new mongoose.Schema({
  date: String,
  morning: { type: Number, default: 60 },
  afternoon: { type: Number, default: 60 },
  evening: { type: Number, default: 60 },
  night: { type: Number, default: 60 }
});

const Booking = mongoose.model('Booking', bookingSchema);
const Slot = mongoose.model('Slot', slotSchema);

// Helper function to decrement slots
async function decrementSlots(result, slots) {
  slots.forEach(slot => {
    if (result[slot] > 0) {
      result[slot] -= 1;
    }
  });
  await result.save();
}

// Handle login request
app.post('/api/login', async (req, res) => {
  const { mailid, mailpassword } = req.body;
  try {
    console.log('Login attempt with email:', mailid);
    const user = await mongoose.connection.collection('hostelstudents').findOne({ mailid, mailpassword });
    if (user) {
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ success: false, message: 'Error during login' });
  }
});


// Handle booking request
app.post('/submit', async (req, res) => {
  try {
    const { mailid, startdate, startslot, enddate, endslot } = req.body;
    const totalStrength = 60;

    // Create new booking
    const booking = new Booking({
      mailid,
      startdate: new Date(startdate),
      startslot,
      enddate: new Date(enddate),
      endslot
    });

    // Save booking to the database
    await booking.save();

    // Convert dates to UTC and initialize slot counts
    let currentDate = new Date(startdate);
    currentDate.setUTCHours(0, 0, 0, 0);
    const endDateObj = new Date(enddate);
    endDateObj.setUTCHours(0, 0, 0, 0);

    while (currentDate <= endDateObj) {
      let dateStr = currentDate.toISOString().split('T')[0];
      let slotDoc = await Slot.findOne({ date: dateStr });

      if (!slotDoc) {
        // Initialize new slot document if not found
        slotDoc = new Slot({ date: dateStr });
      }

      // Decrement slot counts based on booking data
      if (currentDate.toISOString() === new Date(startdate).toISOString()) {
        // Start date: decrement from start slot to the end of the day
        const slotsToDecrement = ['morning', 'afternoon', 'evening', 'night'].slice(
          ['morning', 'afternoon', 'evening', 'night'].indexOf(startslot)
        );
        await decrementSlots(slotDoc, slotsToDecrement);
      } else if (currentDate.toISOString() === new Date(enddate).toISOString()) {
        // End date: decrement from the beginning of the day to the end slot
        const slotsToDecrement = ['morning', 'afternoon', 'evening', 'night'].slice(
          0,
          ['morning', 'afternoon', 'evening', 'night'].indexOf(endslot) + 1
        );
        await decrementSlots(slotDoc, slotsToDecrement);
      } else {
        // Middle dates: decrement all slots
        await decrementSlots(slotDoc, ['morning', 'afternoon', 'evening', 'night']);
      }

      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    res.sendFile(path.join(__dirname, 'public', 'submit_display.html'));
  } catch (err) {
    console.error('Error saving data:', err);
    res.status(500).send('Error saving data');
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
