import React from "react"
import { useForm } from "react-hook-form"
import type { SubmitHandler } from "react-hook-form"

import { useStorage } from "@plasmohq/storage/hook"

import type { PopupOptions } from "../types/popup-types"

import "./options.css"

export function PopupOptions() {
  // Initialize useForm hook for form validation and handling
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<PopupOptions>()

  // Define useStorage hooks for different states
  const [DSA_Sheet, setDSA_Sheet] = useStorage("DSA_Sheet", "sheet1") // Default value set to "sheet1"
  const [DailyQuestionGoal, setDailyQuestionGoal] = useStorage(
    "DailyQuestionGoal",
    1
  ) // Default set to 1
  const [extensionEnabled, setExtensionEnabled] = useStorage(
    "extensionEnabled",
    false
  ) // Default false

  // Synchronize useStorage values with the form when storage values change
  React.useEffect(() => {
    setValue("DSA_Sheet.selectedSheet", DSA_Sheet)
    setValue("DailyQuestionGoal", DailyQuestionGoal)
    setValue("extensionEnabled", extensionEnabled)
  }, [DSA_Sheet, DailyQuestionGoal, extensionEnabled, setValue])

  // Submit handler for form submission
  const onSubmit: SubmitHandler<PopupOptions> = (data) => {
    // Send form data to background script
    chrome.runtime.sendMessage(
      {
        type: "FORM_SUBMIT",
        payload: {
          DSA_Sheet: data.DSA_Sheet.selectedSheet,
          DailyQuestionGoal: data.DailyQuestionGoal,
          extensionEnabled: data.extensionEnabled
        }
      },
      (response) => {
        if (response.status === "success") {
          console.log(response.message)
        }
      }
    )
  }

  return (
    <div className="popup-options-container">
      <form onSubmit={handleSubmit(onSubmit)}>
        <label>Selected DSA Sheet</label>
        <select
          {...register("DSA_Sheet.selectedSheet")}
          value={DSA_Sheet} // Sync select value with storage
          onChange={(e) => setDSA_Sheet(e.target.value)} // Update storage on change
        >
          <option value="sheet1">Striver's SDE Sheet</option>
          <option value="sheet2">Striver's 79 Sheet</option>
          <option value="sheet3">Blind 75 Sheet</option>
        </select>

        <label>Daily Question Goal</label>
        <input
          type="number"
          {...register("DailyQuestionGoal", { valueAsNumber: true })}
          value={DailyQuestionGoal} // Sync input value with storage
          onChange={(e) => setDailyQuestionGoal(Number(e.target.value))} // Update storage on change
        />

        <div className="flex">
          <label>Extension Enabled:</label>
          <input
            type="checkbox"
            {...register("extensionEnabled")}
            checked={extensionEnabled} // Sync checkbox value with storage
            onChange={(e) => setExtensionEnabled(e.target.checked)} // Update storage on change
          />
        </div>

        <button type="submit">Submit</button>
      </form>
    </div>
  )
}
