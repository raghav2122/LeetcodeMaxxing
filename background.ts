import * as striver191Probs from "leetcode-problems/striver191Probs.json"
import * as striverDSAbegineer from "leetcode-problems/striverDSAbegineer.json"
import * as striverExpertProbs from "leetcode-problems/striverExpertProbs.json"

import { excludedSites } from "~constants/excluded-sites"

const ruleID = 1

// Define a type for our storage structure
type StorageData = {
    striver191ProbsMarker: number
    striverDSAbegineerMarker: number
    striverExpertProbsMarker: number
    dailyGoal: number
    DSA_Sheet: string
    extensionEnabled: boolean
    problemsSolved: number
    flag: boolean
}

// Helper function to get all storage data
async function getStorageData(): Promise<StorageData> {
    return new Promise((resolve) => {
        chrome.storage.local.get(null, (result: StorageData) => {
            resolve(result)
        })
    })
}

// Helper function to update storage data
async function updateStorageData(data: Partial<StorageData>): Promise<void> {
    return new Promise((resolve) => {
        chrome.storage.local.set(data, resolve)
    })
}

// Store the problem sheets and their markers in an object
const sheets = {
    sheet1: {
        problems: striver191Probs,
        markerKey: "striver191ProbsMarker"
    },
    sheet2: {
        problems: striverDSAbegineer,
        markerKey: "striverDSAbegineerMarker"
    },
    sheet3: {
        problems: striverExpertProbs,
        markerKey: "striverExpertProbsMarker"
    }
}

// Function to set up the daily reset alarm
function setupDailyResetAlarm() {
    chrome.alarms.create("dailyReset", {
        when: getNextMidnight(),
        periodInMinutes: 24 * 60 // 24 hours
    })
}

// Function to get the timestamp for the next midnight
function getNextMidnight(): number {
    const now = new Date()
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    return tomorrow.getTime()
}

// Function to handle the daily reset
async function handleDailyReset() {
    await updateStorageData({ problemsSolved: 0 })
    console.log("Daily reset: problemsSolved set to 0")
}

chrome.runtime.onInstalled.addListener(() => {
    updateStorageData({
        striver191ProbsMarker: 0,
        striverDSAbegineerMarker: 1,
        striverExpertProbsMarker: 1,
        dailyGoal: 2,
        DSA_Sheet: "sheet1",
        extensionEnabled: true,
        problemsSolved: 0,
        flag: false
    })
    setupDailyResetAlarm()
})

// Set up alarm listener
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "dailyReset") {
        handleDailyReset()
    }
})

chrome.tabs.onCreated.addListener(async (tab) => {
    console.log("Tab created:", tab)
    const data = await getStorageData()
    if (!data.extensionEnabled) {
        console.log("Extension is disabled.")
        return
    }

    console.log("Extension is enabled.")
    await updateStorageData({ flag: false })

    if (data.problemsSolved < data.dailyGoal) {
        chrome.webRequest.onCompleted.addListener(thingsAfterLeetcodeResponse, { urls: ["https://leetcode.com/submissions/detail/*/check/"] })

        const sheet = sheets[data.DSA_Sheet as keyof typeof sheets]
        const marker = data[sheet.markerKey as keyof StorageData] as number
        const redirectUrl = sheet.problems[marker].lcLink
        setRedirectRuleForTab(redirectUrl)
        console.log("Redirecting to:", redirectUrl)
    }
})

function setRedirectRuleForTab(redirectUrl: string) {
    const redirectRule = {
        id: 1,
        priority: 1,
        action: {
            type: "redirect",
            redirect: { url: redirectUrl }
        },
        condition: {
            urlFilter: "*://*/*",
            excludedRequestDomains: excludedSites,
            resourceTypes: ["main_frame"]
        }
    }
    try {
        chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [1],
            addRules: [redirectRule as chrome.declarativeNetRequest.Rule]
        })
        console.log("Redirect rule set successfully.")
    } catch (error) {
        console.error("Error setting redirect rule:", error)
    }
}

async function getProblemStatusAfterSubmission(receivedURL: string) {
    try {
        const response = await fetch(receivedURL)
        const data = await response.json()
        return data.status_msg === "Accepted"
    } catch (error) {
        console.error("Error fetching or parsing data:", error)
        return false
    }
}

async function thingsAfterLeetcodeResponse(details: chrome.webRequest.WebResponseCacheDetails) {
    const receivedURL = details.url
    const regex = /^https:\/\/leetcode\.com\/submissions\/detail\/\d+\/check\/$/
    const data = await getStorageData()

    if (regex.test(receivedURL) && (await getProblemStatusAfterSubmission(receivedURL)) && data.problemsSolved < data.dailyGoal && !data.flag) {
        console.log("Problem solved, now checking logs.")
        await updateStorageData({ flag: true, problemsSolved: data.problemsSolved + 1 })
        console.log("Problem solved.", data.problemsSolved + 1)

        const sheet = sheets[data.DSA_Sheet as keyof typeof sheets]
        const markerKey = sheet.markerKey as keyof StorageData
        const markerValue = (data[markerKey] as number) + 1

        if (data.problemsSolved + 1 === data.dailyGoal) {
            console.log("Done for the day. Removing redirection rule.")
            await updateStorageData({ [markerKey]: markerValue })
            chrome.webRequest.onCompleted.removeListener(thingsAfterLeetcodeResponse)
            chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: [ruleID]
            })
        } else {
            chrome.webRequest.onCompleted.removeListener(thingsAfterLeetcodeResponse)
            console.log("Redirecting to the next problem.")
            await updateStorageData({ [markerKey]: markerValue })
            const redirectUrl = sheet.problems[markerValue].lcLink
            setRedirectRuleForTab(redirectUrl)
            console.log("Marker updated to:", markerValue)
            console.log("Problem solved.", data.problemsSolved + 1)
            console.log("Redirecting to:", redirectUrl)
        }
    } else {
        console.log("URL did not match the regex or problem not solved.")
    }
}
