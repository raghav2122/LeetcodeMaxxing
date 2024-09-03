import mongoose from "mongoose"

const SheetSchema = new mongoose.Schema({
  sheetId: {
    type: String,
    required: true,
    unique: true
  },
  sheetName: {
    type: String,
    required: true
  },
  sheetUrl: {
    type: String,
    required: true
  }
})

module.exports = mongoose.model("Sheet", SheetSchema)
