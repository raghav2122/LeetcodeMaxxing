import * as striver191Probs from "leetcode-problems/striver191Probs.json"
import * as striverDSAbegineer from "leetcode-problems/striverDSAbegineer.json"
import * as striverExpertProbs from "leetcode-problems/striverExpertProbs.json"

import { excludedSites } from "~constants/excluded-sites"

const ruleID = 1
let striver191ProbsMarker = 0
let striverDSAbegineerMarker = 0
let striverExpertProbsMarker = 0
let dailyGoal = 2
let DSA_Sheet = "sheet1"
let extensionEnabled = true
let problemsSolved = 0
let redirectUrl: string
let flag: boolean

// Store the problem sheets and their markers in an object
const sheets = {
    sheet1: {
        problems: striver191Probs,
        marker: () => striver191ProbsMarker,
        updateMarker: (newValue: number) => (striver191ProbsMarker = newValue)
    },
    sheet2: {
        problems: striverDSAbegineer,
        marker: () => striverDSAbegineerMarker,
        updateMarker: (newValue: number) => (striverDSAbegineerMarker = newValue)
    },
    sheet3: {
        problems: striverExpertProbs,
        marker: () => striverExpertProbsMarker,
        updateMarker: (newValue: number) => (striverExpertProbsMarker = newValue)
    }
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({
        striver191Probs: 0,
        striverDSAbegineer: 1,
        striverExpertProbs: 1,
        dailyGoal: 2,
        DSA_Sheet: "sheet1",
        extensionEnabled: true
    })
})

chrome.tabs.onCreated.addListener(async (tab) => {
    console.log("Tab created:", tab)
    chrome.storage.local.get(["dailyGoal", "DSA_Sheet", "extensionEnabled"]).then((result) => {
        dailyGoal = result.dailyGoal
        DSA_Sheet = result.DSA_Sheet
        extensionEnabled = result.extensionEnabled
    })
})

if (!extensionEnabled) {
    console.log("Extension is disabled.")
} else {
    console.log("Extension is enabled.")
    chrome.tabs.onCreated.addListener(async (tab) => {
        flag = false
        console.log("Tab created:", tab)
        if (problemsSolved < dailyGoal) {
            chrome.webRequest.onCompleted.addListener(thingsAfterLeetcodeResponse, { urls: ["https://leetcode.com/submissions/detail/*/check/"] })
        }
        console.log(flag, problemsSolved, dailyGoal)
        if (problemsSolved < dailyGoal) {
            console.log("Target not achieved yet.")

            // Use the selected sheet to determine the problem URL and update marker
            const sheet = sheets[DSA_Sheet]
            redirectUrl = sheet.problems[sheet.marker()].lcLink
            setRedirectRuleForTab(redirectUrl)
            console.log("Redirecting to:", redirectUrl)
        }
    })
    chrome.webRequest.onCompleted.addListener(thingsAfterLeetcodeResponse, { urls: ["https://leetcode.com/submissions/detail/*/check/"] })
}

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

async function getProblemStatusAfterSubmission(recivedURL: string) {
    try {
        const response = await fetch(recivedURL)
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

    // Check if the URL matches the regex and the problem is solved
    if (regex.test(receivedURL) && (await getProblemStatusAfterSubmission(receivedURL)) && problemsSolved < dailyGoal && !flag) {
        console.log("Problem solved, now checking logs.")
        flag = true
        // Increment the number of problems solved
        problemsSolved++
        console.log("Problem solved.", problemsSolved)
        const sheet = sheets[DSA_Sheet]
        const markerIndex = sheet.marker()
        console.log(flag, problemsSolved, dailyGoal, "Marker:", markerIndex)
        // Check if the daily goal is met
        if (problemsSolved === dailyGoal) {
            flag = true
            console.log("Done for the day. Removing redirection rule.")
            sheet.updateMarker(markerIndex + 1)
            chrome.webRequest.onCompleted.removeListener(thingsAfterLeetcodeResponse)
            // Remove the redirection rule because the goal is met
            chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: [ruleID]
            })
        } else {
            // If the daily goal is not met, redirect to the next problem
            chrome.webRequest.onCompleted.removeListener(thingsAfterLeetcodeResponse)
            console.log("Redirecting to the next problem.")
            sheet.updateMarker(markerIndex + 1)
            redirectUrl = sheet.problems[markerIndex].lcLink
            setRedirectRuleForTab(redirectUrl)
            console.log("Marker updated to:", markerIndex)
            console.log("Problem solved.", problemsSolved)
            console.log("Redirecting to:", redirectUrl)
            console.log(flag, problemsSolved, dailyGoal)
        }
    } else {
        console.log("URL did not match the regex or problem not solved.")
    }
}
