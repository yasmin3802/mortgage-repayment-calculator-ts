/* ==========================================================
   Mortgage repayment calculator (TypeScript)
   Source file: src/script.ts  ->  compiled to dist/script.js
   ========================================================== */

/* ---------- Types ---------- */

// A "union type": the only two values a mortgage type can have
type MortgageType = "repayment" | "interest-only";

// The ids of the three text inputs
type FieldId = "amount" | "term" | "rate";

// Shape of the rules for one text input
interface FieldRule {
  id: FieldId;
  label: string;
  max: number;
}

// What the calculation function needs
interface MortgageInput {
  principal: number;
  years: number;
  annualRate: number;
  type: MortgageType;
}

// What the calculation function gives back
interface MortgageResult {
  monthly: number;
  total: number;
}

/* ---------- DOM helpers ---------- */

// Finds an element by id and checks it exists and has the right type.
// <T> is a generic: callers say what kind of element they expect.
function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error(`Element #${id} not found in the page`);
  }
  return element as T;
}

const mortgageForm = getElement<HTMLFormElement>("mortgage-form");
const clearButton = getElement<HTMLButtonElement>("clear-all");

const emptyState = getElement<HTMLDivElement>("results-empty");
const doneState = getElement<HTMLDivElement>("results-done");
const monthlyOutput = getElement<HTMLParagraphElement>("monthly-result");
const totalOutput = getElement<HTMLParagraphElement>("total-result");

const typeError = getElement<HTMLParagraphElement>("type-error");
const typeInputs = mortgageForm.querySelectorAll<HTMLInputElement>('input[name="type"]');

// The three text fields share the same rules, so they live in one list
const fieldRules: FieldRule[] = [
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
function toNumber(text: string): number {
  const cleaned = text.replace(/,/g, "").trim();
  return cleaned === "" ? NaN : Number(cleaned);
}

// A "type guard": tells TypeScript that if this returns true,
// the value is definitely a MortgageType and not just any string
function isMortgageType(value: string): value is MortgageType {
  return value === "repayment" || value === "interest-only";
}

// Returns the selected mortgage type, or null if nothing is selected
function getSelectedType(): MortgageType | null {
  const checked = mortgageForm.querySelector<HTMLInputElement>(
    'input[name="type"]:checked'
  );
  if (checked !== null && isMortgageType(checked.value)) {
    return checked.value;
  }
  return null;
}

function showError(id: FieldId, message: string): void {
  const input = getElement<HTMLInputElement>(id);
  const error = getElement<HTMLParagraphElement>(`${id}-error`);
  const group = input.closest(".input-group");

  error.textContent = message;
  error.hidden = false;
  group?.classList.add("is-invalid");
  input.setAttribute("aria-invalid", "true");
}

function clearError(id: FieldId): void {
  const input = getElement<HTMLInputElement>(id);
  const error = getElement<HTMLParagraphElement>(`${id}-error`);
  const group = input.closest(".input-group");

  error.textContent = "";
  error.hidden = true;
  group?.classList.remove("is-invalid");
  input.removeAttribute("aria-invalid");
}

function showTypeError(): void {
  typeError.textContent = "This field is required";
  typeError.hidden = false;
}

function clearTypeError(): void {
  typeError.textContent = "";
  typeError.hidden = true;
}

/* ---------- Validation ---------- */

// Returns the first invalid element (so we can focus it), or null if all is well
function validate(): HTMLElement | null {
  let firstInvalid: HTMLElement | null = null;

  fieldRules.forEach(({ id, label, max }) => {
    const input = getElement<HTMLInputElement>(id);
    const raw = input.value.trim();
    const value = toNumber(raw);
    let message = "";

    if (raw === "") {
      message = "This field is required";
    } else if (Number.isNaN(value) || value <= 0) {
      message = `Enter a ${label} greater than 0`;
    } else if (value > max) {
      message = `Enter a ${label} of ${max.toLocaleString("en-GB")} or less`;
    }

    if (message !== "") {
      showError(id, message);
      firstInvalid ??= input;
    } else {
      clearError(id);
    }
  });

  if (getSelectedType() === null) {
    showTypeError();
    firstInvalid ??= typeInputs[0] ?? null;
  } else {
    clearTypeError();
  }

  return firstInvalid;
}

/* ---------- Calculation ---------- */

function calculate({ principal, years, annualRate, type }: MortgageInput): MortgageResult {
  const months = years * 12;
  const monthlyRate = annualRate / 100 / 12;
  let monthly: number;

  if (type === "repayment") {
    // Standard amortisation formula: M = P * r(1+r)^n / ((1+r)^n - 1)
    monthly =
      monthlyRate === 0
        ? principal / months
        : (principal * monthlyRate * (1 + monthlyRate) ** months) /
          ((1 + monthlyRate) ** months - 1);
  } else {
    // Interest only: you just pay the interest each month
    monthly = principal * monthlyRate;
  }

  return { monthly, total: monthly * months };
}

/* ---------- Results ---------- */

function showResults({ monthly, total }: MortgageResult): void {
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

function resetResults(): void {
  emptyState.hidden = false;
  doneState.hidden = true;
  monthlyOutput.textContent = "";
  totalOutput.textContent = "";
}

/* ---------- Events ---------- */

// "SubmitEvent" tells TypeScript what kind of event this is
mortgageForm.addEventListener("submit", (event: SubmitEvent) => {
  event.preventDefault();

  const firstInvalid = validate();
  if (firstInvalid !== null) {
    resetResults();
    firstInvalid.focus();
    return;
  }

  const type = getSelectedType();
  if (type === null) return; // can't happen after validate(), but TypeScript wants the check

  const result = calculate({
    principal: toNumber(getElement<HTMLInputElement>("amount").value),
    years: toNumber(getElement<HTMLInputElement>("term").value),
    annualRate: toNumber(getElement<HTMLInputElement>("rate").value),
    type,
  });
  showResults(result);
});

// Only allow digits, commas and a decimal point; clear the error while typing
fieldRules.forEach(({ id }) => {
  const input = getElement<HTMLInputElement>(id);

  input.addEventListener("input", () => {
    input.value = input.value.replace(/[^0-9.,]/g, "");
    clearError(id);
  });
});

// Add thousands separators to the amount when leaving the field: 300000 -> 300,000
getElement<HTMLInputElement>("amount").addEventListener("blur", (event: FocusEvent) => {
  const input = event.target as HTMLInputElement;
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
  getElement<HTMLInputElement>("amount").focus();
});