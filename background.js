chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "pricecharting-pokemon-search",
    title: "Search Pricecharting",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== "pricecharting-pokemon-search") return;

  const originalText = info.selectionText;
  const cleanedText = cleanListingText(originalText);
  const parsed = parseSelectedText(cleanedText);

  if (!parsed) {
    console.warn("Couldn't parse card info.");
    openGoogleSearchFallback(originalText);
    return;
  }

  const { name, number, printedTotal } = parsed;

  try {
    const isJapanese = originalText.toLowerCase().includes("japanese");

    if (isJapanese) {
      openGoogleSearchFallback(originalText);
      return;
    }

    const cards = await searchCardByNameAndNumber(name, number, printedTotal);

    if (!cards || cards.length === 0) {
      console.warn("No cards found for selection");
      openGoogleSearchFallback(originalText);
      return;
    }

    const url = buildPriceChartingUrl(cards[0], number);
    chrome.tabs.create({ url });
  } catch (err) {
    console.error("Pricecharting addon error:", err);
    openGoogleSearchFallback(originalText);
  }
});

function cleanListingText(text) {
  const noiseWords = [
    "pokemon",
    "card",
    "tcg",
    "nm",
    "ar",
    "mint",
    "near mint",
    "holo",
    "foil",
    "rare",
    "promo",
    "english",
    "japanese",
    "vintage",
    "trading",
    "first edition",
  ];

  return text
    .toLowerCase()
    .replace(/[-_]/g, " ")
    .replace(/[^\w\s\/]/g, "")
    .split(/\s+/)
    .filter((word) => !noiseWords.includes(word))
    .join(" ");
}

function parseSelectedText(text) {
  if (!text) return null;

  const nameMatch = text.match(/^[A-Za-z\-\' ]+/);
  const numberMatch = text.match(/(\d{1,3})\/(\d{1,3})/);

  if (!nameMatch || !numberMatch) return null;

  return {
    name: nameMatch[0].trim(),
    number: numberMatch[1],
    printedTotal: numberMatch[2],
  };
}

function buildPriceChartingUrl(card, number) {
  const setNameSlug = card.set.name.replace(/\s+/g, "-");
  const cardNameSlug = card.name.replace(/\s+/g, "-");
  return `https://www.pricecharting.com/game/pokemon-${setNameSlug}/${cardNameSlug}-${number}`;
}

async function searchCardByNameAndNumber(name, number, printedTotal) {
  const baseUrl = "https://api.pokemontcg.io/v2";
  const cardsEndpoint = `${baseUrl}/cards`;

  const query = `name:"${name}" number:${number} set.printedTotal:${printedTotal}`;
  const url = `${cardsEndpoint}?q=${encodeURIComponent(query)}`;

  const { ptcgApiKey } = await chrome.storage.sync.get(["ptcgApiKey"]);

  const headers = {};
  if (ptcgApiKey) {
    headers["X-Api-Key"] = ptcgApiKey;
  }

  const res = await fetch(url, { headers });

  if (!res.ok) throw new Error(`Pokemon TCG API error: ${res.status}`);
  const data = await res.json();
  return data.data;
}

function openGoogleSearchFallback(query) {
  const googleQuery = `site:pricecharting.com ${query}`;
  const url = `https://www.google.com/search?q=${encodeURIComponent(
    googleQuery
  )}`;
  chrome.tabs.create({ url });
}
