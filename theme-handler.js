/**
 * theme-handler.js  — ProSafe Vault
 * Standalone module kept for compatibility.
 * The vault.html applyTheme() function handles everything directly.
 * This file wires imageThemeBtn / videoThemeBtn if they exist on the page
 * (legacy vault pages) and re-exports applyTheme for external use.
 */

const IMAGES_TH = ["20.jpg","21.png","23.png","26.png","27.png","28.png"];
const VIDEOS_TH  = ["w1.mp4","w2.mp4","w3.mp4"];

let _thImgInterval = null;
let _thBgVideo     = null;

document.addEventListener("DOMContentLoaded", () => {
  // Wire legacy sidebar buttons if present
  const imageBtn = document.getElementById("imageThemeBtn");
  const videoBtn = document.getElementById("videoThemeBtn");

  if (imageBtn) imageBtn.addEventListener("click", () => {
    localStorage.setItem("themeMode", "image");
    applyThemeHandler("image");
  });
  if (videoBtn) videoBtn.addEventListener("click", () => {
    localStorage.setItem("themeMode", "video");
    applyThemeHandler("video");
  });

  // Don't auto-apply here if vault.html already called applyTheme()
  if (typeof applyTheme !== "function") {
    applyThemeHandler(localStorage.getItem("themeMode") || "none");
  }
});

function applyThemeHandler(mode) {
  // Clean up
  if (_thImgInterval) { clearInterval(_thImgInterval); _thImgInterval = null; }
  if (_thBgVideo)     { _thBgVideo.remove(); _thBgVideo = null; }
  document.body.style.backgroundImage = "";
  document.body.style.background = "";
  document.body.classList.remove("bg-video-active");

  if (mode === "image") {
    let idx = 0;
    document.body.style.backgroundSize    = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.transition        = "background-image 1s ease";
    const next = () => {
      document.body.style.backgroundImage = `url(${IMAGES_TH[idx % IMAGES_TH.length]})`;
      idx++;
    };
    next();
    _thImgInterval = setInterval(next, 4000);

  } else if (mode === "video") {
    document.body.classList.add("bg-video-active");
    _thBgVideo = Object.assign(document.createElement("video"), {
      className: "bg-video", autoplay: true, muted: true,
      playsInline: true, loop: false, src: VIDEOS_TH[0]
    });
    let vi = 0;
    _thBgVideo.addEventListener("ended", () => {
      vi = (vi + 1) % VIDEOS_TH.length;
      _thBgVideo.src = VIDEOS_TH[vi];
      _thBgVideo.play();
    });
    document.body.prepend(_thBgVideo);
    _thBgVideo.play();

  } else if (mode === "gradient") {
    document.body.style.background = "linear-gradient(135deg,#0f2027,#203a43,#2c5364)";
    document.body.style.backgroundSize = "400% 400%";

  } else {
    document.body.style.background = "#0e0e0e";
  }
}
