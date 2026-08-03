const DEFAULTS = {
  theme: "light",
  position: "top",
  openInNewTab: false,
  showFavicons: true,
  rootFolderId: null
};

async function loadFolders(selectedId) {
  const tree = await chrome.bookmarks.getTree();
  const select = document.getElementById("rootFolder");
  select.innerHTML = "";

  function walk(nodes, depth) {
    nodes.forEach((n) => {
      if (n.children) {
        const opt = document.createElement("option");
        opt.value = n.id;
        opt.textContent = "\u00A0\u00A0".repeat(depth) + (n.title || "Bookmarks");
        select.appendChild(opt);
        walk(n.children, depth + 1);
      }
    });
  }
  walk(tree, 0);

  // Default selection: the actual Bookmarks Bar folder.
  select.value = selectedId || tree[0].children[0].id;
}

function getSettings() {
  return new Promise((resolve) => chrome.storage.sync.get(DEFAULTS, resolve));
}

async function loadSettings() {
  const settings = await getSettings();
  document.getElementById("theme").value = settings.theme;
  document.getElementById("position").value = settings.position;
  document.getElementById("openInNewTab").checked = settings.openInNewTab;
  document.getElementById("showFavicons").checked = settings.showFavicons;
  await loadFolders(settings.rootFolderId);
}

function saveSettings() {
  const settings = {
    theme: document.getElementById("theme").value,
    position: document.getElementById("position").value,
    openInNewTab: document.getElementById("openInNewTab").checked,
    showFavicons: document.getElementById("showFavicons").checked,
    rootFolderId: document.getElementById("rootFolder").value || null
  };
  chrome.storage.sync.set(settings, () => {
    const status = document.getElementById("status");
    status.textContent = "Saved!";
    setTimeout(() => (status.textContent = ""), 1500);
  });
}

document.addEventListener("DOMContentLoaded", loadSettings);
document.getElementById("save").addEventListener("click", saveSettings);
