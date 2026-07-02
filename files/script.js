// ============================================================
// This file controls PAGE 1 — the card builder.
//
// It now works in TWO modes:
//   BUILD MODE  — the normal case. You customize a card and click
//                 "Send," which uploads it to Firestore (a cloud
//                 database) and gives you a link to share.
//   VIEW MODE   — happens automatically when someone opens a link
//                 that has "?id=something" at the end. We fetch
//                 that exact card from Firestore and show it,
//                 read-only, with the real photos and message.
// ============================================================

const card = document.getElementById('card');
const cardName = document.getElementById('cardName');
const cardMessage = document.getElementById('cardMessage');
const fontPicker = document.getElementById('fontPicker');
const bgSwatches = document.querySelectorAll('.swatch');
const customColor = document.getElementById('customColor');
const recipientName = document.getElementById('recipientName');
const messageInput = document.getElementById('messageInput');
const photoInput = document.getElementById('photoInput');
const slideshow = document.getElementById('slideshow');
const slideEmpty = document.getElementById('slideEmpty');
const sendBtn = document.getElementById('sendBtn');
const shareBox = document.getElementById('shareBox');
const shareLink = document.getElementById('shareLink');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const previewLink = document.getElementById('previewLink');
const goToCandles = document.getElementById('goToCandles');
const loadingNote = document.getElementById('loadingNote');

let currentBg = { type: 'class', value: 'bg-sunset' };
let slideTimer = null;
let uploadedImages = []; // resized base64 images, ready to store

const params = new URLSearchParams(window.location.search);
const cardId = params.get('id');

if (cardId) {
  loadCardForViewing(cardId);
} else {
  loadingNote.classList.add('hide');
  setUpBuilder();
}

// ============================================================
// VIEW MODE — someone opened a shared link
// ============================================================
async function loadCardForViewing(id) {
  document.body.classList.add('view-mode');

  try {
    const doc = await db.collection('cards').doc(id).get();
    if (!doc.exists) {
      loadingNote.textContent = "We couldn't find that card — the link may be wrong.";
      return;
    }
    const data = doc.data();

    card.className = 'card ' + (data.font || 'font-pacifico');
    if (data.bg && data.bg.type === 'color') {
      card.style.background = data.bg.value;
    } else if (data.bg) {
      card.classList.add(data.bg.value);
    }
    cardName.textContent = data.name || '';
    cardMessage.textContent = data.message || '';

    if (data.images && data.images.length > 0) {
      buildSlides(data.images);
    }

    loadingNote.classList.add('hide');
    goToCandles.classList.add('show');
    goToCandles.href = `candles.html?id=${id}`;
  } catch (err) {
    console.error(err);
    loadingNote.textContent = 'Something went wrong loading this card.';
  }
}

// ============================================================
// BUILD MODE — the normal card-making experience
// ============================================================
function setUpBuilder() {
  fontPicker.addEventListener('change', () => {
    card.classList.remove('font-pacifico', 'font-fredoka', 'font-caveat', 'font-playfair');
    card.classList.add(fontPicker.value);
  });

  bgSwatches.forEach((btn) => {
    btn.addEventListener('click', () => {
      bgSwatches.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      card.className = card.className.replace(/\bbg-\S+/g, '').trim();
      card.classList.add(btn.dataset.bg);
      card.style.background = '';
      currentBg = { type: 'class', value: btn.dataset.bg };
    });
  });
  bgSwatches[0].classList.add('active');

  customColor.addEventListener('input', () => {
    bgSwatches.forEach((b) => b.classList.remove('active'));
    card.className = card.className.replace(/\bbg-\S+/g, '').trim();
    card.style.background = customColor.value;
    currentBg = { type: 'color', value: customColor.value };
  });

  recipientName.addEventListener('input', () => {
    cardName.textContent = recipientName.value.trim();
  });

  messageInput.addEventListener('input', () => {
    cardMessage.textContent = messageInput.value;
  });

  photoInput.addEventListener('change', async () => {
    const files = Array.from(photoInput.files).slice(0, 6); // keep it to 6 max, so it stays small
    if (files.length === 0) return;

    sendBtn.disabled = true;
    sendBtn.textContent = 'Preparing photos…';

    uploadedImages = await Promise.all(files.map(resizeImage));
    buildSlides(uploadedImages);

    sendBtn.disabled = false;
    sendBtn.textContent = 'Send the card 🎉';
  });

  sendBtn.addEventListener('click', async () => {
    sendBtn.disabled = true;
    sendBtn.textContent = 'Uploading…';

    const payload = {
      name: recipientName.value.trim(),
      message: messageInput.value.trim(),
      font: fontPicker.value,
      bg: currentBg,
      images: uploadedImages,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    try {
      const docRef = await db.collection('cards').add(payload);
      const link = `${window.location.origin}${window.location.pathname.replace('index.html', '')}index.html?id=${docRef.id}`;

      shareLink.value = link;
      previewLink.href = link;
      shareBox.classList.add('show');

      // also keep a local copy so the sender's own "candles" preview works instantly
      localStorage.setItem('birthdayCard', JSON.stringify(payload));
    } catch (err) {
      console.error(err);
      alert("We couldn't upload the card. Check your internet connection and Firebase setup, then try again.");
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send the card 🎉';
    }
  });

  copyLinkBtn.addEventListener('click', () => {
    shareLink.select();
    navigator.clipboard.writeText(shareLink.value).then(() => {
      copyLinkBtn.textContent = 'Copied!';
      setTimeout(() => (copyLinkBtn.textContent = 'Copy'), 1500);
    });
  });
}

// ============================================================
// Shared helpers
// ============================================================

// Shrinks a photo down before we store it, so cards stay small
// and fast to load (full-size phone photos are way bigger than we need).
function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 800;
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function buildSlides(urls) {
  slideshow.innerHTML = '';
  if (slideTimer) clearInterval(slideTimer);

  urls.forEach((url, i) => {
    const div = document.createElement('div');
    div.className = 'slide' + (i === 0 ? ' active' : '');
    div.style.backgroundImage = `url(${url})`;
    slideshow.appendChild(div);
  });

  if (urls.length > 1) {
    let index = 0;
    slideTimer = setInterval(() => {
      const slides = slideshow.querySelectorAll('.slide');
      slides[index].classList.remove('active');
      index = (index + 1) % slides.length;
      slides[index].classList.add('active');
    }, 2500);
  }
}
