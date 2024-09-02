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

  const onSubmit: SubmitHandler<PopupOptions> = (data) => {
    console.log(data) // For debugging in the popup

    // Send data to the service worker
    console.log("Sending message to service worker")
    chrome.runtime.sendMessage(
      { type: "FORM_SUBMIT", payload: data },
      (response) => {
        console.log("Response from service worker:", response)
      }
    )
  }

  return (
    <div className="popup-options-container">
      <form onSubmit={handleSubmit(onSubmit)}>
        <label>Selected DSA Sheet</label>
        <select {...register("DSA_Sheet.selectedSheet")}>
          <option value="sheet1">Array Questions</option>
          <option value="sheet2">Dynamic Programming</option>
          <option value="sheet3">Graph Theory</option>
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
