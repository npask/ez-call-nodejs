const socket = io();
let localStream;
let peers = {};

let isMuted = false;
let noiseSuppression = true;
let threshold = 10; // Standard dB-Level

// ===== UI-Controller =====
window.toggleMute = () => {
  isMuted = !isMuted;
  updateTrackState();
  console.log(isMuted ? "🔇 gemutet" : "🎤 unmuted");
};

window.setThreshold = (value) => {
  threshold = Number(value);
  console.log("🎚 Voice Threshold:", threshold);
};

window.toggleNoise = async () => {
  noiseSuppression = !noiseSuppression;
  console.log("🎧 Noise Suppression:", noiseSuppression);

  // Mikro komplett neu starten mit neuen Einstellungen
  await setupMic();
  restartPeers();
};

// ===== Mikrofon Setup =====
async function setupMic() {
  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
  }

  localStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      noiseSuppression: noiseSuppression,
      echoCancellation: true
    }
  });

  console.log("🎤 Mikro gestartet | Noise:", noiseSuppression);

  startVAD(localStream);
}

async function startCall() {
  await setupMic();
  socket.emit("join", "mainroom");
}
document.getElementById("joinBtn").onclick = startCall;

// ===== Voice Activity Detection =====
function startVAD(stream) {
  const ctx = new AudioContext();
  const src = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;

  const data = new Uint8Array(analyser.frequencyBinCount);

  function loop() {
    analyser.getByteFrequencyData(data);
    const vol = data.reduce((a, b) => a + b, 0) / data.length;

    // Wenn leiser als Threshold → nichts senden
    if (vol < threshold) {
      localStream.getAudioTracks()[0].enabled = false;
    } else {
      updateTrackState();
    }

    requestAnimationFrame(loop);
  }
  
  src.connect(analyser);
  loop();
}

// ===== Track Zustand basierend auf Mute =====
function updateTrackState() {
  localStream.getAudioTracks()[0].enabled = !isMuted;
}

// ===== Peers =====
socket.on("new-peer", (id) => {
  peers[id] = createPeer(id, true);
});

socket.on("signal", (data) => {
  if (!peers[data.from]) {
    peers[data.from] = createPeer(data.from, false);
  }
  peers[data.from].signal(data.signal);
});

// ===== Peer erstellen =====
function createPeer(id, initiator) {
  const p = new SimplePeer({
    initiator,
    trickle: false,
    stream: localStream
  });

  p.on("signal", (signal) => {
    socket.emit("signal", { to: id, signal });
  });

  p.on("stream", (stream) => {
    playAudio(stream);
  });

  return p;
}

// ===== Audio abspielen =====
function playAudio(stream) {
  const audio = document.createElement("audio");
  audio.srcObject = stream;
  audio.autoplay = true;
  document.body.appendChild(audio);
}

// ===== Wenn Mikro neu gestartet wird → alle Verbindungen resetten =====
function restartPeers() {
  for (let id in peers) {
    peers[id].destroy();
  }
  peers = {};

  // Reconnect in selben Raum
  socket.emit("join", "mainroom");
}
