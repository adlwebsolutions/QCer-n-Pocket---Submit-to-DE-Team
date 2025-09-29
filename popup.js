/*
 * Popup Name: Qcer'n Pocket
 * Description: Detect the page and show the Quick view, based on the Record
 */
import { hcpTemplate } from "./templates/hcp_template.js";

document.addEventListener("DOMContentLoaded", async () => {
  const outputDiv = document.getElementById("output");

  try {
    // Get current active tab
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.id) {
      outputDiv.textContent = "No active tab found!";
      return;
    }

    // Detect page type inside the tab
    const pageTypeResult = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Check HCP page
        const hcpEl = document.querySelector(
          'li[data-fieldname="prefix__v"] dt div span'
        );

        if (hcpEl && hcpEl.textContent.trim() === "Prefix") {
          return "HCP";
        }

        // // Check HCO page
        // const hcoEl = document.evaluate(
        //   '//*[@id="primary"]/div[2]/ul/li[1]/dl/dt/div[1]/span[1]',
        //   document,
        //   null,
        //   XPathResult.FIRST_ORDERED_NODE_TYPE,
        //   null
        // ).singleNodeValue;

        // if (hcoEl && hcoEl.textContent.trim() === "Corporate Name") {
        //   return "HCO";
        // }

        return "Unknown";
      },
    });

    const pageType = pageTypeResult?.[0]?.result;

    if (pageType === "Unknown") {
      outputDiv.textContent = "Unknown page type";
      return;
    }
    // Render HCP page logic
    if (pageType === "HCP") {
      // Run HCP template
      document
        .querySelector(".settings-icon")
        .addEventListener("click", function () {
          window.location.href = "settings.html"; // Load document.html in the same popup
        });

      await hcpTemplate(tab.id, outputDiv);
    } else if (pageType === "HCO") {
      // Render HCO page logic
      outputDiv.innerHTML = "Its HCO Page";
    } else {
      outputDiv.innerHTML = "Unknown page type";
    }
  } catch (err) {
    outputDiv.textContent = "Something went wrong!";
  }
});
