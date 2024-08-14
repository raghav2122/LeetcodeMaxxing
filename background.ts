import * as probs from "leetcode-problems/striver191Probs.json"
import * as probsBase from "leetcode-problems/striverDSAbegineer.json"

import { excludedSites } from "~constants/excluded-sites"

import { storage } from "./storage"

const Rule_ID = 1
const INDEX_KEY = "currIndex"
const PROBSOLVED_KEY = "probSolved"
const STORAGE_KEY = "user-preference-alarm-enabled"
const ALARM_NAME = "my-alarm"
const ALARM_DELAY_MINUTES = 1440 // 24 hours

let webRequestListenerAdded = false
let matchingUrl = ""
let false_status_count = 0

// Load and initialize state variables
let currIndex = 0
let probSolved = 0
let isAlarmActive = false // Flag to track alarm state

// Function to load index and problem solved count from storage
async function loadIndexAndProbSolved() {
  console.log("Loading index and probSolved from storage")
  const storedIndex = await storage.get(INDEX_KEY)
  const storedProbSolved = await storage.get(PROBSOLVED_KEY)
  currIndex = storedIndex ? parseInt(storedIndex, 10) : 0
  probSolved = storedProbSolved ? parseInt(storedProbSolved, 10) : 0
}

// Function to save index and problem solved count to storage
async function saveIndexAndProbSolved() {
  console.log("Saving index and probSolved to storage")
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

// Event listener for when a new tab is created
chrome.tabs.onCreated.addListener(async function (tab) {
  console.log("Tab created:", tab)
  await setStatusFalse() // Call to set all statuses to false in storage
  await loadIndexAndProbSolved() // Load index and probSolved from storage

  if (probSolved < 2) {
    console.log("Checking status for problem:", probs[currIndex].lcLink)
    addWebRequestListener() // Add a listener for web requests
    matchingUrl = ""
    let url = probs[currIndex].lcLink
    let problemStatus = await checkStatus(url) // Check if the current problem is solved
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
      setRedirectRuleForTab(redirectUrl) // Set a rule to redirect to the next problem
    }
  }
})

// Web request listener function to handle LeetCode submission URLs
function webRequestListener(details) {
  console.log("WebRequestListener triggered")
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
              console.log(
                "Problem accepted, updating status and redirecting if needed"
              )

              // Handle index update and storage based on probSolved
              if (probSolved === 2) {
                console.log("You have reached the limit of 2 problems per day!")
                chrome.declarativeNetRequest.updateDynamicRules({
                  removeRuleIds: [Rule_ID]
                })
              } else {
                currIndex++ // Move to the next problem
                currIndex = currIndex % probs.length // Wrap around if the end is reached
                await saveIndexAndProbSolved() // Save the updated index
                // Redirect to the next problem if needed
                if (currIndex < probs.length) {
                  const redirectUrl = await getProblemLinkAtIndex(
                    probs,
                    currIndex
                  )
                  console.log("Redirecting to:", redirectUrl)
                  setRedirectRuleForTab(redirectUrl) // Redirect to the next problem
                }
              }
              chrome.webRequest.onCompleted.removeListener(webRequestListener) // Remove the listener
              webRequestListenerAdded = false
              matchingUrl = ""
              console.log("Accepted submission, moving to next problem")

              await updateStatusTrue(lcLink) // Update the problem status to true
              console.log("Problem state saved successfully")
            }
          })
        }, 2000) // Delay fetchAndCheckObjects
      } else {
        console.log("Problem already solved, ignoring URL")
      }
    })
  } else if (matchingUrl !== "" && details.url !== matchingUrl) {
    console.log("Performing actions for other URLs")
  }
}

// Function to add a web request listener
function addWebRequestListener() {
  console.log("Adding webRequestListener")
  if (!webRequestListenerAdded) {
    chrome.webRequest.onCompleted.addListener(
      webRequestListener,
      { urls: ["<all_urls>"] },
      ["responseHeaders"]
    )
    webRequestListenerAdded = true
  }
}

// Add the initial listener when the script runs
addWebRequestListener()

// Function to set the status of problems to false in storage
async function setStatusFalse() {
  console.log("Setting status to false for a batch of problems")
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

// Function to check the status of a specific problem
async function checkStatus(lcLink) {
  console.log(`Checking status for problem: ${lcLink}`)
  try {
    const status = await storage.get(lcLink)
    console.log(`Status for ${lcLink} is ${status}`)
    return typeof status === "string" && status === "true"
  } catch (err) {
    console.error("Error checking status:", err)
    return false
  }
}

// Function to update the status of a problem to true in storage
async function updateStatusTrue(lcLink) {
  console.log(`Updating status to true for problem: ${lcLink}`)
  try {
    // Set the status to true in local storage
    await storage.set(lcLink, true)

    console.log(`Status updated to true for ${lcLink}`)
  } catch (err) {
    console.error("Error updating status:", err)
  }
}

// Function to fetch data from a URL and check if the problem was accepted
async function fetchAndCheckObjects(checkUrl) {
  console.log(`Fetching and checking objects from URL: ${checkUrl}`)
  try {
    const response = await fetch(checkUrl)
    const data = await response.json()
    return data.status_msg === "Accepted"
  } catch (error) {
    console.error("Error fetching or parsing data:", error)
    return false
  }
}

// Function to check if the URL is a LeetCode submission URL
function isLeetCodeSubmissionUrl(url) {
  console.log(`Checking if URL is a LeetCode submission URL: ${url}`)
  const regex = /^https:\/\/leetcode\.com\/submissions\/detail\/\d+\/check\/$/
  return regex.test(url)
}

// Function to get the problem link at the current index
async function getProblemLinkAtIndex(probs, currIndex) {
  console.log(`Getting problem link at index: ${currIndex}`)
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

// Function to set a redirect rule for the current tab
function setRedirectRuleForTab(redirectUrl) {
  console.log(`Setting redirect rule for URL: ${redirectUrl}`)
  const redirectRule = {
    id: Rule_ID,
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
      removeRuleIds: [Rule_ID],
      addRules: [redirectRule as chrome.declarativeNetRequest.Rule]
    })

    console.log("Redirect rule set successfully")
  } catch (error) {
    console.error("Error setting redirect rule:", error)
  }
}
