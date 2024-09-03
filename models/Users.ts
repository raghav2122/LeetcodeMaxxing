import mongoose from "mongoose"

const SheetProgressSchema = new mongoose.Schema({
  sheetId: String,
  sheetName: String,
  solvedQuestions: {
    type: Number,
    default: 0
  },
  currentQuestion: {
    type: Number,
    default: 0
  }
})

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  dailyQuestionGoal: {
    type: Number,
    default: 0
  },
  sheets: [SheetProgressSchema]
})

module.exports = mongoose.model("User", UserSchema)
