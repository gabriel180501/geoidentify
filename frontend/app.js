const API_BASE = "http://127.0.0.1:8000";

const featuresContainer = document.getElementById("features-container");
const analyzeBtn = document.getElementById("analyze-btn");
const errorMsg = document.getElementById("error-msg");
const resultsContainer = document.getElementById("results-container");
const evidencesList = document.getElementById("evidences-list");

let featureMeta = {};

async function loadFeatures() {
  try {
    const res = await fetch(`${API_BASE}/features`);
    const data = await res.json();
    renderFeatures(data.categories);
  } catch (err) {
    console.error(err);
    errorMsg.textContent = "Erro ao carregar características.";
  }
}

function renderFeatures(categories) {
  featuresContainer.innerHTML = "";
  featureMeta = {};

  Object.entries(categories).forEach(([catName, features]) => {
    const card = document.createElement("div");
    card.className = "category-card";

    const title = document.createElement("h3");
    title.textContent = catName;
    card.appendChild(title);

    features.forEach((f) => {
      const wrapper = document.createElement("label");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = f.id;
      featureMeta[f.id] = f.label;

      wrapper.appendChild(cb);
      wrapper.appendChild(document.createTextNode(" " + f.label));
      card.appendChild(wrapper);
      card.appendChild(document.createElement("br"));
    });

    featuresContainer.appendChild(card);
  });
}

async function analyze() {
  errorMsg.textContent = "";
  resultsContainer.innerHTML = "";
  evidencesList.innerHTML = "";

  const selected = Array.from(
    featuresContainer.querySelectorAll("input[type=checkbox]:checked")
  ).map((cb) => cb.value);

  if (selected.length === 0) {
    errorMsg.textContent = "Selecione pelo menos uma característica antes de analisar.";
    return;
  }

  analyzeBtn.disabled = true;
  analyzeBtn.textContent = "Analisando...";

  try {
    const res = await fetch(`${API_BASE}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selected_features: selected }),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.detail || "Erro na análise.");
    }

    const data = await res.json();
    renderResults(data);
  } catch (err) {
    console.error(err);
    errorMsg.textContent = err.message || "Erro ao processar a consulta.";
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = "Analisar";
  }
}

function renderResults(data) {
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["País", "Probabilidade (%)", "Score interno"].forEach((h) => {
    const th = document.createElement("th");
    th.textContent = h;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  data.top_countries.forEach((c) => {
    const tr = document.createElement("tr");
    const tdCountry = document.createElement("td");
    tdCountry.textContent = c.country;
    const tdProb = document.createElement("td");
    tdProb.textContent = (c.probability * 100).toFixed(1) + "%";
    const tdScore = document.createElement("td");
    tdScore.textContent = c.score.toFixed(2);
    tr.appendChild(tdCountry);
    tr.appendChild(tdProb);
    tr.appendChild(tdScore);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  resultsContainer.innerHTML = "";
  resultsContainer.appendChild(table);

  evidencesList.innerHTML = "";
  Object.entries(data.top_country_explanation).forEach(([featId, weight]) => {
    const li = document.createElement("li");
    const label = featureMeta[featId] || featId;
    li.textContent = `${label} (peso ${weight.toFixed(2)})`;
    evidencesList.appendChild(li);
  });

  if (Object.keys(data.top_country_explanation).length === 0) {
    const li = document.createElement("li");
    li.textContent = "Nenhuma evidência específica encontrada para o país mais provável.";
    evidencesList.appendChild(li);
  }
}

analyzeBtn.addEventListener("click", analyze);
loadFeatures();
