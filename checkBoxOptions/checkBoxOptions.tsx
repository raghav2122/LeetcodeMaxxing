import React from "react"
import { useForm } from "react-hook-form"
import type { SubmitHandler } from "react-hook-form"

import type { PopupOptions } from "../types/popup-types"

import "./options.css"

export function PopupOptions() {
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<PopupOptions>()

  const onSubmit: SubmitHandler<PopupOptions> = async (data) => {
    try {
      const response = await fetch("http://localhost:3001/api/save-data", {
        // Update URL as needed
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error("Network response was not ok")
      }

      const result = await response.json()
      console.log("Data saved successfully:", result)
    } catch (error) {
      console.error("Failed to save data:", error)
    }
  }

  return (
    <div className="popup-options-container">
      <form onSubmit={handleSubmit(onSubmit)}>
        <label>Selected DSA Sheet</label>
        <select {...register("DSA_Sheet.selectedSheet")}>
          <option value="sheet1">Striver's SDE Sheet</option>
          <option value="sheet2">Striver's 79 Sheet</option>
          <option value="sheet3">Blind 75 Sheet</option>
        </select>

        <label>Daily Question Goal</label>
        <input
          type="number"
          {...register("DailyQuestionGoal", { valueAsNumber: true })}
        />
        <div className="flex">
          <label>E:</label>
          <input type="checkbox" {...register("extensionEnabled")} />
        </div>
        <button type="submit">Submit</button>
      </form>
    </div>
  )
}
