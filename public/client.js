const socket = io();
let localStream;
const peers = {};

async function startCall() {
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  console.log("🎤 Mikrofon aktiviert!");

  socket.emit("join", "mainroom");
}

document.getElementById("joinBtn").onclick = startCall;

socket.on("new-peer", (peerId) => {
  const peer = createPeer(peerId, true);
  peers[peerId] = peer;
});

socket.on("signal", (data) => {
  let peer = peers[data.from];
  if (!peer) {
    peer = createPeer(data.from, false);
    peers[data.from] = peer;
  }
  peer.signal(data.signal);
});

function createPeer(peerId, initiator) {
  const peer = new SimplePeer({
    initiator,
    trickle: false,
    stream: localStream
  });

  peer.on("signal", (signalData) => {
    socket.emit("signal", { to: peerId, signal: signalData });
  });

  peer.on("stream", (stream) => {
    console.log("🔊 Audio erhalten von:", peerId);
    playAudio(stream);
  });

  return peer;
}

function playAudio(stream) {
  const audio = document.createElement("audio");
  audio.srcObject = stream;
  audio.autoplay = true;
  document.body.appendChild(audio);
}
