/*
 * Snippets Name: HCP Template Snippets
 * Description: Snippets Works for HCP Templates
 */
export const getFieldValue = (selector) => {
  const el = document.querySelector(selector);
  return el ? el.textContent.trim() : null;
};
export const getSelectedFields = () => {
  return new Promise((resolve) => {
    chrome.storage.local.get(["selectedFields"], (result) => {
      resolve(result.selectedFields || []); // return empty array if nothing saved
    });
  });
};

// Function to validate Grad Yr vs License (simplified)
export const formatGradYr = (gradYr, license, selectedFields) => {
  const grad = gradYr?.trim() || "";
  const lic = license?.trim() || "";

  // ✅ Hide license section if "license" is not selected
  if (!selectedFields.includes("license")) {
    return ""; // skip output entirely
  }

  // Helper to wrap text with gradient badge style
  const badge = (text, gradientColors = "#28A745, #1E7E34") => `
    <span style="
      display:inline-block;
      margin-left:10px;
      padding:2px 8px;
      border-radius:4px;
      font-weight:bold;
      color:white;
      background:linear-gradient(135deg, ${gradientColors});
    ">
      ${text}
    </span>`;

  // Case 0: Nothing available → red "Not Found"
  if (!grad && !lic) {
    return `<p><strong>GradYr&Lic:</strong>${badge(
      "Not Found",
      "#FF4D4D, #B22222"
    )}</p>`;
  }

  // ✅ Case 1: License exists but Grad Yr missing or "No Value" → red "Update GradYr"
  if (grad === "No Value" && lic === "License available") {
    return `<p><strong>GradYr & Lic:</strong>${badge(
      "Update GradYr",
      "#FF4D4D, #B22222"
    )}</p>`;
  }

  // ✅ Case 2: GradYr exists but No License available → blue "Remove GradYr"
  if (grad && grad !== "No Value" && lic === "No License") {
    return `<p><strong>GradYr & Lic:</strong>${badge(
      "Remove GradYr",
      "#FF4D4D, #B22222"
    )}</p>`;
  }

  // Case 1: No License → orange "No Lic"
  if (grad === "No Value" && lic === "No License") {
    return `<p><strong>GradYr & Lic:</strong>${badge(
      "No Lic",
      "#FFA500, #FF8C00"
    )}</p>`;
  }

  // Case 3: Grad Yr exists and License available → green "Avail License"
  if (grad && grad !== "No Value" && lic === "License available") {
    return `<p><strong>GradYr & Lic:</strong>${badge("Avail Lic")}</p>`;
  }

  // Default fallback (in case of unexpected value)
  return `<p><strong>GradYr & Lic:</strong>${badge(
    "Unknown",
    "#FF4D4D, #B22222"
  )}</p>`;
};

export const formatMiddleName = (value) => {
  if (!value || !value.trim() || value.trim() === "No Value") {
    // Invisible / do not show anything
    return "";
  }

  // Any other value → red bold
  return `<p><strong>Middle Name:</strong>
    <span style="
      display:inline-block;
      margin-left:10px;
      padding:2px 6px;
      border-radius:4px;
      font-weight:bold;
      color:white;
      background:linear-gradient(135deg, #ff4d4d, #b22222);
    ">
      ${value.trim()} - Remove
    </span>
  </p>`;
};

// Helper to format output
export const formatValue = (label, value, options = {}) => {
  const {
    isFirstName = false,
    isLastName = false,
    isLVD = false,
    validateJobTitle = null,
    ceValue = null,
    selectedFields = [],
  } = options;

  if (!value) return `<p><strong>${label}:</strong> Not Found</p>`;

  // ✅ Show only first 2 words if coming from validateJobTitle
  let displayValue = value;
  if (validateJobTitle) {
    const trimmed = value.trim();
    displayValue = trimmed.length > 10 ? trimmed.slice(0, 10) + "…" : trimmed;
  }

  const isSingleLetter = value.trim().length === 1;

  // Choose validation function based on field type
  let validated = null;
  if (isFirstName) {
    validated = validateFirstName(value);
  } else if (isLVD) {
    validated = validateLVD(value);
  } else if (label === "LN" && selectedFields.includes("name")) {
    validated = validateLastName(value);
  } else if (validateJobTitle) {
    validated = validateJobTitle(value);
  }

  return `<p><strong>${label}:</strong> 
    <span style="${isSingleLetter ? "color:red; font-weight:bold;" : ""}">
      ${highlightSingleLetter(displayValue, ceValue)}
    </span>
    ${
      validated
        ? `<span style="
        display:inline-block;
        margin-left:10px;
        padding:2px 6px;
        border-radius:4px;
        font-weight:bold;
        color:white;
       background:linear-gradient(135deg, ${
         validated.valid ? "#28A745, #1E7E34" : "#ff4d4d, #b22222"
       });


      ">
        ${validated.message}
      </span>`
        : ""
    }

  </p>`;
};

// // ✅ First Name Validation Function (updated ordering & messages)
export function validateFirstName(name) {
  if (!name) return { valid: false, message: "First name not found" };

  const trimmed = name.trim();

  // Rule 1: Reject multi-word values (any spaces) => "Invalid"
  if (/\s/.test(trimmed)) {
    return { valid: false, message: "Invalid" };
  }
  // Rule 4: Only alphabets allowed (A-Z or a-z)
  if (!/^[A-Za-z]+$/.test(trimmed)) {
    return { valid: false, message: "Only alphabets allowed" };
  }

  // Rule 2: Must start with a capital letter => "Title Case" if not
  if (!/^[A-Z]/.test(trimmed)) {
    return { valid: false, message: "Title Case" };
  }

  // Rule 3: Allow single-letter, two-letter, or a single word of alphabets
  if (
    trimmed.length === 1 ||
    trimmed.length === 2 ||
    /^[A-Za-z]+$/.test(trimmed)
  ) {
    return { valid: true, message: "Valid" };
  }

  // Fallback
  return { valid: false, message: "Invalid" };
}

// ✅ Last Name Validation Function
export function validateLastName(name) {
  if (!name) return { valid: false, message: "Update LN" };

  const trimmed = name.trim();

  // ✅ New condition: If name is just a dash ("-"), consider it valid
  if (trimmed === "-") {
    return { valid: true, message: "Valid" };
  }
  // ✅ Rule 2: Only alphabets + spaces allowed (multi-word supported)
  if (!/^[A-Za-z\s]+$/.test(trimmed)) {
    return { valid: false, message: "Only alphabets" };
  }

  // Split into words and check if each starts with capital
  const words = trimmed.split(/\s+/);
  const allTitleCase = words.every((word) => /^[A-Z][a-z]*$/.test(word));

  if (!allTitleCase) {
    return { valid: false, message: "Title Case" };
  }

  return { valid: true, message: "Valid" };
}

export function validateCorporateNameAndJobTitle(corporateName, jobTitle) {
  if (!corporateName)
    return { valid: true, message: "No corporate name found." };

  // ✅ Keywords you want to check for
  const keywords = [
    "railway",
    "academy",
    "college",
    "institute",
    "cghs",
    "army",
  ];

  // Normalize everything to lowercase for comparison
  const jobTitleLower = jobTitle ? jobTitle.toLowerCase() : "no value";

  // Normalize corporate name: lowercase & remove punctuation
  const corpNameNormalized = corporateName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ") // replace anything that's not a-z, 0-9 or space with a space
    .replace(/\s+/g, " "); // collapse multiple spaces

  // Check if any keyword exists
  const containsKeyword = keywords.some((kw) =>
    corpNameNormalized.includes(kw)
  );
  if (containsKeyword && jobTitleLower === "no value") {
    return {
      valid: false,
      message: `Invalid`,
    };
  }

  if (!containsKeyword && jobTitleLower !== "no value") {
    return {
      valid: false,
      message: `Invalid`,
    };
  }

  return { valid: true, message: "Valid" };
}

// ✅ QuerySelector-based function to get all Parent HCOs
export async function getAllHCOValues(waitTime = 300) {
  // 1️⃣ Select all HCO elements with ordinal data-marker
  const hcoElements = document.querySelectorAll(
    '[data-marker^="child-object ParentHCOsItemType ordinal-"]'
  );

  if (!hcoElements || hcoElements.length === 0) return [];

  const results = [];

  for (const hco of hcoElements) {
    // Expand the HCO section if there is a collapse/expand button
    const expandBtn = hco.querySelector('[data-marker="child-object-header"]');
    const contentEl = hco.querySelector('[data-marker="child-object-content"]');

    // Determine if section is open by checking if content is visible
    const isOpen = contentEl && contentEl.offsetParent !== null;
    // (offsetParent === null means it's hidden)

    if (!isOpen && expandBtn) {
      expandBtn.click(); // open it
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    // if (expandBtn) expandBtn.click();

    // Wait for content to load
    // await new Promise((resolve) => setTimeout(resolve, waitTime));

    // Corporate Name
    const corporateNameEl = hco.querySelector(
      '[data-marker="phco-summary-corporate-name-field"] a'
    );
    const corporateName = corporateNameEl
      ? {
          text: corporateNameEl.innerText.trim(),
          href: corporateNameEl.getAttribute("href"),
        }
      : null;

    const addressElement = hco.querySelector(
      'dl[data-marker="phco-summary-address-field"] dd'
    );

    // Get the text content
    const addressValue = addressElement
      ? addressElement.textContent.trim()
      : null;

    // Last Val Date (LVD)
    const lvdEl = hco.querySelector(
      'div[data-marker="field-read-only-value-row last_val_date__c"] span'
    );
    const hcoAffLVD = lvdEl ? lvdEl.innerText.trim() : null;

    // Job Title
    const jobTitleEl = hco.querySelector(
      'div[data-marker="field-read-only-value-row job_title__c"] span'
    );
    const jobTitle = jobTitleEl ? jobTitleEl.innerText.trim() : null;

    results.push({
      corporateName,
      hcoAffLVD,
      jobTitle,
      addressValue,
    });

    // // ✅ Close tab if we had to open it
    if (!isOpen && expandBtn) {
      expandBtn.click();
    }
  }

  return results;
}

// 🔹 Function to check single letter and highlight
export const highlightSingleLetter = (value, ceValue) => {
  if (!value) return "Not Found";

  const trimmed = value.trim();

  // Only for single-letter first names
  if (trimmed.length === 1) {
    if (!ceValue) {
      // CE XPath is null → show Add CE
      return `<span style="color:red; font-weight:bold;">${trimmed} - Add CE</span>`;
    }

    // Remove leading number(s) and optional space
    const cleanedCE = ceValue.replace(/^\d+\s*/, "");

    // CE XPath indicates confirmed exception → show Check CE
    if (cleanedCE === "Confirmed Exception") {
      return `<span style="color:#FF6A00; font-weight:bold;">${trimmed} - Check CE</span>`;
    }

    // Any other CE value → just show single letter normally
    return `<span style="color:red; font-weight:bold;">${trimmed}</span>`;
  }

  return trimmed;
};

// ✅ LVD Validation Function
export function validateLVD(dateString) {
  if (!dateString) return { valid: false, message: "LVD not found" };

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const trimmed = dateString.trim();

  if (trimmed === today) {
    return { valid: true, message: `LVD is Today` };
  }

  return { valid: false, message: `Update LVD` };
}

export const validateCRR = (value) => {
  if (!value) {
    return { valid: false, message: "Upd-FV" };
  }

  const trimmedValue = value.trim().toLowerCase();

  if (trimmedValue === "no value") {
    return { valid: false, message: "Upd-FV" };
  }

  if (trimmedValue === "fully validated by ds") {
    return { valid: true, message: "Fully Valid" };
  }

  if (trimmedValue === "out of scope") {
    return { valid: false, message: "OOS" };
  }

  // Any other value
  return { valid: false, message: "Upd-FV" };
};

// ✅ Get Active Address Count with full formatValue style + validation badge
export function getActiveAddressCount(count) {
  // If no active addresses → red bold notice
  if (count === "No Active Add") {
    const validated = { valid: false, message: "Activate It" }; // simulate validation
    const validationHtml = `<span style="
      display:inline-block;
      margin-left:10px;
      margin-top:10px;
      padding:2px 6px;
      border-radius:4px;
      font-weight:bold;
      color:white;
      background:linear-gradient(135deg, ${
        validated.valid ? "#28A745, #1E7E34" : "#ff4d4d, #b22222"
      });
    ">
      ${validated.message}
    </span>`;

    return `<p>
              <strong style="font-size:12px">No Active Address:</strong> 
              <span style="color:red; font-weight:bold;">-</span>
              ${validationHtml}
            </p>`;
  }
}

export function formatGender(gender) {
  // If male or female → do nothing / return empty string
  if (
    gender &&
    (gender.toLowerCase() === "male" || gender.toLowerCase() === "female")
  ) {
    return "";
  }

  // For no value or any other value → return Update Gender notice
  return `<p>
      <span style="
        display:inline-block;
        padding:2px 6px;
        border-radius:4px;
        font-weight:bold;
        color:white;
        font-size:12px;
        background: linear-gradient(135deg, #ff4d4d, #b22222);
      ">
        Update Gender
      </span>
    </p>`;
}
//Get Registrar Value
export function checkFellowValue(fellowValue) {
  // ✅ If value is "No/False", do not return anything
  if (!fellowValue || fellowValue.toLowerCase() === "no/false") {
    return ""; // nothing to render
  }

  // ✅ Otherwise → Show "Update Registrar" notice
  const validated = { valid: false, message: "Update No/False" };
  const validationHtml = `<span style="
      display:inline-block;
      margin-left:10px;
      margin-top:10px;
      padding:2px 6px;
      border-radius:4px;
      font-weight:bold;
      color:white;
      background:linear-gradient(135deg, #ff4d4d, #b22222);
    ">
      ${validated.message}
    </span>`;

  return `<p>
            <strong style="font-size:12px">Registrar:</strong> 
                        ${validationHtml}
          </p>`;
}

export const formatCRRStatus = (validateCRR) => {
  let text = "";
  let gradient = "";

  // Determine the text and gradient based on validateCRR value
  switch (validateCRR) {
    case "No Value":
      text = "Update FV";
      gradient = "#FF4D4D, #B22222"; // red
      break;
    case "Fully validated by DS":
      text = "Fully valid";
      gradient = "#28A745, #1E7E34"; // green
      break;
    case "Out of scope":
    case "OOS":
      text = "OOS";
      gradient = "#FFA500, #FF8C00"; // orange
      break;
    default:
      text = "Unknown";
      gradient = "#6c757d, #495057"; // grey fallback
      break;
  }

  // Return the styled HTML
  return `<strong>CRR:</strong><span style="
    display:inline-block;
    margin-left:10px;
    padding:2px 6px;
    border-radius:4px;
    font-weight:bold;
    color:white;
    background:linear-gradient(135deg, ${gradient});
  ">
     ${text}
  </span>`;
};
