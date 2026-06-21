export function createPortalClipboard({
  logger,
  button,
  navigatorRef = navigator,
  documentRef = document,
  windowRef = window
}) {
  async function copyText(text) {
    try {
      await navigatorRef.clipboard?.writeText?.(text);
    } catch {
      fallbackCopyText(text);
    }
  }

  async function copyTextWithButtonFeedback(text, label = "Copiado") {
    try {
      await navigatorRef.clipboard?.writeText?.(text);
      flashButton(label);
    } catch (error) {
      logger.warn("Failed to copy text", error);
      fallbackCopyText(text);
      flashButton(label);
    }
  }

  function fallbackCopyText(text) {
    const textarea = documentRef.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    documentRef.body.appendChild(textarea);
    textarea.select();
    try {
      documentRef.execCommand("copy");
    } catch {
      //
    }
    textarea.remove();
  }

  function flashButton(label) {
    if (!button) {
      return;
    }

    const originalLabel = button.textContent || "Copiar overlay";
    button.textContent = label;
    windowRef.setTimeout(() => {
      if (button) {
        button.textContent = originalLabel;
      }
    }, 1400);
  }

  return {
    copyText,
    copyTextWithButtonFeedback,
    flashButton
  };
}
