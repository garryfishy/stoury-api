document.querySelectorAll("[data-admin-form]").forEach((form) => {
  form.addEventListener("submit", () => {
    const submitButton = form.querySelector("button[type='submit']");

    if (!submitButton || submitButton.disabled) {
      return;
    }

    const loadingLabel = submitButton.getAttribute("data-loading-label");

    if (loadingLabel) {
      submitButton.dataset.originalLabel = submitButton.textContent;
      submitButton.textContent = loadingLabel;
    }

    submitButton.disabled = true;
  });
});
