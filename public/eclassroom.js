// ---- E-Classroom Tab Handler ----
const eclassroomSection = document.getElementById('section-eclassroom');
const sidebarBtns = document.querySelectorAll('.sidebar nav button');
const eclassroomBtn = Array.from(sidebarBtns).find(btn => btn.dataset.section === "eclassroom");

// Show E-Classroom section on sidebar click
if (eclassroomBtn) {
  eclassroomBtn.onclick = function() {
    sidebarBtns.forEach(b => b.classList.remove('active'));
    eclassroomBtn.classList.add('active');
    // Hide all sections
    document.querySelectorAll('main > section').forEach(sec => sec.style.display = 'none');
    eclassroomSection.style.display = '';
    renderEclassroom();
  };
}

// --- Video Class State ---
let videoClassLive = false;
let videoClassStart = null;
let videoClassTimerInterval = null;
let videoParticipants = [
  {name: 'John Doe', abbr: 'JD', color:'#e0f3f2'},
  {name: 'Jane Adekunle', abbr:'JA', color:'#8fd3f4'},
  {name: 'James Okoro', abbr:'JO', color:'#f9c784'}
];

// --- Chat Class State ---
let chatMessages = [
  {sender: 'Mr. John Doe', time: '08:22', text: 'Hello class! Please join the video call above 👆'},
  {sender: 'Jane Adekunle', time: '08:23', text: 'Good morning sir!'}
];
let chatOnline = [
  {name:'JD', color:'#e0f3f2'},
  {name:'JA', color:'#8fd3f4'},
  {name:'JO', color:'#f9c784'}
];
let chatTyping = false;

// --- Render E-Classroom (both Video and Chat) ---
function renderEclassroom() {
  // --- Video Class ---
  // Participants
  const partDiv = document.getElementById('video-participants');
  if (partDiv) {
    partDiv.innerHTML = '';
    videoParticipants.forEach(p => {
      const span = document.createElement('span');
      span.className = 'avatar';
      span.style.width = '28px';
      span.style.height = '28px';
      span.style.fontSize = '0.95em';
      span.style.background = p.color;
      span.textContent = p.abbr;
      partDiv.appendChild(span);
    });
  }
  // Status
  const status = document.getElementById('video-class-status');
  if (status) {
    status.textContent = videoClassLive ? 'Live' : 'Offline';
    status.style.background = videoClassLive ? 'var(--accent)' : '#e8eaea';
    status.style.color = videoClassLive ? '#fff' : '#7d8ba1';
  }
  // Timer
  updateVideoClassTimer();

  // Show/hide start/join/end buttons
  const joinBtn = document.getElementById('video-join-btn');
  const endBtn = document.getElementById('video-toggle-btn');
  if (joinBtn && endBtn) {
    joinBtn.style.display = videoClassLive ? 'none' : '';
    endBtn.style.display = videoClassLive ? '' : 'none';
  }

  // --- Chat Class ---
  // Online count
  const onlineCount = document.getElementById('chat-online-count');
  if (onlineCount) {
    onlineCount.textContent = chatOnline.length + ' Online';
  }
  // Online avatars
  const onlineAvatars = document.querySelectorAll('.eclassroom-chat .avatar');
  if (onlineAvatars.length) {
    onlineAvatars.forEach((av, idx) => {
      if (chatOnline[idx]) {
        av.textContent = chatOnline[idx].name;
        av.style.background = chatOnline[idx].color;
      }
    });
  }
  // Chat messages
  const chatDiv = document.getElementById('chat-messages');
  if (chatDiv) {
    chatDiv.innerHTML = '';
    chatMessages.forEach(msg => {
      const mdiv = document.createElement('div');
      mdiv.style.marginBottom = '9px';
      mdiv.innerHTML =
        `<span style="font-weight:600;color:var(--primary);">${msg.sender}</span>
         <span style="color:#a6b6d7;font-size:0.91em;">${msg.time}</span>
         <div>${escapeHTML(msg.text)}</div>`;
      chatDiv.appendChild(mdiv);
    });
    // Typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.id = 'chat-typing';
    typingDiv.style.fontStyle = 'italic';
    typingDiv.style.fontSize = '0.95em';
    typingDiv.style.color = '#7cb47a';
    typingDiv.style.display = chatTyping ? '' : 'none';
    typingDiv.textContent = 'Someone is typing...';
    chatDiv.appendChild(typingDiv);
    chatDiv.scrollTop = chatDiv.scrollHeight;
  }
}

// --- Video Class Logic ---
function startVideoClass() {
  videoClassLive = true;
  videoClassStart = new Date();
  renderEclassroom();
  videoClassTimerInterval = setInterval(updateVideoClassTimer, 1000);
}
function endVideoClass() {
  videoClassLive = false;
  videoClassStart = null;
  clearInterval(videoClassTimerInterval);
  renderEclassroom();
}
function updateVideoClassTimer() {
  const timer = document.getElementById('video-class-timer');
  if (!timer) return;
  if (!videoClassLive || !videoClassStart) {
    timer.textContent = "00:00:00";
    return;
  }
  let diff = Math.floor((new Date() - videoClassStart) / 1000);
  let h = String(Math.floor(diff/3600)).padStart(2,'0');
  let m = String(Math.floor(diff/60)%60).padStart(2,'0');
  let s = String(diff%60).padStart(2,'0');
  timer.textContent = `${h}:${m}:${s}`;
}

// --- Hook up video buttons ---
const joinBtn = document.getElementById('video-join-btn');
const endBtn = document.getElementById('video-toggle-btn');
if (joinBtn) joinBtn.onclick = function() { startVideoClass(); };
if (endBtn) endBtn.onclick = function() { endVideoClass(); };

// --- Chat Logic ---
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');
if (chatInput) {
  chatInput.oninput = function() {
    chatTyping = !!chatInput.value;
    renderEclassroom();
  };
}
if (chatSendBtn) {
  chatSendBtn.onclick = function() {
    if (chatInput.value.trim()) {
      chatMessages.push({
        sender: "Mr. John Doe",
        time: (new Date()).toTimeString().slice(0,5),
        text: chatInput.value
      });
      chatInput.value = '';
      chatTyping = false;
      renderEclassroom();
    }
  };
}
// Attach (file/image) handler (dummy)
const chatAttach = document.getElementById('chat-attach');
if (chatAttach) {
  chatAttach.onchange = function() {
    if (chatAttach.files && chatAttach.files.length > 0) {
      const f = chatAttach.files[0];
      chatMessages.push({
        sender: "Mr. John Doe",
        time: (new Date()).toTimeString().slice(0,5),
        text: `<i>Attachment: ${escapeHTML(f.name)}</i>`
      });
      renderEclassroom();
    }
  };
}

// --- Clear Chat (teacher only) ---
const clearBtn = document.querySelector('.eclassroom-chat .btn.danger');
if (clearBtn) {
  clearBtn.onclick = function() {
    if (confirm('Clear chat for everyone?')) {
      chatMessages = [];
      renderEclassroom();
    }
  };
}

// --- Utility ---
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    })[m];
  });
}

// --- Initial Render (if loaded with E-Classroom visible) ---
if (eclassroomSection && eclassroomSection.style.display !== 'none') {
  renderEclassroom();
}
