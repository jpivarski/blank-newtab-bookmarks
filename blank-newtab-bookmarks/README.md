# Blank New Tab + Bookmarks Bar

A blank new-tab page for Chrome that shows only your Bookmarks Bar (or any
folder you choose), so you can hide the real toolbar from your window and
keep it just for new tabs.

## Install (Chrome Web Store)

Install it for free from the Chrome Web Store:

<!-- TODO: replace with the real listing URL once published -->
**https://chrome.google.com/webstore/detail/EXTENSION_ID**

Then open a new tab — you should see your bookmarks.

## Install (unpacked, for development)

If you'd rather load it from source:

1. Download or clone this repository somewhere permanent (don't delete it
   after installing — Chrome loads the extension from this folder every time
   it starts).
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the `blank-newtab-bookmarks` folder.
5. Open a new tab — you should see your bookmarks.

## Hide the real Bookmarks Bar

Press `Ctrl+Shift+B` (`⌘+Shift+B` on Mac), or go to Chrome's menu →
**Bookmarks** → **Show bookmarks bar** and turn it off. It will now only
show up on this new-tab page.

## Configure it

Right-click the extension icon (or go to `chrome://extensions`, find this
extension, click **Details** → **Extension options**) to choose:

- Which bookmarks folder to display (defaults to the real Bookmarks Bar)
- Top strip vs. centered layout
- Light or dark theme
- Whether to show site favicons
- Whether links always open in a new tab

## Notes

- Folders in the bar work like the real toolbar: click to open a dropdown,
  hover over a subfolder to flyout its contents, click a bookmark to go
  there.
- Settings sync via `chrome.storage.sync`, so they'll follow you to other
  signed-in Chrome installs.
- The extension needs no special permissions beyond `bookmarks`, `storage`,
  and `favicon`, and it doesn't collect or transmit any data (see the
  [privacy policy](docs/privacy-policy.html)).
