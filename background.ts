import * as probs from "leetcode-problems/striver191Probs.json"
import * as probsBase from "leetcode-problems/striverDSAbegineer.json"

import { Storage } from "@plasmohq/storage"

import { excludedSites } from "~constants/excluded-sites"

const storage = new Storage()

const Rule_ID = 1
const INDEX_KEY = "currIndex"
const PROBSOLVED_KEY = "probSolved"
const STORAGE_KEY = "user-preference-alarm-enabled"
const ALARM_NAME = "my-alarm"
const ALARM_DELAY_MINUTES = 1440 // 24 hours

let webRequestListenerAdded = false
let matchingUrl = ""
let false_status_count = 0

// Initialize state variables
let currIndex = 0
let probSolved = 0
let isAlarmActive = false // Flag to track alarm state

// Check if the extension is enabled
async function isExtensionEnabled() {
  const extensionEnabled = await storage.get("extensionEnabled")
  return extensionEnabled === "true"
}

// Initialize and run the extension
async function initializeExtension() {
  if (await isExtensionEnabled()) {
    console.log("Extension is enabled. Executing the script.")

    // Load index and problem solved count from storage
    async function loadIndexAndProbSolved() {
      console.log("Loading index and probSolved from storage")
      currIndex = parseInt((await storage.get(INDEX_KEY)) || "0", 10)
      probSolved = parseInt((await storage.get(PROBSOLVED_KEY)) || "0", 10)
    }

    // Save index and problem solved count to storage
    async function saveIndexAndProbSolved() {
      console.log("Saving index and probSolved to storage")
      await storage.set(INDEX_KEY, currIndex.toString())
      await storage.set(PROBSOLVED_KEY, probSolved.toString())
    }

    // Event listener for new tabs
    chrome.tabs.onCreated.addListener(async (tab) => {
      console.log("Tab created:", tab)
      await setStatusFalse() // Reset statuses
      await loadIndexAndProbSolved()

      if (probSolved < 2) {
        console.log("Checking status for problem:", probs[currIndex].lcLink)
        addWebRequestListener()
        matchingUrl = ""
        let url = probs[currIndex].lcLink
        let problemStatus = await checkStatus(url)
        console.log("Problem status", problemStatus)

        while (currIndex < probs.length && problemStatus) {
          currIndex++
          url = probs[currIndex].lcLink
          problemStatus = await checkStatus(url)
          console.log("Problem status", problemStatus)
        }

        if (currIndex < probs.length && probSolved < 2) {
          const redirectUrl = await getProblemLinkAtIndex(probs, currIndex)
          console.log("Redirecting to:", redirectUrl)
          setRedirectRuleForTab(redirectUrl)
        }
      }
    })

    // Web request listener for LeetCode submissions
    function webRequestListener(details) {
      console.log("WebRequestListener triggered")

      if (matchingUrl === "" && isLeetCodeSubmissionUrl(details.url)) {
        const lcLink = probs[currIndex].lcLink
        checkStatus(lcLink).then(async (problemStatus) => {
          if (!problemStatus) {
            console.log("URL is a LeetCode submission URL")
            matchingUrl = details.url
            setTimeout(async () => {
              const isAccepted = await fetchAndCheckObjects(matchingUrl)
              if (isAccepted) {
                probSolved++
                console.log(
                  "Problem accepted, updating status and redirecting if needed"
                )

                if (probSolved === 2) {
                  console.log(
                    "You have reached the limit of 2 problems per day!"
                  )
                  chrome.declarativeNetRequest.updateDynamicRules({
                    removeRuleIds: [Rule_ID]
                  })
                } else {
                  currIndex = (currIndex + 1) % probs.length
                  await saveIndexAndProbSolved()

                  if (currIndex < probs.length) {
                    const redirectUrl = await getProblemLinkAtIndex(
                      probs,
                      currIndex
                    )
                    console.log("Redirecting to:", redirectUrl)
                    setRedirectRuleForTab(redirectUrl)
                  }
                }
                chrome.webRequest.onCompleted.removeListener(webRequestListener)
                webRequestListenerAdded = false
                matchingUrl = ""
                console.log("Accepted submission, moving to next problem")
                await updateStatusTrue(lcLink)
                console.log("Problem state saved successfully")
              }
            }, 2000)
          } else {
            console.log("Problem already solved, ignoring URL")
          }
        })
      }
    }

    // Add a web request listener
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

    addWebRequestListener()

    // Set the status of problems to false in storage
    async function setStatusFalse() {
      console.log("Setting status to false for a batch of problems")
      try {
        const batchSize = 10
        const endIndex = Math.min(
          false_status_count + batchSize,
          probsBase.length
        )

        for (let i = false_status_count; i < endIndex; i++) {
          await storage.set(probsBase[i].lcLink, false)
        }

        console.log(
          `Status set to false for problems ${false_status_count} to ${endIndex - 1}`
        )

        false_status_count = endIndex
        if (false_status_count >= probsBase.length) {
          false_status_count = 0
        }
      } catch (err) {
        console.error("Error setting status:", err)
      }
    }

    // Check the status of a specific problem
    async function checkStatus(lcLink) {
      console.log(`Checking status for problem: ${lcLink}`)
      try {
        const status = await storage.get(lcLink)
        console.log(`Status for ${lcLink} is ${status}`)
        return status === "true"
      } catch (err) {
        console.error("Error checking status:", err)
        return false
      }
    }

    // Update the status of a problem to true in storage
    async function updateStatusTrue(lcLink) {
      console.log(`Updating status to true for problem: ${lcLink}`)
      try {
        await storage.set(lcLink, true)
        console.log(`Status updated to true for ${lcLink}`)
      } catch (err) {
        console.error("Error updating status:", err)
      }
    }

    // Fetch data from a URL and check if the problem was accepted
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

    // Check if the URL is a LeetCode submission URL
    function isLeetCodeSubmissionUrl(url) {
      console.log(`Checking if URL is a LeetCode submission URL: ${url}`)
      const regex =
        /^https:\/\/leetcode\.com\/submissions\/detail\/\d+\/check\/$/
      return regex.test(url)
    }

    // Get the problem link at the current index
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

    // Set a redirect rule for the current tab
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
  } else {
    console.log("Extension is disabled. Exiting the script.")
  }
}

// Initialize the extension
initializeExtension()
