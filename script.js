// ============================================================
// This file controls PAGE 1 — the card builder.
// Every time the person changes something on the left,
// we update the live preview card on the right.
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

let currentBg = { type: 'class', value: 'bg-sunset' };
let slideTimer = null;

// ---- Font change ----
fontPicker.addEventListener('change', () => {
  card.classList.remove('font-pacifico', 'font-fredoka', 'font-caveat', 'font-playfair');
  card.classList.add(fontPicker.value);
});

// ---- Preset background swatches ----
bgSwatches.forEach((btn) => {
  btn.addEventListener('click', () => {
    bgSwatches.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    // remove any previous bg-* class
    card.className = card.className.replace(/\bbg-\S+/g, '').trim();
    card.classList.add(btn.dataset.bg);
    card.style.background = ''; // clear any custom inline color
    currentBg = { type: 'class', value: btn.dataset.bg };
  });
});
// mark the first swatch active by default
bgSwatches[0].classList.add('active');

// ---- Custom color picker ----
customColor.addEventListener('input', () => {
  bgSwatches.forEach((b) => b.classList.remove('active'));
  card.className = card.className.replace(/\bbg-\S+/g, '').trim();
  card.style.background = customColor.value;
  currentBg = { type: 'color', value: customColor.value };
});

// ---- Recipient name ----
recipientName.addEventListener('input', () => {
  cardName.textContent = recipientName.value.trim();
});

// ---- Message ----
messageInput.addEventListener('input', () => {
  cardMessage.textContent = messageInput.value;
});

// ---- Photo slideshow ----
photoInput.addEventListener('change', () => {
  const files = Array.from(photoInput.files);
  if (files.length === 0) return;

  slideshow.innerHTML = '';
  if (slideTimer) clearInterval(slideTimer);

  let loaded = 0;
  const urls = [];

  files.forEach((file, i) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      urls[i] = e.target.result;
      loaded++;
      if (loaded === files.length) {
        buildSlides(urls);
      }
    };
    reader.readAsDataURL(file);
  });
});

function buildSlides(urls) {
  slideshow.innerHTML = '';
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

// ---- Send the card: save what we need, then go to the candle page ----
sendBtn.addEventListener('click', () => {
  const data = {
    name: recipientName.value.trim(),
    message: messageInput.value.trim(),
    font: fontPicker.value,
    bg: currentBg,
  };
  localStorage.setItem('birthdayCard', JSON.stringify(data));
  window.location.href = 'candles.html';
});
