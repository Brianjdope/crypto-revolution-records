// ============================================================
// Roadmap timeline. Pure render — no external deps.
// ============================================================
const PHASES = [
  {
    when: "Q1 2026",
    title: "The Genesis Drop",
    body: "$CR token launch, founding artist roster signed, first 10 NFTs minted on the Crypto Revolution contract.",
    tag: "Live",
    state: "now",
  },
  {
    when: "Q2 2026",
    title: "On-chain royalties v1",
    body: "Smart-contract royalty splits go live. Every stream and sale auto-pays artist + holders in real time.",
    tag: "Building",
    state: "next",
  },
  {
    when: "Q3 2026",
    title: "AI Studio public access",
    body: "Open the AI co-creation studio to all $CR holders. Mint your own track from a vault of OZ-trained models.",
    tag: "Planned",
    state: "later",
  },
  {
    when: "Q4 2026",
    title: "Crypto Revolution Live",
    body: "First fully on-chain festival. Tickets are NFTs, royalties stream to every artist on the bill in real time.",
    tag: "Planned",
    state: "later",
  },
  {
    when: "2027",
    title: "Label DAO",
    body: "Treasury and signing decisions move on-chain. The herd votes. The goat presides.",
    tag: "Vision",
    state: "later",
  },
];

export function initRoadmap() {
  const list = document.getElementById("timeline");
  if (!list) return;
  list.innerHTML = PHASES.map((p) => `
    <li class="${p.state === "now" ? "is-now" : ""}">
      <div class="when">${p.when}</div>
      <div class="what">
        <h3>${p.title}</h3>
        <p>${p.body}</p>
        <span class="tag">${p.tag}</span>
      </div>
    </li>
  `).join("");
}
