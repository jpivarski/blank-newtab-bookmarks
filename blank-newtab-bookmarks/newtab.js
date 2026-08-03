const DEFAULTS = {
  theme: "light",
  position: "top",
  openInNewTab: false,
  showFavicons: true,
  rootFolderId: null
};

let openMenus = [];
let lastAnchorId = null;
const submenuOf = new Map();

function getSettings() {
  return new Promise((resolve) => chrome.storage.sync.get(DEFAULTS, resolve));
}

function findNode(nodes, id) {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const found = findNode(n.children, id);
      if (found) return found;
    }
  }
  return null;
}

async function getRootFolder(rootFolderId) {
  const tree = await chrome.bookmarks.getTree();
  if (rootFolderId) {
    const found = findNode(tree, rootFolderId);
    if (found && found.children) return found;
  }
  // Default: the Bookmarks Bar is always the first child of the root node.
  return tree[0].children[0];
}

function faviconUrl(pageUrl) {
  const url = new URL(chrome.runtime.getURL("/_favicon/"));
  url.searchParams.set("pageUrl", pageUrl);
  url.searchParams.set("size", "16");
  return url.toString();
}

function closeAllMenus() {
  openMenus.forEach((m) => m.remove());
  openMenus = [];
  submenuOf.clear();
  document.querySelectorAll(".bar-item.open").forEach((el) => {
    el.classList.remove("open");
    el.setAttribute("aria-expanded", "false");
  });
}

// Close a menu's submenu — and, recursively, that submenu's own descendants —
// so backing out of a deep flyout never leaves an orphaned menu on screen.
function closeChildSubmenu(menu) {
  const existing = submenuOf.get(menu);
  if (!existing) return;
  closeChildSubmenu(existing);
  existing.remove();
  openMenus = openMenus.filter((m) => m !== existing);
  submenuOf.delete(menu);
}

// Links are real anchors, so the browser handles plain/modifier/middle clicks
// natively. We only need to close any open menus afterwards. Defer to a timer
// (and stop propagation so the document-level closer doesn't run) so the anchor
// isn't removed from the DOM mid-dispatch, which would cancel the navigation.
function onAnchorActivate(e) {
  e.stopPropagation();
  setTimeout(() => {
    closeAllMenus();
    lastAnchorId = null;
  }, 0);
}

function makeLinkAnchor(node, settings, className) {
  const a = document.createElement("a");
  a.className = className;
  a.href = node.url;
  if (settings.openInNewTab) a.target = "_blank";
  if (settings.showFavicons) {
    const img = document.createElement("img");
    img.src = faviconUrl(node.url);
    a.appendChild(img);
  }
  const span = document.createElement("span");
  span.className = "label";
  span.textContent = node.title || node.url;
  a.appendChild(span);
  a.addEventListener("click", onAnchorActivate);
  a.addEventListener("auxclick", onAnchorActivate);
  return a;
}

function positionFixed(el, top, left) {
  el.style.top = top + "px";
  el.style.left = left + "px";
  // Keep menus on-screen.
  requestAnimationFrame(() => {
    const rect = el.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      el.style.left = Math.max(4, window.innerWidth - rect.width - 4) + "px";
    }
    if (rect.bottom > window.innerHeight) {
      el.style.top = Math.max(4, window.innerHeight - rect.height - 4) + "px";
    }
  });
}

function buildMenu(children, settings) {
  const menu = document.createElement("div");
  menu.className = "menu";

  children.forEach((node) => {
    if (node.url) {
      const row = makeLinkAnchor(node, settings, "menu-row");
      row.addEventListener("mouseenter", () => closeChildSubmenu(menu));
      menu.appendChild(row);
    } else if (node.children) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "menu-row has-sub";
      row.setAttribute("aria-haspopup", "true");
      const span = document.createElement("span");
      span.className = "label";
      span.textContent = node.title || "Folder";
      row.appendChild(span);
      const arrow = document.createElement("span");
      arrow.className = "sub-arrow";
      arrow.textContent = "▸";
      row.appendChild(arrow);

      row.addEventListener("mouseenter", () => {
        closeChildSubmenu(menu);
        if (!node.children.length) return;
        const submenu = buildMenu(node.children, settings);
        document.body.appendChild(submenu);
        openMenus.push(submenu);
        submenuOf.set(menu, submenu);
        const rect = row.getBoundingClientRect();
        positionFixed(submenu, rect.top, rect.right);
      });
      row.addEventListener("click", (e) => e.stopPropagation());
      menu.appendChild(row);
    }
    // Nodes with neither a url nor children are skipped; Chrome bookmarks have
    // no separator node type.
  });

  return menu;
}

function toggleTopMenu(anchorEl, node, settings) {
  const wasOpenForThis = lastAnchorId === node.id && openMenus.length > 0;
  closeAllMenus();
  if (wasOpenForThis) {
    lastAnchorId = null;
    return;
  }
  if (!node.children || !node.children.length) {
    lastAnchorId = null;
    return;
  }
  anchorEl.classList.add("open");
  anchorEl.setAttribute("aria-expanded", "true");
  const menu = buildMenu(node.children, settings);
  document.body.appendChild(menu);
  openMenus.push(menu);
  const rect = anchorEl.getBoundingClientRect();
  positionFixed(menu, rect.bottom, rect.left);
  lastAnchorId = node.id;
}

function makeBarItem(node, settings) {
  if (node.url) {
    return makeLinkAnchor(node, settings, "bar-item");
  }
  if (node.children) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "bar-item folder";
    el.setAttribute("aria-haspopup", "true");
    el.setAttribute("aria-expanded", "false");
    const span = document.createElement("span");
    span.className = "label";
    span.textContent = node.title || "Folder";
    el.appendChild(span);
    const caret = document.createElement("span");
    caret.className = "caret";
    caret.textContent = "▾";
    el.appendChild(caret);
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleTopMenu(el, node, settings);
    });
    return el;
  }
  return null;
}

async function renderBar() {
  const settings = await getSettings();
  document.documentElement.dataset.theme = settings.theme;
  document.body.classList.remove("pos-top", "pos-center");
  document.body.classList.add("pos-" + settings.position);

  const bar = document.getElementById("bar");
  bar.innerHTML = "";
  closeAllMenus();

  try {
    const folder = await getRootFolder(settings.rootFolderId);
    const children = folder.children || [];
    if (!children.length) {
      bar.innerHTML = '<div class="empty-hint">No bookmarks here yet.</div>';
      return;
    }
    children.forEach((node) => {
      const item = makeBarItem(node, settings);
      if (item) bar.appendChild(item);
    });
  } catch (err) {
    console.error(err);
    bar.innerHTML = '<div class="empty-hint">Could not load bookmarks.</div>';
  }
}

document.addEventListener("DOMContentLoaded", renderBar);
document.addEventListener("click", () => {
  closeAllMenus();
  lastAnchorId = null;
});

// Keep the page live if bookmarks or settings change elsewhere.
["onCreated", "onRemoved", "onChanged", "onMoved", "onChildrenReordered"].forEach((evt) => {
  if (chrome.bookmarks[evt]) chrome.bookmarks[evt].addListener(renderBar);
});
chrome.storage.onChanged.addListener(renderBar);
