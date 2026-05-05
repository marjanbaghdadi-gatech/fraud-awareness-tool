const WEBHOOK_URL = "https://mbaghdadi6g.app.n8n.cloud/webhook/fraud-check";

// TEXT ANALYSIS
document.getElementById("analyzeText").onclick = async () => {
  const text = document.getElementById("textInput").value;

  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      raw_text: text
    })
  });

  const data = await res.json();
  displayResults(data);
};

// IMAGE ANALYSIS
document.getElementById("analyzeImage").onclick = async () => {
  const file = document.getElementById("imageInput").files[0];
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  displayResults(data);
};

// DISPLAY RESULTS
function displayResults(data) {
  document.getElementById("results").classList.remove("hidden");

  document.getElementById("score").innerText = data.risk_score + "/100";
  document.getElementById("riskLabel").innerText = data.risk_level;

  const flags = document.getElementById("flags");
  flags.innerHTML = "";
  data.red_flags.forEach(f => {
    const li = document.createElement("li");
    li.innerText = f;
    flags.appendChild(li);
  });

  const steps = document.getElementById("steps");
  steps.innerHTML = "";
  data.recommended_next_steps.forEach(s => {
    const li = document.createElement("li");
    li.innerText = s;
    steps.appendChild(li);
  });

  const explanationKey = "How this tool reached its conclusion about the level of risk involved";
  document.getElementById("explanationText").innerText =
    data[explanationKey] || "";
}
