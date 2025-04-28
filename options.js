const selectors = {
  ptcgApiKey: document.querySelector("#ptcgApiKey"),
};

const saveOptions = () => {
  chrome.storage.sync.set({
    ptcgApiKey: selectors.ptcgApiKey.value,
  });
};

const restoreOptions = () => {
  chrome.storage.sync.get(["ptcgApiKey"], (res) => {
    if (chrome.runtime.lastError) {
      console.error("Storage error:", chrome.runtime.lastError);
      return;
    }
    selectors.ptcgApiKey.value = res.ptcgApiKey || "";
  });
};

document.addEventListener("DOMContentLoaded", restoreOptions);
selectors.ptcgApiKey.addEventListener("input", saveOptions);

window.onload = () =>
  setTimeout(() => document.body.classList.remove("preload"), 100);
