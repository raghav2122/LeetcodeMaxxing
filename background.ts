import * as striver191Probs from "leetcode-problems/striver191Probs.json"
import * as striverDSAbegineer from "leetcode-problems/striverDSAbegineer.json"
import * as striverExpertProbs from "leetcode-problems/striverExpertProbs.json"

import { excludedSites } from "~constants/excluded-sites"

const ruleID = 1

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

async function getStorageData(): Promise<StorageData> {
    return new Promise((resolve) => {
        chrome.storage.local.get(null, (result: StorageData) => {
            resolve(result)
        })
    })
}

async function updateStorageData(data: Partial<StorageData>): Promise<void> {
    return new Promise((resolve) => {
        chrome.storage.local.set(data, resolve)
    })
}

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

function setupDailyResetAlarm() {
    chrome.alarms.create("dailyReset", {
        when: getNextMidnight(),
        periodInMinutes: 24 * 60
    })
}

function getNextMidnight(): number {
    const now = new Date()
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    return tomorrow.getTime()
}

async function handleDailyReset() {
    await updateStorageData({ problemsSolved: 0 })
}

let extensionEnabled = true

chrome.runtime.onInstalled.addListener(() => {
    updateStorageData({
        striver191ProbsMarker: 0,
        striverDSAbegineerMarker: 0,
        striverExpertProbsMarker: 0,
        dailyGoal: 2,
        DSA_Sheet: "sheet1",
        extensionEnabled: true,
        problemsSolved: 0,
        flag: false
    })
    setupDailyResetAlarm()
})

chrome.storage.local.get("extensionEnabled", (result) => {
    extensionEnabled = result.extensionEnabled ?? true
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "updateSettings") {
        extensionEnabled = message.settings.extensionEnabled
    }
})

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "dailyReset") {
        handleDailyReset()
    }
})

chrome.tabs.onCreated.addListener(async (tab) => {
    const data = await getStorageData()
    if (!extensionEnabled) {
        return
    }

    await updateStorageData({ flag: false })

    if (data.problemsSolved < data.dailyGoal) {
        chrome.webRequest.onCompleted.addListener(thingsAfterLeetcodeResponse, { urls: ["https://leetcode.com/submissions/detail/*/check/"] })

        const sheet = sheets[data.DSA_Sheet as keyof typeof sheets]
        const marker = data[sheet.markerKey as keyof StorageData] as number
        const redirectUrl = sheet.problems[marker].lcLink
        setRedirectRuleForTab(redirectUrl)
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
    } catch (error) {
        // Handle error
    }
}

async function getProblemStatusAfterSubmission(receivedURL: string) {
    try {
        const response = await fetch(receivedURL)
        const data = await response.json()
        return data.status_msg === "Accepted"
    } catch (error) {
        return false
    }
}

async function thingsAfterLeetcodeResponse(details: chrome.webRequest.WebResponseCacheDetails) {
    const receivedURL = details.url
    const regex = /^https:\/\/leetcode\.com\/submissions\/detail\/\d+\/check\/$/
    const data = await getStorageData()

    if (regex.test(receivedURL) && (await getProblemStatusAfterSubmission(receivedURL)) && data.problemsSolved < data.dailyGoal && !data.flag) {
        await updateStorageData({ flag: true, problemsSolved: data.problemsSolved + 1 })

        const sheet = sheets[data.DSA_Sheet as keyof typeof sheets]
        const markerKey = sheet.markerKey as keyof StorageData
        const markerValue = (data[markerKey] as number) + 1

        if (data.problemsSolved + 1 === data.dailyGoal) {
            await updateStorageData({ [markerKey]: markerValue })
            chrome.webRequest.onCompleted.removeListener(thingsAfterLeetcodeResponse)
            chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: [ruleID]
            })
        } else {
            chrome.webRequest.onCompleted.removeListener(thingsAfterLeetcodeResponse)
            await updateStorageData({ [markerKey]: markerValue })
            const redirectUrl = sheet.problems[markerValue].lcLink
            setRedirectRuleForTab(redirectUrl)
        }
    }
}
