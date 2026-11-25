"use strict";

const booking = document.querySelector("#booking-form");
const person = booking.elements.name;
const contact = booking.elements.contact;
const piece = booking.elements.piece;
const confirmation = booking.querySelector(".contact-status");
const endpoints = window.lessonContact;

function validateContact() {
  const value = contact.value.trim();
  const isMail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const isPhone = /^[+\d()\s./-]+$/.test(value) && value.replace(/\D/g, "").length >= 5;
  contact.setCustomValidity(value && !isMail && !isPhone ? "Gib eine Telefonnummer oder eine E-Mail-Adresse ein." : "");
}
person.addEventListener("input", () => person.setCustomValidity(""));
contact.addEventListener("input", () => contact.setCustomValidity(""));
booking.addEventListener("submit", event => {
  event.preventDefault();
  person.setCustomValidity(person.value.trim() ? "" : "Gib bitte deinen Namen ein.");
  validateContact();
  if (!contact.value.trim()) contact.setCustomValidity("Gib eine Telefonnummer oder eine E-Mail-Adresse ein.");
  if (!booking.reportValidity()) return;

  const lines = ["Hallo Luca,", "", "ich würde gerne eine kostenlose Probestunde vereinbaren."];
  if (piece.value.trim()) lines.push("Mein Wunschstück ist " + piece.value.trim() + ".");
  lines.push("Du erreichst mich unter " + contact.value.trim() + ".", "", "Viele Grüße", person.value.trim());
  const message = encodeURIComponent(lines.join("\n"));
  const isWhatsApp = event.submitter?.value === "whatsapp";
  const recipient = isWhatsApp ? endpoints.whatsapp.replace(/\D/g, "") : endpoints.email.trim();
  confirmation.textContent = recipient
    ? "Dein Entwurf ist vorbereitet. Sende ihn in der geöffneten App ab."
    : "Dein Entwurf ist vorbereitet. Wähle Luca Bovelli als Empfänger und sende die Nachricht ab.";
  if (isWhatsApp) {
    window.open("https://wa.me/" + recipient + "?text=" + message, "_blank", "noopener,noreferrer");
  } else {
    window.location.href = "mailto:" + recipient + "?subject=" + encodeURIComponent("Kostenlose Probestunde in Aying") + "&body=" + message;
  }
});

const controls = Array.from(document.querySelectorAll("[data-audio]"));
const audioStatus = document.querySelector("#audio-status");
function stop(button) {
  const audio = document.getElementById(button.dataset.audio);
  audio.pause();
  audio.currentTime = 0;
}
controls.forEach(button => {
  const audio = document.getElementById(button.dataset.audio);
  const title = button.querySelector("strong").textContent.replace(" anhören", "");
  const display = playing => {
    button.setAttribute("aria-pressed", String(playing));
    const label = title + (playing ? " stoppen" : " anhören");
    button.setAttribute("aria-label", label);
    button.querySelector("strong").textContent = label;
  };
  audio.addEventListener("playing", () => display(true));
  audio.addEventListener("pause", () => display(false));
  audio.addEventListener("ended", () => display(false));
  button.addEventListener("click", async () => {
    const wasPlaying = !audio.paused;
    controls.forEach(stop);
    if (wasPlaying) return;
    audioStatus.textContent = "";
    try { await audio.play(); }
    catch (error) {
      if (error.name !== "AbortError") audioStatus.textContent = "Das Hörbeispiel konnte nicht abgespielt werden.";
    }
  });
});
window.addEventListener("pagehide", () => controls.forEach(stop));