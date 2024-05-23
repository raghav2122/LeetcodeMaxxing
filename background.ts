import * as probs from "leetcode-problems/striver191Probs.json"
import * as probsBase from "leetcode-problems/striverDSAbegineer.json"

import { storage } from "./storage"

const Rule_ID = 1
const INDEX_KEY = "currIndex"
const PROBSOLVED_KEY = "probSolved"
const STORAGE_KEY = "user-preference-alarm-enabled"
const ALARM_NAME = "my-alarm"
const ALARM_DELAY_MINUTES = 2

let webRequestListenerAdded = false
let matchingUrl = ""
let false_status_count = 0

// Load and initialize state variables
let currIndex = 0
let probSolved = 0
let isAlarmActive = false // Flag to track alarm state

async function loadIndexAndProbSolved() {
  const storedIndex = await storage.get(INDEX_KEY)
  const storedProbSolved = await storage.get(PROBSOLVED_KEY)
  currIndex = storedIndex ? parseInt(storedIndex, 10) : 0
  probSolved = storedProbSolved ? parseInt(storedProbSolved, 10) : 0
}

async function saveIndexAndProbSolved() {
  const storedIndex = await storage.get(INDEX_KEY)
  const storedProbSolved = await storage.get(PROBSOLVED_KEY)

  if (
    storedIndex !== currIndex.toString() ||
    storedProbSolved !== probSolved.toString()
  ) {
    await storage.set(INDEX_KEY, currIndex.toString())
    await storage.set(PROBSOLVED_KEY, probSolved.toString())
  }
}

chrome.tabs.onCreated.addListener(async function (tab) {
  console.log("Tab created:", tab)
  await setStatusFalse()
  await loadIndexAndProbSolved() // Load from storage

  if (probSolved < 2) {
    console.log("Checking status for problem:", probs[currIndex].lcLink)
    addWebRequestListener()
    matchingUrl = ""
    let url = probs[currIndex].lcLink
    let problemStatus = await checkStatus(url)
    console.log("Problem status", problemStatus)
    while (currIndex < probs.length && problemStatus === true) {
      currIndex++
      url = probs[currIndex].lcLink
      problemStatus = await checkStatus(url)
      console.log("Problem status", problemStatus)
    }

    if (currIndex < probs.length && probSolved < 2) {
      const redirectUrl = await getProblemLinkAtIndex(probs, currIndex) // Await the URL
      console.log("Redirecting to:", redirectUrl)
      setRedirectRuleForTab(redirectUrl)
    }
  }
})

function webRequestListener(details) {
  if (matchingUrl === "" && isLeetCodeSubmissionUrl(details.url)) {
    const lcLink = probs[currIndex].lcLink
    checkStatus(lcLink).then((problemStatus) => {
      if (problemStatus === false) {
        console.log("URL is a LeetCode submission URL")
        matchingUrl = details.url
        setTimeout(() => {
          fetchAndCheckObjects(matchingUrl).then(async (isAccepted) => {
            if (isAccepted) {
              probSolved++
              // Update currIndex and save
              currIndex++
              await saveIndexAndProbSolved() // Save the updated index

              chrome.webRequest.onCompleted.removeListener(webRequestListener)
              webRequestListenerAdded = false
              matchingUrl = ""
              console.log("Accepted submission, moving to next problem")

              await updateStatusTrue(lcLink)
              console.log("Problem state saved successfully")

              if (probSolved === 2) {
                chrome.declarativeNetRequest.updateDynamicRules({
                  removeRuleIds: [Rule_ID]
                })
              }
            }
          })
        }, 2000) // Delay fetchAndCheckObjects
      } else {
        console.log("Problem already solved, ignoring URL")
      }
    })
  } else if (matchingUrl !== "" && details.url !== matchingUrl) {
    // Perform actions for other URLs
  }
}

function addWebRequestListener() {
  if (!webRequestListenerAdded) {
    chrome.webRequest.onCompleted.addListener(
      webRequestListener,
      { urls: ["<all_urls>"] },
      ["responseHeaders"]
    )
    webRequestListenerAdded = true
  }
}

// Add the initial listener
addWebRequestListener()

async function setStatusFalse() {
  try {
    const batchSize = 10
    const endIndex = Math.min(false_status_count + batchSize, probsBase.length)

    for (let i = false_status_count; i < endIndex; i++) {
      await storage.set(probsBase[i].lcLink, false)
    }

    console.log(
      `Status set to false for ${false_status_count} item ${false_status_count} to ${endIndex - 1} in local storage.`
    )

    false_status_count += batchSize
    if (false_status_count >= probsBase.length) {
      false_status_count = 0
    }
  } catch (err) {
    console.error("Error setting status:", err)
  }
}

async function checkStatus(lcLink) {
  try {
    const status = await storage.get(lcLink)
    console.log(`Status for ${lcLink} is ${status}`)
    return typeof status === "string" && status === "true"
  } catch (err) {
    console.error("Error checking status:", err)
    return false
  }
}

async function updateStatusTrue(lcLink) {
  try {
    // Set the status to true in local storage
    await storage.set(lcLink, true)

    console.log(`Status updated to true for ${lcLink}`)
  } catch (err) {
    console.error("Error updating status:", err)
  }
}

async function fetchAndCheckObjects(checkUrl) {
  try {
    const response = await fetch(checkUrl)
    const data = await response.json()
    return data.status_msg === "Accepted"
  } catch (error) {
    console.error("Error fetching or parsing data:", error)
    return false
  }
}

function isLeetCodeSubmissionUrl(url) {
  const regex = /^https:\/\/leetcode\.com\/submissions\/detail\/\d+\/check\/$/
  return regex.test(url)
}

async function getProblemLinkAtIndex(probs, currIndex) {
  try {
    if (currIndex >= probs.length || currIndex < 0) {
      throw new Error(`Index ${currIndex} is out of bounds`)
    }

    return probs[currIndex].lcLink
  } catch (error) {
    console.error("Error getting problem link:", error)
    return ""
  }
}

function setRedirectRuleForTab(redirectUrl) {
  const redirectRule = {
    id: Rule_ID,
    priority: 1,
    action: {
      type: "redirect",
      redirect: { url: redirectUrl }
    },
    condition: {
      urlFilter: "*://*/*",
      excludedInitiatorDomains: ["developer.chrome.com"],
      resourceTypes: ["main_frame"]
    }
  }

  try {
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [Rule_ID],
      addRules: [redirectRule as chrome.declarativeNetRequest.Rule]
    })

    console.log("Redirect rule updated for tab:")
  } catch (error) {
    console.error("Error updating redirect rule for tab:", error)
  }
}

// Alarm Management
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    console.log("Alarm triggered, resetting probSolved count.")
    probSolved = 0
    await saveIndexAndProbSolved()
    isAlarmActive = false // Mark alarm as inactive
  }
})

async function checkAlarmState() {
  try {
    const storedData = await chrome.storage.local.get(STORAGE_KEY)
    const alarmEnabled = storedData[STORAGE_KEY] || false

    if (alarmEnabled) {
      await chrome.alarms.clear(ALARM_NAME)
      await chrome.alarms.create(ALARM_NAME, {
        periodInMinutes: ALARM_DELAY_MINUTES
      })
      console.log(`Alarm set to repeat every ${ALARM_DELAY_MINUTES} minutes!`)
      isAlarmActive = true
      return true
    } else {
      console.log("Alarm is currently disabled by user preferences.")
      return false
    }
  } catch (error) {
    console.error("Error managing alarm:", error)
    return false
  }
}

// Enable alarm on installation
chrome.runtime.onInstalled.addListener(async () => {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: true })
    console.log("Alarm enabled on installation.")
  } catch (error) {
    console.error("Error enabling alarm on installation:", error)
  }
})

// Main initialization
async function initialize() {
  await loadIndexAndProbSolved()
  addWebRequestListener()
  checkAlarmState().then((isAlarmEnabled) => {
    if (isAlarmEnabled) {
      console.log("Alarm is enabled")
    } else {
      console.log("Alarm is disabled")
    }
  })
}

initialize()
