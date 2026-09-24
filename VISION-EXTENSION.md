# Keyboard Vision pairing

Typhelper can consume aggregate signals from the Keyboard Vision extension without receiving camera frames.

The website listens for either:

- BroadcastChannel: typing-pro-vision
- window.postMessage

The payload is:

{
  "type":"typing-pro-vision",
  "source":"extension",
  "gaze":"screen" | "keyboard" | "unknown",
  "hand":"optional-hand-or-gesture-id"
}

The user must enable the paired-vision option in Typing-Pro settings before these signals affect the personal training profile.

The signal is used only as an aggregate learning feature. Raw camera/video frames are not written into Typing-Pro progress.

The existing Keyboard Vision architecture keeps camera media peer-to-peer after pairing, with the central service handling pairing/signaling rather than receiving the camera stream.
