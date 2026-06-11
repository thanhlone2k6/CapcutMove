const videoList = document.getElementById('videoList');
const clearBtn = document.getElementById('clearBtn');

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function createVideoElement(videoData) {
  const item = document.createElement('div');
  item.className = 'video-item';

  const videoContainer = document.createElement('div');
  videoContainer.className = 'video-container';

  // Play the video instead of just showing thumbnail
  const videoEl = document.createElement('video');
  videoEl.src = videoData.url;
  videoEl.controls = false; // Ẩn thanh công cụ theo yêu cầu
  videoEl.autoplay = true;
  videoEl.muted = true; // Start muted to allow autoplay without user interaction
  videoEl.loop = true;
  
  // Add a small delay then unmute with low volume if needed, or keep it muted
  // Browsers require muted=true for autoplay to work reliably.
  // We'll add a button to unmute easily.
  
  videoContainer.appendChild(videoEl);

  const actions = document.createElement('div');
  actions.className = 'actions';

  const downloadBtn = document.createElement('button');
  downloadBtn.className = 'download-btn';
  downloadBtn.textContent = 'Download';
  downloadBtn.onclick = () => {
    // Generate a unique filename based on timestamp
    const filename = `douyin_video_${videoData.timestamp}.mp4`;
    chrome.downloads.download({
      url: videoData.url,
      filename: filename,
      saveAs: false // Download automatically without prompt
    });
  };

  actions.appendChild(downloadBtn);

  item.appendChild(videoContainer);
  item.appendChild(actions);

  return item;
}

function renderVideos(videos) {
  videoList.innerHTML = '';
  if (!videos || videos.length === 0) {
    videoList.innerHTML = '<div class="empty-state">Chưa tìm thấy video nào. Hãy lướt Douyin để tiện ích bắt link tải video nhé!</div>';
    return;
  }
  
  // Display the newest videos first
  const reversedVideos = [...videos].reverse();
  reversedVideos.forEach(video => {
    videoList.appendChild(createVideoElement(video));
  });
}

// Establish connection with background script to detect when sidebar closes
chrome.runtime.connect({ name: 'sidebar' });

// Initial fetch from background script
chrome.runtime.sendMessage({ type: 'GET_VIDEOS' }, (response) => {
  if (response && response.videos) {
    renderVideos(response.videos);
  }
});

// Listen for new video events from background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'NEW_VIDEO') {
    // Remove empty state if it exists
    const emptyState = videoList.querySelector('.empty-state');
    if (emptyState) {
      emptyState.remove();
    }
    
    // Create new video element
    const newVideoEl = createVideoElement(message.data);
    
    // Insert at the beginning (top-left in grid)
    if (videoList.firstChild) {
      videoList.insertBefore(newVideoEl, videoList.firstChild);
    } else {
      videoList.appendChild(newVideoEl);
    }
  }
});

// Clear all videos
clearBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'CLEAR_VIDEOS' }, (response) => {
    if (response && response.success) {
      renderVideos([]);
    }
  });
});
