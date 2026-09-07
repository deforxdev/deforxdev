const expressionElement = document.querySelector("#expression");
const resultElement = document.querySelector("#result");
const statusElement = document.querySelector("#status-label");
const historyList = document.querySelector("#history-list");
const calculator = document.querySelector(".calculator-card");

const state = {
  current: "0",
  stored: null,
  operation: null,
  waitingForOperand: false,
  expression: "0",
  history: JSON.parse(localStorage.getItem("nova-calculator-history") || "[]"),
};

const operationSymbols = {
  add: "+",
  subtract: "−",
  multiply: "×",
  divide: "÷",
};

function formatNumber(value) {
  if (!Number.isFinite(value)) return "Error";
  const rounded = Number.parseFloat(value.toPrecision(12));
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 }).format(rounded);
}

function rawNumber(value) {
  return Number(value.replaceAll(",", ""));
}

function render() {
  expressionElement.textContent = state.expression;
  resultElement.textContent = state.current;
  renderHistory();
}

function setStatus(text) {
  statusElement.textContent = text;
}

function inputNumber(number) {
  if (state.waitingForOperand || state.current === "Error") {
    state.current = number;
    state.waitingForOperand = false;
  } else {
    state.current = state.current === "0" ? number : `${state.current}${number}`;
  }

  state.expression = state.current;
  setStatus("Typing");
  render();
}

function inputDecimal() {
  if (state.waitingForOperand || state.current === "Error") {
    state.current = "0.";
    state.waitingForOperand = false;
  } else if (!state.current.includes(".")) {
    state.current += ".";
  }

  state.expression = state.current;
  setStatus("Typing");
  render();
}

function calculate(first, second, operation) {
  switch (operation) {
    case "add":
      return first + second;
    case "subtract":
      return first - second;
    case "multiply":
      return first * second;
    case "divide":
      return second === 0 ? Number.NaN : first / second;
    default:
      return second;
  }
}

function chooseOperation(operation) {
  const value = rawNumber(state.current);

  if (state.operation && state.stored !== null && !state.waitingForOperand) {
    const next = calculate(state.stored, value, state.operation);
    state.stored = next;
    state.current = formatNumber(next);
  } else {
    state.stored = value;
  }

  state.operation = operation;
  state.waitingForOperand = true;
  state.expression = `${formatNumber(state.stored)} ${operationSymbols[operation]}`;
  setStatus("Choose a number");
  render();
}

function commitResult() {
  if (!state.operation || state.stored === null) return;

  const second = rawNumber(state.current);
  const expression = `${formatNumber(state.stored)} ${operationSymbols[state.operation]} ${formatNumber(second)}`;
  const result = calculate(state.stored, second, state.operation);
  const formattedResult = formatNumber(result);

  state.current = formattedResult;
  state.expression = `${expression} =`;
  state.operation = null;
  state.stored = null;
  state.waitingForOperand = true;
  setStatus(formattedResult === "Error" ? "Cannot divide by zero" : "Calculated");

  if (formattedResult !== "Error") {
    state.history.unshift({ expression, result: formattedResult });
    state.history = state.history.slice(0, 8);
    localStorage.setItem("nova-calculator-history", JSON.stringify(state.history));
  }

  render();
}

function clearCalculator() {
  state.current = "0";
  state.stored = null;
  state.operation = null;
  state.waitingForOperand = false;
  state.expression = "0";
  setStatus("Ready");
  render();
}

function toggleSign() {
  if (state.current === "0" || state.current === "Error") return;
  state.current = state.current.startsWith("-") ? state.current.slice(1) : `-${state.current}`;
  state.expression = state.current;
  render();
}

function inputPercent() {
  if (state.current === "Error") return;
  state.current = formatNumber(rawNumber(state.current) / 100);
  state.expression = `${state.current}%`;
  setStatus("Percentage");
  render();
}

function backspace() {
  if (state.waitingForOperand || state.current === "Error") return;
  state.current = state.current.length > 1 ? state.current.slice(0, -1) : "0";
  state.expression = state.current;
  render();
}

function renderHistory() {
  if (!state.history.length) {
    historyList.innerHTML = '<p class="empty-state">Your calculations will appear here.</p>';
    return;
  }

  historyList.innerHTML = state.history
    .map(
      ({ expression, result }) => `
        <div class="history-item">
          <span class="history-expression">${expression}</span>
          <span class="history-result">${result}</span>
        </div>
      `,
    )
    .join("");
}

function handleAction(action) {
  if (action === "clear") clearCalculator();
  if (action === "decimal") inputDecimal();
  if (action === "equals") commitResult();
  if (action === "sign") toggleSign();
  if (action === "percent") inputPercent();
}

calculator.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.dataset.number) inputNumber(button.dataset.number);
  if (button.dataset.operation) chooseOperation(button.dataset.operation);
  if (button.dataset.action) handleAction(button.dataset.action);
});

document.addEventListener("keydown", (event) => {
  if (/^\d$/.test(event.key)) inputNumber(event.key);
  if (event.key === ".") inputDecimal();
  if (event.key === "Enter" || event.key === "=") commitResult();
  if (event.key === "Escape") clearCalculator();
  if (event.key === "Backspace") backspace();
  if (event.key === "+") chooseOperation("add");
  if (event.key === "-") chooseOperation("subtract");
  if (event.key === "*") chooseOperation("multiply");
  if (event.key === "/") {
    event.preventDefault();
    chooseOperation("divide");
  }
});

document.querySelector("#clear-history").addEventListener("click", () => {
  state.history = [];
  localStorage.removeItem("nova-calculator-history");
  setStatus("History cleared");
  render();
});

document.querySelector("#copy-button").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(state.current);
    setStatus("Copied");
  } catch {
    setStatus("Copy unavailable");
  }
});

render();
