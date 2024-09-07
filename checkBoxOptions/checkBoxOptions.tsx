import React, { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import type { SubmitHandler } from "react-hook-form"

import type { PopupOptions } from "../types/popup-types"

import "./options.css"

export const CheckBoxOptions = () => {
    const { register, handleSubmit, setValue, watch } = useForm<PopupOptions>()
    const [dailyGoal, setDailyGoal] = useState<number | null>(null)
    const [DSA_Sheet, setDSA_Sheet] = useState<string | null>(null)
    const [extensionEnabled, setExtensionEnabled] = useState<boolean | null>(null)

    useEffect(() => {
        // Load initial values from local storage
        chrome.storage.local.get(["dailyGoal", "DSA_Sheet", "extensionEnabled"], (result) => {
            setDailyGoal(result.dailyGoal ?? 2)
            setDSA_Sheet(result.DSA_Sheet ?? "sheet1")
            setExtensionEnabled(result.extensionEnabled ?? true)

            // Set form values
            setValue("DailyQuestionGoal", result.dailyGoal ?? 2)
            setValue("DSA_Sheet", result.DSA_Sheet ?? "sheet1")
            setValue("extensionEnabled", result.extensionEnabled ?? true)
        })
    }, [setValue])

    const onSubmit: SubmitHandler<PopupOptions> = (data) => {
        console.log(data)
        // Ensure daily goal is non-negative
        const safeGoal = Math.max(0, data.DailyQuestionGoal)
        // Save form data to local storage
        chrome.storage.local.set(
            {
                dailyGoal: safeGoal,
                DSA_Sheet: data.DSA_Sheet,
                extensionEnabled: data.extensionEnabled
            },
            () => {
                console.log("Settings saved")
                // Update state after saving to storage
                setDailyGoal(safeGoal)
                setDSA_Sheet(data.DSA_Sheet)
                setExtensionEnabled(data.extensionEnabled)

                // Notify the background script about the change
                chrome.runtime.sendMessage({
                    action: "updateSettings",
                    settings: { ...data, DailyQuestionGoal: safeGoal }
                })

                // Close the popup
                window.close()
            }
        )
    }

    // Watch the DailyQuestionGoal field
    const watchDailyGoal = watch("DailyQuestionGoal")

    // Don't render the form until we've loaded the initial values
    if (dailyGoal === null || DSA_Sheet === null || extensionEnabled === null) {
        return <div className="loading">Loading...</div>
    }

    return (
        <div className="options-container">
            <form onSubmit={handleSubmit(onSubmit)}>
                <label>
                    Daily Question Goal:
                    <input
                        type="number"
                        min="0"
                        {...register("DailyQuestionGoal", {
                            valueAsNumber: true,
                            min: 0,
                            onChange: (e) => {
                                const value = parseInt(e.target.value)
                                if (value < 0) {
                                    setValue("DailyQuestionGoal", 0)
                                }
                            }
                        })}
                        defaultValue={dailyGoal}
                    />
                </label>
                {watchDailyGoal < 0 && <p className="error">Daily goal must be non-negative.</p>}
                <label>
                    DSA Sheet:
                    <select {...register("DSA_Sheet")} defaultValue={DSA_Sheet}>
                        <option value="sheet1">Striver’s SDE Sheet</option>
                        <option value="sheet2">Strivers A2Z DSA Course/Sheet</option>
                        <option value="sheet3">Strivers 79 Last Moment DSA Sheet</option>
                    </select>
                </label>
                <label>
                    Extension Enabled:
                    <input type="checkbox" {...register("extensionEnabled")} defaultChecked={extensionEnabled} />
                </label>
                <input type="submit" value="Save Settings" />
            </form>
        </div>
    )
}
