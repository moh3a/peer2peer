let form = document.getElementById("join-form");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  let inviteCode = String(event.target.invite_link.value).replace(" ", "");
  window.location = `index.html?room=${inviteCode}`;
});
