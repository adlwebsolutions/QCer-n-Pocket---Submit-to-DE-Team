/*
 * Template Name: HCP Template
 * Description: Template Works in HCP Records, Quick View of Relevent Fields to Data Stewards.
 */
import { formatMiddleName } from "../utilies/hcp_utilites.js";
import { formatGradYr } from "../utilies/hcp_utilites.js";
import { formatValue } from "../utilies/hcp_utilites.js";
import { getAllHCOValues } from "../utilies/hcp_utilites.js";
import { validateCorporateNameAndJobTitle } from "../utilies/hcp_utilites.js";
import { validateCRR } from "../utilies/hcp_utilites.js";
import { getActiveAddressCount } from "../utilies/hcp_utilites.js";
import { formatGender } from "../utilies/hcp_utilites.js";
import { checkFellowValue } from "../utilies/hcp_utilites.js";
import { getSelectedFields } from "../utilies/hcp_utilites.js";

export const hcpTemplate = async (tabId, outputDiv) => {
  const selectedFields = await getSelectedFields();
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const getFieldValue = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.textContent.trim() : null;
      };

      const firstName = getFieldValue(
        'div[data-marker="field-read-only-value-row first_name__v"] span'
      );

      const middleName = getFieldValue(
        'div[data-marker="field-read-only-value-row middle_name__v"] span'
      );

      const lastName = getFieldValue(
        'div[data-marker="field-read-only-value-row last_name__v"] span'
      );
      const genderValue = getFieldValue(
        'div[data-marker="field-read-only-value-row gender__v"] span'
      );

      const gradYr = getFieldValue(
        'div[data-marker="field-read-only-value-row grad_year__v"] span'
      );

      const lvd = getFieldValue(
        'div[data-marker="field-read-only-value-row last_val_date__c"] span'
      );
      // ✅ License (Single unified value)
      const licenseCountEl = document.querySelector(
        '#licenses div[data-marker="section-title"] span'
      );
      let license = null;
      if (licenseCountEl) {
        const match = licenseCountEl.textContent
          .trim()
          .match(/\((\d+)\s+active\)/);
        const count = match ? parseInt(match[1], 10) : 0;
        license = count === 0 ? "No License" : "License available";
      }

      const CandidateReviewResult = document.querySelector(
        'div[data-marker="field-read-only-value-row ap_candidate_rejection_reason__c"] span'
      );

      const rejectionReasonValue = CandidateReviewResult
        ? CandidateReviewResult.textContent.trim()
        : "Not Found";

      const conformedEx = getFieldValue(
        ".column-2-group #confirmed-exceptions"
      );

      // ✅ Address (Single unified value)
      const addressCountEl = document.querySelector(
        '#addresses [data-marker="section-title"] span'
      );

      let addressCount = 0;
      if (addressCountEl) {
        const match = addressCountEl.textContent
          .trim()
          .match(/\((\d+)\s+active\)/);
        addressCount = match ? parseInt(match[1], 10) : 0;
      }
      // Optional: log notice
      const addressNotice =
        addressCount === 0 ? "No Active Add" : "Active Address available";

      const fellowValue = getFieldValue(
        'div[data-marker="field-read-only-value-row fellow__v"] span'
      );

      return [
        firstName,
        middleName,
        lastName,
        lvd,
        gradYr,
        license, // unified license value
        conformedEx,
        rejectionReasonValue,
        addressNotice,
        genderValue,
        fellowValue,
      ];
    },
  });

  const [
    firstName,
    middleName,
    lastName,
    lvd,
    gradYr,
    license,
    conformedEx,
    rejectionReasonValue,
    addressNotice,
    genderValue,
    fellowValue,
  ] = results?.[0]?.result || [];

  // ✅ Get HCO Aff Details dynamically by expanding the tab first
  const hcoAffResult = await chrome.scripting.executeScript({
    target: { tabId },
    func: getAllHCOValues, // updated function returns all HCOs
  });

  // ✅ Extract all HCOs
  const hcoDataArray = hcoAffResult?.[0]?.result || [];

  let hcoOutputHtml = "";

  if (hcoDataArray.length > 0) {
    // First, group by address
    const groupedByAddress = {};

    hcoDataArray.forEach((hco) => {
      const corporateName =
        hco.corporateName?.text || "No Corporate Name Found";
      const jobTitle = hco.jobTitle || "No Job Title Found";
      const hcoAffLVD = hco.hcoAffLVD || "No LVD Found";
      const hcoAddress = hco.hcoAddress || "No Address";

      // Normalize corporate name (take only base part before slash)
      const baseCorporateName = corporateName.split("-")[0].trim();

      // Group HCOs by address
      if (!groupedByAddress[hcoAddress]) {
        groupedByAddress[hcoAddress] = [];
      }

      groupedByAddress[hcoAddress].push({
        ...hco,
        corporateName,
        baseCorporateName,
      });
    });

    // Now check duplicates inside each address group
    for (const address in groupedByAddress) {
      const group = groupedByAddress[address];

      group.forEach((hco) => {
        // Find duplicates within same address that share same baseCorporateName
        const duplicates = group.filter(
          (other) =>
            other.baseCorporateName === hco.baseCorporateName &&
            other.corporateName !== hco.corporateName
        );

        const isDuplicate = duplicates.length > 0;

        const validation = validateCorporateNameAndJobTitle(
          hco.corporateName,
          hco.jobTitle
        );
        // ✅ Styled Duplicate Badge
        const duplicateBadge = isDuplicate
          ? `<span style="
            display:inline-block;
            padding:2px 6px;
            border-radius:4px;
            font-weight:bold;
            color:white;
            background:linear-gradient(135deg, #FFA500, #FF8C00);
          ">
          Check Same Parent HCO Exists
          </span>`
          : "";

        hcoOutputHtml += `
        <div class="hcp_aff-row ${isDuplicate ? "duplicate-hco" : ""}">
          ${formatValue("Desig", hco.corporateName, {
            validateJobTitle: (name) => validation,
          })}
          ${formatValue("Aff LVD", hco.hcoAffLVD, { isLVD: true })}
          ${duplicateBadge}
        </div>
      `;
      });
    }
  } else {
    hcoOutputHtml += `<div class="hcp-row" style="color:red; font-weight:500;padding-bottom:4px;"><strong>No HCO found</strong></div>`;
  }

  // Array to store all copied items
  let copiedItems = [];

  // Add a master copy icon inside the heading
  outputDiv.innerHTML =
    `<div class="hcp-heading-row">
      <span class="hcp-heading">HCP Record</span>
      
    <div class="gender-field" >${formatGender(genderValue)}
     
   </div>
      <span class="copy-all-icon" title="Copy All">📋</span>
   </div>` +
    `<div   class="name-field hcp-row">${formatValue("FN", firstName, {
      isFirstName: true,
      ceValue: conformedEx,
      selectedFields,
    })}
     <span class="copy-icon" data-copy="HCP Name Updated POV - " title="Copy">📝</span>
   </div>` +
    `<div class="name-field">${formatMiddleName(middleName)}</div>` +
    `<div  class="name-field hcp-row">${formatValue("LN", lastName, {
      isLastName: true,
      ceValue: conformedEx,
      selectedFields,
    })}
     <span class="copy-icon" data-copy="HCP Name Updated POV - " title="Copy">📝</span>
   </div>` +
    `<div class="hcp-row">${formatValue("LVD", lvd, { isLVD: true })}
     <span class="copy-icon" data-copy="Updated LVD" title="Copy">📝</span>
   </div>` +
    `<div class="license-field hcp-row">${formatGradYr(
      gradYr,
      license,
      selectedFields
    )}
     <span class="copy-icon" data-copy="Updated License Grad Yr - Verified in NMC/SMC" title="Copy">📝</span>
   </div>` +
    `<div class="validateCRR-field hcp-row">${formatValue(
      "CRR:",
      rejectionReasonValue,
      {
        validateJobTitle: validateCRR,
      }
    )}
     <span class="copy-icon" data-copy="Fully Validated By DS" title="Copy">📝</span>
   </div>` +
    `<div class="hcoAff-field  hcp-heading-row">
      <span class="hcp-heading">HCO Affs</span>
      <span class="copy-icon" data-copy="updated HCO Aff POV - " title="Copy">📝</span>
   </div>
   <div  class="hcoAff-field" >${hcoOutputHtml}</div>` +
    `<div class="registrar-field"  ${checkFellowValue(fellowValue)}
     
   </div>` +
    `<div  ${getActiveAddressCount(addressNotice)}
     
   </div>`;

  if (!selectedFields.includes("name")) {
    document.querySelectorAll(".name-field").forEach((el) => {
      el.style.display = "none";
    });
  }
  // Hide license fields if "license" is not selected
  if (!selectedFields.includes("registrar")) {
    document.querySelectorAll(".registrar-field").forEach((el) => {
      el.style.display = "none";
    });
  }
  // Hide license fields if "license" is not selected
  if (!selectedFields.includes("gender")) {
    document.querySelectorAll(".gender-field").forEach((el) => {
      el.style.display = "none";
    });
  }
  // Hide license fields if "license" is not selected
  if (!selectedFields.includes("license")) {
    document.querySelectorAll(".license-field").forEach((el) => {
      el.style.display = "none";
    });
  }

  // Hide license fields if "license" is not selected
  if (!selectedFields.includes("validateCRR")) {
    document.querySelectorAll(".validateCRR-field").forEach((el) => {
      el.style.display = "none";
    });
  }

  // Hide license fields if "license" is not selected
  if (!selectedFields.includes("hcoAff-field")) {
    document.querySelectorAll(".hcoAff-field").forEach((el) => {
      el.style.display = "none";
    });
  }

  // ✅ Attach listeners for individual copy icons
  document.querySelectorAll(".copy-icon").forEach((icon) => {
    icon.addEventListener("click", () => {
      const textToCopy = icon.getAttribute("data-copy") || "updated for HCP";

      navigator.clipboard.writeText(textToCopy).then(() => {
        // Save copied text in the array
        copiedItems.push(textToCopy);

        // Feedback
        icon.textContent = "✔️";
        setTimeout(() => (icon.textContent = "📝"), 1000);
      });
    });
  });

  // ✅ Attach listener for master copy-all icon
  const copyAllIcon = document.querySelector(".copy-all-icon");
  if (copyAllIcon) {
    copyAllIcon.addEventListener("click", () => {
      if (copiedItems.length === 0) {
        return;
      }

      const allText = copiedItems.join("\n"); // join all copied items
      navigator.clipboard.writeText(allText).then(() => {
        // Feedback
        copyAllIcon.textContent = "✔️";
        setTimeout(() => (copyAllIcon.textContent = "📋"), 1000);
      });
    });
  }
};
