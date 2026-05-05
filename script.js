const WEBHOOK_URL = "https://mbaghdadi6g.app.n8n.cloud/webhook/fraud-check";

const textInput = document.getElementById("textInput");
const charCount = document.getElementById("charCount");
const imageInput = document.getElementById("imageInput");
const dropZone = document.getElementById("dropZone");
const fileName = document.getElementById("fileName");

const analyzeTextBtn = document.getElementById("analyzeTextBtn");
const analyzeImageBtn = document.getElementById("analyzeImageBtn");

const resultsPanel = document.getElementById("resultsPanel");
const riskScore = document.getElementById("riskScore");
const riskBadge = document.getElementById("riskBadge");
const gaugeNeedle = document.getElementById("gaugeNeedle");
const summaryText = document.getElementById("summaryText");
const redFlagsList = document.getElementById("redFlagsList");
const nextStepsList = document.getElementById("nextStepsList");
const flagCount = document.getElementById("flagCount");

const viewFullBtn = document.getElementById("viewFullBtn");
const fullAnalysis = document.getElementById("fullAnalysis");
const explanationText = document.getElementById("explanationText");
const plainExplanationText = document.getElementById("plainExplanationText");
const disclaimerText = document.getElementById("disclaimerText");

const explanationKey =
  "How this tool reached its conclusion about the level of risk involved";

let selectedImageFile = null;

textInput.addEventListener("input", () => {
  charCount.textContent = `${textInput.value.length} / 3000`;
});

imageInput.addEventListener("change", () => {
  selectedImageFile = imageInput.files[0] || null;
  fileName.textContent = selectedImageFile ? selectedImageFile.name : "";
});

["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("drag-over");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("drag-over");
  });
});

dropZone.addEventListener("drop", (event) => {
  selectedImageFile = event.dataTransfer.files[0];

  if (!selectedImageFile) return;

  if (!selectedImageFile.type.startsWith("image/")) {
    alert("Please upload an image file.");
    selectedImageFile = null;
    return;
  }

  fileName.textContent = selectedImageFile.name;
});

window.addEventListener("paste", (event) => {
  const items = event.clipboardData?.items || [];

  for (const item of items) {
    if (item.type.startsWith("image/")) {
      selectedImageFile = item.getAsFile();
      fileName.textContent = selectedImageFile.name || "Pasted image";
      break;
    }
  }
});

analyzeTextBtn.addEventListener("click", async () => {
  const rawText = textInput.value.trim();

  if (!rawText) {
    alert("Please paste a suspicious message first.");
    return;
  }

  setLoading(analyzeTextBtn, true, "Analyzing...");

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        raw_text: rawText
      })
    });

    if (!response.ok) {
      throw new Error("The workflow did not return a successful response.");
    }

    const data = await response.json();
    renderResults(data);
  } catch (error) {
    showError(error);
  } finally {
    setLoading(analyzeTextBtn, false, "✦ Analyze message");
  }
});

analyzeImageBtn.addEventListener("click", async () => {
  if (!selectedImageFile) {
    alert("Please upload or paste a screenshot first.");
    return;
  }

  if (selectedImageFile.size > 10 * 1024 * 1024) {
    alert("Please upload an image smaller than 10MB.");
    return;
  }

  const formData = new FormData();
  formData.append("image", selectedImageFile);

  setLoading(analyzeImageBtn, true, "Analyzing...");

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      throw new Error("The workflow did not return a successful response.");
    }

    const data = await response.json();
    renderResults(data);
  } catch (error) {
    showError(error);
  } finally {
    setLoading(analyzeImageBtn, false, "✦ Analyze image");
  }
});

viewFullBtn.addEventListener("click", () => {
  fullAnalysis.classList.toggle("hidden");
});

function renderResults(data) {
  const score = Number(data.risk_score ?? 0);
  const safeScore = Math.max(0, Math.min(score, 100));
  const level = normalizeRiskLevel(data.risk_level, safeScore);

  resultsPanel.classList.remove("hidden");

  riskScore.textContent = safeScore;
  riskBadge.textContent = titleCase(level);
  riskBadge.className = `risk-badge ${riskClass(level)}`;

  const rotation = -75 + safeScore * 1.5;
  gaugeNeedle.style.transform = `rotate(${rotation}deg)`;

  summaryText.textContent =
    data.summary || "The tool completed the analysis.";

  renderList(redFlagsList, data.red_flags, "No major red flags were detected.");
  renderList(
    nextStepsList,
    data.recommended_next_steps,
    "When in doubt, verify through an official source."
  );

  flagCount.textContent = Array.isArray(data.red_flags) ? data.red_flags.length : 0;

  explanationText.textContent =
    data[explanationKey] ||
    "The tool looked at the message content, common scam warning signs, and the overall context to estimate the level of risk.";

  plainExplanationText.textContent =
    data.plain_language_explanation ||
    "This result is meant to help you pause and decide what to do next.";

  disclaimerText.textContent =
    data.disclaimer ||
    "This is an educational assessment and may not always be correct. When in doubt, verify through an official source.";

  resultsPanel.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function renderList(container, items, fallback) {
  container.innerHTML = "";

  const list = Array.isArray(items) && items.length ? items : [fallback];

  list.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    container.appendChild(li);
  });
}

function normalizeRiskLevel(level, score) {
  const clean = String(level || "").toLowerCase();

  if (clean.includes("harmless")) return "likely harmless";
  if (clean.includes("risky") || clean.includes("high")) return "likely risky";
  if (clean.includes("unclear") || clean.includes("medium")) return "unclear";

  if (score >= 60) return "likely risky";
  if (score >= 30) return "unclear";
  return "likely harmless";
}

function riskClass(level) {
  if (level === "likely harmless") return "low";
  if (level === "unclear") return "medium";
  return "high";
}

function titleCase(text) {
  return String(text)
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function setLoading(button, isLoading, label) {
  button.disabled = isLoading;
  button.textContent = label;
}

function showError(error) {
  resultsPanel.classList.remove("hidden");

  riskScore.textContent = "--";
  riskBadge.textContent = "Error";
  riskBadge.className = "risk-badge medium";
  summaryText.textContent =
    "Something went wrong while analyzing the content. Please check your webhook URL and n8n workflow response.";
  redFlagsList.innerHTML = "";
  nextStepsList.innerHTML = "";
  explanationText.textContent = error.message;
  plainExplanationText.textContent = "";
  disclaimerText.textContent = "";
}

