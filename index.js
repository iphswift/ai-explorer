import dotenv from 'dotenv';
dotenv.config(); 

import express from 'express';
import cors from 'cors';
import apiRoutes from './api/routes.js';

const app = express();
const port = process.env.PORT || 3000;


app.use(cors());
app.use(express.json());

app.use('/', apiRoutes);

app.use((err, req, res, next) => {
    console.error("An unexpected error occurred:", err.stack);
    res.status(500).json({ error: "An internal server error occurred." });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});