import { CheckBoxOptions } from "checkBoxOptions/checkBoxOptions"
import React, { useEffect, useState } from "react"

const Popup = () => {
    return (
        <div className="popup-container">
            <h2 className="popup-title">Leetcode Maxxing</h2>
            <p>Choose your goal: </p>
            <div className="checkbox-container">
                <CheckBoxOptions />
            </div>
        </div>
    )
}

export default Popup
