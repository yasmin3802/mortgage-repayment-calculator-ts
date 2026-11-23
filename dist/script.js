"use strict";
/* ==========================================================
   Mortgage repayment calculator (TypeScript)
   Source file: src/script.ts  ->  compiled to dist/script.js
   ========================================================== */
/* ---------- DOM helpers ---------- */
// Finds an element by id and checks it exists and has the right type.
// <T> is a generic: callers say what kind of element they expect.
function getElement(id) {
    const element = document.getElementById(id);
    if (element === null) {
        throw new Error(`Element #${id} not found in the page`);
    }
    return element;
}
const mortgageForm = getElement("mortgage-form");
const clearButton = getElement("clear-all");
const emptyState = getElement("results-empty");
const doneState = getElement("results-done");
const monthlyOutput = getElement("monthly-result");
const totalOutput = getElement("total-result");
const typeError = getElement("type-error");
const typeInputs = mortgageForm.querySelectorAll('input[name="type"]');
// The three text fields share the same rules, so they live in one list
const fieldRules = [
    { id: "amount", label: "mortgage amount", max: 1_000_000_000 },
    { id: "term", label: "mortgage term", max: 100 },
    { id: "rate", label: "interest rate", max: 100 },
];
const currencyFormat = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});
/* ---------- Helpers ---------- */
// "300,000" -> 300000 (returns NaN if it isn't a number)
function toNumber(text) {
    const cleaned = text.replace(/,/g, "").trim();
    return cleaned === "" ? NaN : Number(cleaned);
}
// A "type guard": tells TypeScript that if this returns true,
// the value is definitely a MortgageType and not just any string
function isMortgageType(value) {
    return value === "repayment" || value === "interest-only";
}
// Returns the selected mortgage type, or null if nothing is selected
function getSelectedType() {
    const checked = mortgageForm.querySelector('input[name="type"]:checked');
    if (checked !== null && isMortgageType(checked.value)) {
        return checked.value;
    }
    return null;
}
function showError(id, message) {
    const input = getElement(id);
    const error = getElement(`${id}-error`);
    const group = input.closest(".input-group");
    error.textContent = message;
    error.hidden = false;
    group?.classList.add("is-invalid");
    input.setAttribute("aria-invalid", "true");
}
function clearError(id) {
    const input = getElement(id);
    const error = getElement(`${id}-error`);
    const group = input.closest(".input-group");
    error.textContent = "";
    error.hidden = true;
    group?.classList.remove("is-invalid");
    input.removeAttribute("aria-invalid");
}
function showTypeError() {
    typeError.textContent = "This field is required";
    typeError.hidden = false;
}
function clearTypeError() {
    typeError.textContent = "";
    typeError.hidden = true;
}
/* ---------- Validation ---------- */
// Returns the first invalid element (so we can focus it), or null if all is well
function validate() {
    let firstInvalid = null;
    fieldRules.forEach(({ id, label, max }) => {
        const input = getElement(id);
        const raw = input.value.trim();
        const value = toNumber(raw);
        let message = "";
        if (raw === "") {
            message = "This field is required";
        }
        else if (Number.isNaN(value) || value <= 0) {
            message = `Enter a ${label} greater than 0`;
        }
        else if (value > max) {
            message = `Enter a ${label} of ${max.toLocaleString("en-GB")} or less`;
        }
        if (message !== "") {
            showError(id, message);
            firstInvalid ??= input;
        }
        else {
            clearError(id);
        }
    });
    if (getSelectedType() === null) {
        showTypeError();
        firstInvalid ??= typeInputs[0] ?? null;
    }
    else {
        clearTypeError();
    }
    return firstInvalid;
}
/* ---------- Calculation ---------- */
function calculate({ principal, years, annualRate, type }) {
    const months = years * 12;
    const monthlyRate = annualRate / 100 / 12;
    let monthly;
    if (type === "repayment") {
        // Standard amortisation formula: M = P * r(1+r)^n / ((1+r)^n - 1)
        monthly =
            monthlyRate === 0
                ? principal / months
                : (principal * monthlyRate * (1 + monthlyRate) ** months) /
                    ((1 + monthlyRate) ** months - 1);
    }
    else {
        // Interest only: you just pay the interest each month
        monthly = principal * monthlyRate;
    }
    return { monthly, total: monthly * months };
}
/* ---------- Results ---------- */
function showResults({ monthly, total }) {
    monthlyOutput.textContent = currencyFormat.format(monthly);
    totalOutput.textContent = currencyFormat.format(total);
    emptyState.hidden = true;
    doneState.hidden = false;
    // On small screens the results sit below the form, so bring them into view
    if (window.matchMedia("(max-width: 49.9375rem)").matches) {
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        doneState.scrollIntoView({
            behavior: reduceMotion ? "auto" : "smooth",
            block: "start",
        });
    }
}
function resetResults() {
    emptyState.hidden = false;
    doneState.hidden = true;
    monthlyOutput.textContent = "";
    totalOutput.textContent = "";
}
/* ---------- Events ---------- */
// "SubmitEvent" tells TypeScript what kind of event this is
mortgageForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const firstInvalid = validate();
    if (firstInvalid !== null) {
        resetResults();
        firstInvalid.focus();
        return;
    }
    const type = getSelectedType();
    if (type === null)
        return; // can't happen after validate(), but TypeScript wants the check
    const result = calculate({
        principal: toNumber(getElement("amount").value),
        years: toNumber(getElement("term").value),
        annualRate: toNumber(getElement("rate").value),
        type,
    });
    showResults(result);
});
// Only allow digits, commas and a decimal point; clear the error while typing
fieldRules.forEach(({ id }) => {
    const input = getElement(id);
    input.addEventListener("input", () => {
        input.value = input.value.replace(/[^0-9.,]/g, "");
        clearError(id);
    });
});
// Add thousands separators to the amount when leaving the field: 300000 -> 300,000
getElement("amount").addEventListener("blur", (event) => {
    const input = event.target;
    const value = toNumber(input.value);
    if (!Number.isNaN(value) && value > 0) {
        input.value = value.toLocaleString("en-GB", { maximumFractionDigits: 2 });
    }
});
typeInputs.forEach((radio) => {
    radio.addEventListener("change", clearTypeError);
});
clearButton.addEventListener("click", () => {
    mortgageForm.reset();
    fieldRules.forEach(({ id }) => clearError(id));
    clearTypeError();
    resetResults();
    getElement("amount").focus();
});
//# sourceMappingURL=script.js.map