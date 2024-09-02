import "dotenv/config" // Automatically loads .env file

import bodyParser from "body-parser"
import cors from "cors"
import express from "express"
import mongoose from "mongoose"

const app = express()
const port = 3001

app.use(cors())
app.use(bodyParser.json())

// Use environment variable for MongoDB URI
const mongoURI = process.env.PLASMO_PUBLIC_MONGO_URI

// Connect to MongoDB
mongoose
  .connect(mongoURI)
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch((err) => console.error("Failed to connect to MongoDB Atlas:", err))

const DataSchema = new mongoose.Schema({
  DSA_Sheet: String,
  DailyQuestionGoal: Number,
  extensionEnabled: Boolean
})

const DataModel = mongoose.model("Data", DataSchema)

app.post("/api/save-data", async (req, res) => {
  try {
    const data = new DataModel(req.body)
    await data.save()
    res.status(200).json({ message: "Data saved successfully" })
  } catch (error) {
    console.error("Failed to save data:", error)
    res.status(500).json({ error: "Failed to save data" })
  }
})

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
