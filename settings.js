/*
 * Snippet Name: Settings Popup
 * Description: To customize the Values to show based on Work Insturction
 */
const checkboxes = document.querySelectorAll('input[type="checkbox"]');

// Load saved state from storage
chrome.storage.local.get(["selectedFields"], (result) => {
  const savedFields = result.selectedFields || [];
  checkboxes.forEach((cb) => {
    cb.checked = savedFields.includes(cb.id);
  });
  // updateClickedFields(savedFields);
});

// Listen for checkbox changes
checkboxes.forEach((cb) => {
  cb.addEventListener("change", () => {
    chrome.storage.local.get(["selectedFields"], (result) => {
      let selectedFields = result.selectedFields || [];
      if (cb.checked) {
        if (!selectedFields.includes(cb.id)) selectedFields.push(cb.id);
      } else {
        selectedFields = selectedFields.filter((f) => f !== cb.id);
      }
      chrome.storage.local.set({ selectedFields });
      // updateClickedFields(selectedFields);
    });
  });
});

// Update clicked fields list

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
document.querySelector(".home-icon").addEventListener("click", function () {
  window.location.href = "popup.html"; // Load document.html in the same popup
});
