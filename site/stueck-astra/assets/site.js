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

const wish = document.querySelector("#wish");
const records = Array.from(document.querySelectorAll(".record"));
function syncPiece(value) {
  wish.value = piece.value = value;
  records.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.piece === value.trim())));
}
wish.addEventListener("input", () => syncPiece(wish.value));
piece.addEventListener("input", () => syncPiece(piece.value));
records.forEach(button => button.addEventListener("click", () => syncPiece(button.dataset.piece)));
document.querySelector(".wish-form").addEventListener("submit", event => {
  event.preventDefault();
  syncPiece(wish.value);
  location.hash = "probestunde";
  document.querySelector("#probestunde").scrollIntoView();
  person.focus({ preventScroll: true });
});