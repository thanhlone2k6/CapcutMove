chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

let caughtVideos = [];

// Load existing data from storage
chrome.storage.local.get(['caughtVideos'], (result) => {
  if (result.caughtVideos) {
    caughtVideos = result.caughtVideos;
  }
});

// Helper function to extract core URL without changing parameters
// Douyin URLs often have same video but different tracking params
function getCoreUrl(fullUrl) {
  try {
    const urlObj = new URL(fullUrl);
    // You can customize which params to keep or ignore.
    // For now, we strip out everything except origin and pathname to ensure true uniqueness of the file
    // If the video ID is in the query params, we might need to adjust this.
    // Usually the file path is unique enough for the video itself.
    return urlObj.origin + urlObj.pathname;
  } catch (e) {
    return fullUrl;
  }
}

chrome.webRequest.onResponseStarted.addListener(
  (details) => {
    // Only target GET requests and ensure the url contains "?a="
    if (details.method === "GET" && details.url.includes("?a=")) {
      const coreUrl = getCoreUrl(details.url);
      
      // Check if it's already caught by checking the core URL
      if (!caughtVideos.some(v => getCoreUrl(v.url) === coreUrl)) {
        const videoData = {
          url: details.url,
          timestamp: Date.now()
        };
        caughtVideos.push(videoData);

        // Keep maximum 100 recent videos to avoid memory bloat
        if (caughtVideos.length > 100) {
          caughtVideos.shift();
        }

        chrome.storage.local.set({ caughtVideos });

        // Try to notify sidebar if it's open
        chrome.runtime.sendMessage({ type: 'NEW_VIDEO', data: videoData }).catch(() => {
          // Error means sidebar is not open, which is fine
        });
      }
    }
  },
  { urls: ["<all_urls>"] }
);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_VIDEOS') {
    sendResponse({ videos: caughtVideos });
  } else if (message.type === 'CLEAR_VIDEOS') {
    caughtVideos = [];
    chrome.storage.local.set({ caughtVideos });
    sendResponse({ success: true });
  }
});

// Detect when sidebar closes
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidebar') {
    port.onDisconnect.addListener(() => {
      // Clear videos when sidebar is closed
      caughtVideos = [];
      chrome.storage.local.set({ caughtVideos });
    });
  }
});
