const APP_ID = "d17ddcee8dd3465ab9f531033c2cd402"; // todo: replace with "<-- AGORA_APP_ID -->"
const UID = String(Math.round(Math.random() * 100000));
const token = null;

let client;
let channel;

let queryStrings = window.location.search;
let urlParams = new URLSearchParams(queryStrings);
let ROOM_ID = urlParams.get("room");

if (!ROOM_ID) window.location = "lobby.html";

let localStream;
let remoteStream;
let peerConnection;

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
};

const constraints = {
  video: {
    width: { min: 640, ideal: 1920, max: 1920 },
    height: { min: 480, ideal: 1080, max: 1080 },
  },
  audio: true,
};

let init = async () => {
  client = await AgoraRTM.createInstance(APP_ID);
  await client.login({ uid: UID, token });
  channel = client.createChannel(ROOM_ID);
  await channel.join();
  channel.on("MemberJoined", handleUserJoined);
  channel.on("MemberLeft", handleUserLeft);
  client.on("MessageFromPeer", handleMessageFromPeer);
  await createLocalStream();
};

let createLocalStream = async () => {
  localStream = await navigator.mediaDevices.getUserMedia(constraints);
  document.getElementById("user-1").srcObject = localStream;
};

let createPeerConnection = async (MemberId) => {
  peerConnection = new RTCPeerConnection(servers);
  remoteStream = new MediaStream();
  document.getElementById("user-2").srcObject = remoteStream;
  document.getElementById("user-2").style.display = "block";
  document.getElementById("user-1").classList.add("small-frame");
  if (!localStream) await createLocalStream();
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });
  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };
  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      client.sendMessageToPeer(
        {
          text: JSON.stringify({
            type: "candidate",
            data: event.candidate,
          }),
        },
        MemberId
      );
    }
  };
};

let createOffer = async (MemberId) => {
  await createPeerConnection(MemberId);
  let offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  client.sendMessageToPeer(
    { text: JSON.stringify({ type: "offer", data: offer }) },
    MemberId
  );
};

let createAnswer = async (MemberId, offer) => {
  await createPeerConnection(MemberId);
  await peerConnection.setRemoteDescription(offer);
  let answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  client.sendMessageToPeer(
    { text: JSON.stringify({ type: "answer", data: answer }) },
    MemberId
  );
};

let addAnswer = (answer) => {
  if (!peerConnection.currentRemoteDescription) {
    peerConnection.setRemoteDescription(answer);
  }
};

let handleUserJoined = async (MemberId) => {
  createOffer(MemberId);
};

let handleUserLeft = (MemberId) => {
  document.getElementById("user-2").style.display = "none";
  document.getElementById("user-1").classList.remove("small-frame");
};

let handleMessageFromPeer = async (message, MemberId) => {
  message = JSON.parse(message.text);
  if (message.type === "offer") {
    await createAnswer(MemberId, message.data);
  }
  if (message.type === "answer") {
    addAnswer(message.data);
  }
  if (message.type === "candidate") {
    if (peerConnection) {
      peerConnection.addIceCandidate(message.data);
    }
  }
};

let leaveChannel = async () => {
  await channel.leave();
  await client.logout();
};

const cameraBtn = document.getElementById("camera-btn");
let toggleCamera = async () => {
  let videoTrack = localStream
    .getTracks()
    .find((track) => track.kind === "video");
  videoTrack.enabled = !videoTrack.enabled;
  cameraBtn.style.backgroundColor = !videoTrack.enabled
    ? `rgb(255, 80, 80)`
    : `rgb(179, 102, 249, .9)`;
};
cameraBtn.addEventListener("click", toggleCamera);

const micBtn = document.getElementById("mic-btn");
let toggleMic = async () => {
  let audioTrack = localStream
    .getTracks()
    .find((track) => track.kind === "audio");
  audioTrack.enabled = !audioTrack.enabled;
  micBtn.style.backgroundColor = !audioTrack.enabled
    ? `rgb(255, 80, 80)`
    : `rgb(179, 102, 249, .9)`;
};
micBtn.addEventListener("click", toggleMic);

window.addEventListener("beforeunload", leaveChannel);

init();
