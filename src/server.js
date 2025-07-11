const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const secureRoutes = require('./routes/secure.route'); // Import secure routes

const app = express();
app.use(cors());
app.use(express.json());

// Use the secure routes with Firebase token verification
// app.use('/api', secureRoutes);

app.use('/api/patients', require('./routes/patient.routes'));
app.use('/api/appointments', require('./routes/appointment.routes'));
app.use('/api/auth', require('./routes/auth.routes'));

app.get('/', (req, res) => res.send('Denta API Running'));


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
