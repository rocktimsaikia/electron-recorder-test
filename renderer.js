const startButton = document.getElementById("start-btn");
const stopButton = document.getElementById("stop-btn");
const uploadButton = document.getElementById("upload-btn");
const saveButton = document.getElementById("save-btn");
const firstResetButton = document.getElementById("reset-btn");
const secondResetButton = document.getElementById("reset-btn-2");
const video = document.querySelector("video");
const videoPlaceholder = document.getElementById("video-placeholder");
const formContainer = document.getElementById("form-container");
const videoContainer = document.getElementById("video-container");
const operatorsContainer = document.querySelector(".operators");
const form = document.getElementById("upload-form");
const progressElement = document.getElementById("progress");
const classId = document.getElementById("class-id");
const indicator = document.getElementById("recording-indicator");
const indicatorBeep = document.getElementById("indicator-beep");

const ElectronApi = window.electronApi.main;

async function setupStream(sourceId) {
  const hasAccess = await ElectronApi.getScreenAccess();
  if (!hasAccess) {
    console.error("No screen capture permission");
    await ElectronApi.openScreenSecurity();
    return;
  }

  try {
    const displayStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: sourceId,
          minWidth: 1280,
          maxWidth: 1280,
          minHeight: 720,
          maxHeight: 720,
          minFrameRate: 30,
          maxFrameRate: 30,
        },
      },
    });

    // Capture audio
    const audioStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false,
      },
      video: false,
    });

    const combiedStream = new MediaStream([
      ...displayStream.getVideoTracks(),
      ...audioStream.getAudioTracks(),
    ]);

    video.srcObject = combiedStream;
    video.onloadedmetadata = () => video.play();

    mediaRecorder = new MediaRecorder(combiedStream, {
      mimeType: "video/webm; codecs=vp9",
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.start();

    // Update UI
    video.style.display = "block";
    videoPlaceholder.style.display = "none";
    stopButton.style.display = "block";
    startButton.style.display = "none";
    indicator.style.display = "flex";
  } catch (e) {
    console.error("Error setting up stream:", e);
    alert(`Failed to set up stream: ${e.message}`);
  }
}

function screenPickerShow(sources, onselect) {
  const list = document.querySelector("#sources");
  list.innerHTML = "";

  sources.forEach((source) => {
    const item = document.createElement("div");
    item.classList = "__electron-list";

    const wrapper = document.createElement("div");
    wrapper.classList = "thumbnail __electron-screen-thumbnail";

    const thumbnail = document.createElement("img");
    thumbnail.src = source.thumbnailURL;

    const label = document.createElement("div");
    label.classList = "__electron-screen-name";
    label.innerText = source.name;

    wrapper.append(thumbnail);
    wrapper.append(label);
    item.append(wrapper);
    item.onclick = () => {
      onselect(source.id);
      MicroModal.close("electron-screen-picker");
      setupStream(source.id);
    };
    list.append(item);
  });

  MicroModal.show("electron-screen-picker");
}

let mediaRecorder;
let recordedChunks = [];
let videoObjectUrl;
let videoBlob;

startButton.addEventListener("click", async () => {
  try {
    const result = await ElectronApi.getScreenSources();
    if (Array.isArray(result)) {
      screenPickerShow(result, setupStream);
    } else if (result.error) {
      throw new Error(result.error);
    } else {
      throw new Error("Unexpected response from getScreenSources");
    }
  } catch (error) {
    console.error("Error getting screen sources:", error);
    alert(`Failed to get screen sources: ${error.message}`);
  }
});

stopButton.addEventListener("click", () => {
  video.pause();
  if (mediaRecorder) mediaRecorder.stop();
  mediaRecorder.onstop = () => saveTheVideo();
  stopButton.style.display = "none";
  saveButton.style.display = "block";
  indicator.innerHTML = "<div>The recording has stopped!</div>";
});

uploadButton.addEventListener("click", handleUpload);
saveButton.addEventListener("click", saveTheVideo);

function saveTheVideo() {
  // Create a blob from the recorded chunks
  videoBlob = new Blob(recordedChunks, { type: "video/webm" });
  videoObjectUrl = URL.createObjectURL(videoBlob);

  // Create a link to download the video
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = videoObjectUrl;

  // Format the date to a 12-hour human readable format
  const date = new Date();
  const formattedDate = date.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true, // Use 12-hour format
  });
  // Convert the formatted string back to the desired format
  const [month, day, year, time, period] = formattedDate.split(/[/, ]/);
  const formattedTimestamp = `${year}-${month}-${day}T${time}-${period}`;
  const videoTitle = `classroom-recording-${formattedTimestamp}.webm`;
  a.download = videoTitle;

  // Append the link to the body and click to start the download
  document.body.appendChild(a);
  a.click();

  // Clean up
  uploadButton.style.display = "block";
  firstResetButton.style.display = "block";
}

function handleUpload() {
  formContainer.style.display = "block";
  videoContainer.style.display = "none";
  operatorsContainer.style.display = "none";
  indicator.style.display = "none";
}

function resetRecorder() {
  window.URL.revokeObjectURL(videoObjectUrl);
  recordedChunks = [];

  formContainer.style.display = "none";
  progressElement.innerText = "Progress: 0%";
  classId.value = "";

  indicator.innerHTML =
    '<div>The recording has started</div><span id="indicator-beep"> 🟢</span>';
  indicator.style.display = "none";
  videoContainer.style.display = "block";
  video.style.display = "none";
  videoPlaceholder.style.display = "block";
  operatorsContainer.style.display = "flex";
  stopButton.style.display = "none";
  saveButton.style.display = "none";
  startButton.style.display = "block";
  stopButton.innerText = "Stop and Save Recording";
  uploadButton.style.display = "none";
  firstResetButton.style.display = "none";
}

/* ======================= Video upload logic here ===================== */
const API_BASE_URL = "http://localhost/api/v1";

// Handle form submission
form.addEventListener("submit", async (event) => {
  event.preventDefault(); // Prevent default form submission
  const classId = document.getElementById("class-id").value.trim(); // Get class ID from input
  if (!classId) {
    alert("Please enter a valid classroom ID");
    return;
  }

  try {
    // Call the uploadVideo function with the class ID and blob object
    await uploadVideo(classId, videoBlob);
  } catch (error) {
    console.error("Upload failed:", error);
    alert("Something went wrong during the upload. Please try again.");
  }
});

// Function to handle video upload
async function uploadVideo(classId, blob) {
  if (!blob) {
    alert("No video blob available for upload");
    return;
  }

  try {
    // Step 1: Get signed URL and upload parameters
    const videoUploadUrlAndParams = await createVideoUploadUrlAndParams(classId, blob);

    if (!videoUploadUrlAndParams) {
      return;
    }

    // Step 2: Upload video blob using the signed URL
    await uploadBlobToSignedUrl(
      blob,
      videoUploadUrlAndParams.url,
      videoUploadUrlAndParams.formFields,
    );

    // Step 3: Mark upload as completed
    await onSuccessfulUpload(classId, videoUploadUrlAndParams.id);

    alert("The recording uploaded successfully 🎉");
    resetRecorder();
  } catch (error) {
    console.error("Upload failed:", error);
    alert("Something went wrong during the upload. Please try again.");
  }
}

// Create a signed URL and get upload parameters from the server
async function createVideoUploadUrlAndParams(classId, blob) {
  const response = await fetch(`${API_BASE_URL}/classrooms/${classId}/video/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileSize: blob.size, fileFormat: blob.type.split("/")[1] }),
  });

  if (!response.ok) {
    console.error("Failed to get signed URL:", await response.text());
    alert("Something went wrong while getting the upload URL.");
    return null;
  }

  let data = await response.json();
  data = { url: data.signedUrl.url, formFields: data.signedUrl.fields, id: data.id };
  return data;
}

// Upload blob to the signed URL
async function uploadBlobToSignedUrl(blob, uploadUrl, formFields) {
  const formData = new FormData();
  for (const key in formFields) {
    formData.append(key, formFields[key]);
  }
  formData.append("file", blob);

  const xhr = new XMLHttpRequest();
  xhr.open("POST", uploadUrl, true);

  // Listen for progress events to update the UI
  xhr.upload.addEventListener("progress", (event) => {
    if (event.lengthComputable) {
      const percentComplete = (event.loaded / event.total) * 100;
      progressElement.innerText = `Progress: ${percentComplete.toFixed(2)}%`;
    }
  });

  // Handle the upload completion
  return new Promise((resolve, reject) => {
    xhr.onload = () => {
      if (xhr.status === 204 || xhr.status === 200) {
        resolve();
      } else {
        reject(new Error("Failed to upload blob to signed URL"));
      }
    };
    xhr.onerror = () => reject(new Error("An error occurred during the blob upload"));
    xhr.send(formData);
  });
}

// Mark upload as completed in the backend
async function onSuccessfulUpload(classId, videoId) {
  const response = await fetch(
    `${API_BASE_URL}/classrooms/${classId}/video/${videoId}/`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploadFinishedOn: new Date().toISOString() }),
    },
  );

  if (!response.ok) {
    console.error("Failed to mark upload as completed:", await response.text());
    throw new Error("Failed to mark upload as completed");
  }

  const jsonResponse = await response.json();
  console.log("onSuccessfulUpload", jsonResponse);
}
