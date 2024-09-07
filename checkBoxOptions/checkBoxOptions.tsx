import React, { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import type { SubmitHandler } from "react-hook-form"

import type { PopupOptions } from "../types/popup-types"

import "./options.css"

export const CheckBoxOptions = () => {
    const { register, handleSubmit, setValue } = useForm<PopupOptions>()
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
        // Save form data to local storage
        chrome.storage.local.set(
            {
                dailyGoal: data.DailyQuestionGoal,
                DSA_Sheet: data.DSA_Sheet,
                extensionEnabled: data.extensionEnabled
            },
            () => {
                console.log("Settings saved")
                // Update state after saving to storage
                setDailyGoal(data.DailyQuestionGoal)
                setDSA_Sheet(data.DSA_Sheet)
                setExtensionEnabled(data.extensionEnabled)

                // Notify the background script about the change
                chrome.runtime.sendMessage({
                    action: "updateSettings",
                    settings: data
                })

                // Close the popup
                window.close()
            }
        )
    }

    // Don't render the form until we've loaded the initial values
    if (dailyGoal === null || DSA_Sheet === null || extensionEnabled === null) {
        return <div>Loading...</div>
    }

    return (
        <div>
            <form onSubmit={handleSubmit(onSubmit)}>
                <label>
                    Daily Question Goal:
                    <input type="number" {...register("DailyQuestionGoal")} defaultValue={dailyGoal} />
                </label>
                <label>
                    DSA Sheet:
                    <select {...register("DSA_Sheet")} defaultValue={DSA_Sheet}>
                        <option value="sheet1">Sheet 1</option>
                        <option value="sheet2">Sheet 2</option>
                        <option value="sheet3">Sheet 3</option>
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
