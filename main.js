// Frame Card - Vanilla JS

// DOM Elements
const imageInput = document.getElementById('image-input');
const thumbnailPreview = document.getElementById('thumbnail-preview');
const aspectButtons = document.querySelectorAll('.aspect-btn');
const canvas = document.getElementById('result-canvas');
const downloadBtn = document.getElementById('download-btn');
const clearBtn = document.getElementById('clear-btn');

// State
let uploadedImage = null;
let selectedAspect = '2:1';

// Event Listeners
imageInput.addEventListener('change', handleImageUpload);
aspectButtons.forEach(btn => btn.addEventListener('click', handleAspectChange));
downloadBtn.addEventListener('click', handleDownload);
clearBtn.addEventListener('click', handleClear);

function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Validate file type
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
  if (!validTypes.includes(file.type)) {
    alert('Please upload a PNG or JPEG image.');
    imageInput.value = '';
    return;
  }

  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    alert('File size must be less than 10MB.');
    imageInput.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = function(event) {
    const img = new Image();
    img.onload = function() {
      uploadedImage = img;
      // Show thumbnail
      thumbnailPreview.innerHTML = '';
      const thumb = document.createElement('img');
      thumb.src = img.src;
      thumb.alt = 'Thumbnail';
      thumbnailPreview.appendChild(thumb);
      // Draw canvas
      drawCanvas();
      // Enable download and clear buttons
      downloadBtn.disabled = false;
      clearBtn.disabled = false;
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function handleAspectChange(e) {
  const btn = e.currentTarget;
  selectedAspect = btn.getAttribute('data-ratio');
  // Update button styles for neutral scheme
  aspectButtons.forEach(b => {
    b.classList.remove('bg-gray-800', 'text-white', 'ring-2', 'ring-gray-400');
    b.classList.add('bg-gray-300', 'text-gray-800');
  });
  btn.classList.remove('bg-gray-300', 'text-gray-800');
  btn.classList.add('bg-gray-800', 'text-white', 'ring-2', 'ring-gray-400');
  drawCanvas();
}

function drawCanvas() {
  if (!uploadedImage) {
    // Clear canvas if no image
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  // Parse aspect ratio
  let [wRatio, hRatio] = selectedAspect.split(':').map(Number);
  // Set export size (fixed width 1200px)
  const exportWidth = 1200;
  const exportHeight = Math.round(exportWidth * hRatio / wRatio);
  canvas.width = exportWidth;
  canvas.height = exportHeight;
  const ctx = canvas.getContext('2d');

  // Draw blurred background (cover)
  const supportsFilter = 'filter' in ctx;
  if (supportsFilter) {
    ctx.save();
    ctx.filter = 'blur(80px)';
    // Calculate cover size for background
    const bgRatio = uploadedImage.width / uploadedImage.height;
    let bgDrawWidth, bgDrawHeight, bgX, bgY;
    if (exportWidth / exportHeight > bgRatio) {
      bgDrawWidth = exportWidth;
      bgDrawHeight = exportWidth / bgRatio;
      bgX = 0;
      bgY = (exportHeight - bgDrawHeight) / 2;
    } else {
      bgDrawHeight = exportHeight;
      bgDrawWidth = exportHeight * bgRatio;
      bgX = (exportWidth - bgDrawWidth) / 2;
      bgY = 0;
    }
    ctx.drawImage(uploadedImage, bgX, bgY, bgDrawWidth, bgDrawHeight);
    ctx.restore();
  } else {
    // Fallback: use StackBlur
    // Draw background image to offscreen canvas
    const off = document.createElement('canvas');
    off.width = exportWidth;
    off.height = exportHeight;
    const offCtx = off.getContext('2d');
    // Calculate cover size for background
    const bgRatio = uploadedImage.width / uploadedImage.height;
    let bgDrawWidth, bgDrawHeight, bgX, bgY;
    if (exportWidth / exportHeight > bgRatio) {
      bgDrawWidth = exportWidth;
      bgDrawHeight = exportWidth / bgRatio;
      bgX = 0;
      bgY = (exportHeight - bgDrawHeight) / 2;
    } else {
      bgDrawHeight = exportHeight;
      bgDrawWidth = exportHeight * bgRatio;
      bgX = (exportWidth - bgDrawWidth) / 2;
      bgY = 0;
    }
    offCtx.drawImage(uploadedImage, bgX, bgY, bgDrawWidth, bgDrawHeight);
    // Apply StackBlur (radius 80)
    if (window.StackBlur) {
      window.StackBlur.canvasRGBA(off, 0, 0, exportWidth, exportHeight, 160); // double radius
    }
    ctx.drawImage(off, 0, 0);
  }

  // Draw centered original image (contain) with border radius
  const fgRatio = uploadedImage.width / uploadedImage.height;
  let fgDrawWidth, fgDrawHeight, fgX, fgY;
  if (exportWidth / exportHeight > fgRatio) {
    fgDrawHeight = exportHeight * 0.9; // add some padding
    fgDrawWidth = fgDrawHeight * fgRatio;
  } else {
    fgDrawWidth = exportWidth * 0.9;
    fgDrawHeight = fgDrawWidth / fgRatio;
  }
  fgX = (exportWidth - fgDrawWidth) / 2;
  fgY = (exportHeight - fgDrawHeight) / 2;

  // Draw rounded rectangle for foreground image
  const radius = Math.min(fgDrawWidth, fgDrawHeight) * 0.04; // 4% border radius
  ctx.save();
  ctx.beginPath();
  roundedRect(ctx, fgX, fgY, fgDrawWidth, fgDrawHeight, radius);
  ctx.clip();
  ctx.drawImage(uploadedImage, fgX, fgY, fgDrawWidth, fgDrawHeight);
  ctx.restore();
}

// Helper for rounded rectangle
function roundedRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function handleDownload() {
  if (!uploadedImage) return;
  // Always export at 1200px wide, regardless of devicePixelRatio
  let [wRatio, hRatio] = selectedAspect.split(':').map(Number);
  const exportWidth = 1200;
  const exportHeight = Math.round(exportWidth * hRatio / wRatio);
  // Create a temporary export canvas (not affected by devicePixelRatio)
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = exportWidth;
  exportCanvas.height = exportHeight;
  const ctx = exportCanvas.getContext('2d');

  // Draw blurred background (cover)
  const supportsFilter = 'filter' in ctx;
  if (supportsFilter) {
    ctx.save();
    ctx.filter = 'blur(80px)';
    const bgRatio = uploadedImage.width / uploadedImage.height;
    let bgDrawWidth, bgDrawHeight, bgX, bgY;
    if (exportWidth / exportHeight > bgRatio) {
      bgDrawWidth = exportWidth;
      bgDrawHeight = exportWidth / bgRatio;
      bgX = 0;
      bgY = (exportHeight - bgDrawHeight) / 2;
    } else {
      bgDrawHeight = exportHeight;
      bgDrawWidth = exportHeight * bgRatio;
      bgX = (exportWidth - bgDrawWidth) / 2;
      bgY = 0;
    }
    ctx.drawImage(uploadedImage, bgX, bgY, bgDrawWidth, bgDrawHeight);
    ctx.restore();
  } else {
    // Fallback: use StackBlur
    const off = document.createElement('canvas');
    off.width = exportWidth;
    off.height = exportHeight;
    const offCtx = off.getContext('2d');
    const bgRatio = uploadedImage.width / uploadedImage.height;
    let bgDrawWidth, bgDrawHeight, bgX, bgY;
    if (exportWidth / exportHeight > bgRatio) {
      bgDrawWidth = exportWidth;
      bgDrawHeight = exportWidth / bgRatio;
      bgX = 0;
      bgY = (exportHeight - bgDrawHeight) / 2;
    } else {
      bgDrawHeight = exportHeight;
      bgDrawWidth = exportHeight * bgRatio;
      bgX = (exportWidth - bgDrawWidth) / 2;
      bgY = 0;
    }
    offCtx.drawImage(uploadedImage, bgX, bgY, bgDrawWidth, bgDrawHeight);
    if (window.StackBlur) {
      window.StackBlur.canvasRGBA(off, 0, 0, exportWidth, exportHeight, 160); // double radius
    }
    ctx.drawImage(off, 0, 0);
  }

  // Draw centered original image (contain) with border radius
  const fgRatio = uploadedImage.width / uploadedImage.height;
  let fgDrawWidth, fgDrawHeight, fgX, fgY;
  if (exportWidth / exportHeight > fgRatio) {
    fgDrawHeight = exportHeight * 0.9;
    fgDrawWidth = fgDrawHeight * fgRatio;
  } else {
    fgDrawWidth = exportWidth * 0.9;
    fgDrawHeight = fgDrawWidth / fgRatio;
  }
  fgX = (exportWidth - fgDrawWidth) / 2;
  fgY = (exportHeight - fgDrawHeight) / 2;
  const radius = Math.min(fgDrawWidth, fgDrawHeight) * 0.04;
  ctx.save();
  ctx.beginPath();
  roundedRect(ctx, fgX, fgY, fgDrawWidth, fgDrawHeight, radius);
  ctx.clip();
  ctx.drawImage(uploadedImage, fgX, fgY, fgDrawWidth, fgDrawHeight);
  ctx.restore();

  // Download
  const link = document.createElement('a');
  link.download = `frame-card-${selectedAspect.replace(':', 'x')}-${Date.now()}.png`;
  link.href = exportCanvas.toDataURL('image/png');
  link.click();
}

function handleClear() {
  uploadedImage = null;
  imageInput.value = '';
  thumbnailPreview.innerHTML = '';
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  downloadBtn.disabled = true;
  clearBtn.disabled = true;
}
