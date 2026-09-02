/* Founder Decision OS — ui.js
   Reusable UI helpers: escaping, toasts, modals, confirm dialogs, badges,
   clipboard, empty states, nav shell helpers.
*/
(function (FDOS) {
  "use strict";

  function escapeHTML(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // ---------- Toast ----------

  var toastTimer = null;

  function showToast(message) {
    var el = document.getElementById("toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("toast--visible");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove("toast--visible");
    }, 3200);
  }

  // ---------- Status badge ----------

  var STATUS_CLASS = {
    idea: "badge--idea",
    active: "badge--active",
    parked: "badge--parked",
    done: "badge--done",
    killed: "badge--killed"
  };

  function statusBadgeHTML(status) {
    var cls = STATUS_CLASS[status] || "badge--idea";
    var label = FDOS.calc.statusLabel(status);
    return '<span class="badge ' + cls + '"><span class="badge__dot" aria-hidden="true"></span>' + escapeHTML(label) + "</span>";
  }

  // ---------- Modal ----------

  var modalRoot = null;
  var lastFocusedEl = null;
  var currentModalOptions = null;

  function getModalRoot() {
    if (!modalRoot) modalRoot = document.getElementById("modal-root");
    return modalRoot;
  }

  function openModal(options) {
    var root = getModalRoot();
    if (!root) return;
    lastFocusedEl = document.activeElement;
    currentModalOptions = options || {};

    root.innerHTML = "";
    var overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.setAttribute("role", "presentation");

    var dialog = document.createElement("div");
    dialog.className = "modal-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    if (options.labelId) dialog.setAttribute("aria-labelledby", options.labelId);

    dialog.innerHTML = options.html || "";
    overlay.appendChild(dialog);
    root.appendChild(overlay);
    root.classList.add("modal-root--open");

    overlay.addEventListener("mousedown", function (e) {
      if (e.target === overlay && options.allowBackdropClose !== false) {
        closeModal();
      }
    });

    var focusTarget = options.initialFocusSelector ? dialog.querySelector(options.initialFocusSelector) : null;
    if (!focusTarget) focusTarget = dialog.querySelector("[data-autofocus]") || dialog.querySelector("button, input, textarea, select");
    if (focusTarget) focusTarget.focus();

    if (typeof options.onMount === "function") {
      options.onMount(dialog);
    }
  }

  function closeModal() {
    var root = getModalRoot();
    if (!root) return;
    if (currentModalOptions && typeof currentModalOptions.onClose === "function" && currentModalOptions.allowClose !== false) {
      currentModalOptions.onClose();
    }
    root.innerHTML = "";
    root.classList.remove("modal-root--open");
    currentModalOptions = null;
    if (lastFocusedEl && typeof lastFocusedEl.focus === "function") {
      lastFocusedEl.focus();
    }
  }

  function isModalOpen() {
    var root = getModalRoot();
    return !!(root && root.classList.contains("modal-root--open"));
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isModalOpen()) {
      if (!currentModalOptions || currentModalOptions.preventEscapeClose !== true) {
        closeModal();
      }
    }
  });

  // ---------- Confirm dialog ----------

  function confirmDialog(options, onConfirm) {
    var title = escapeHTML(options.title || "Are you sure?");
    var message = escapeHTML(options.message || "");
    var confirmLabel = escapeHTML(options.confirmLabel || "Confirm");
    var cancelLabel = escapeHTML(options.cancelLabel || "Cancel");
    var destructive = options.destructive !== false;

    var html =
      '<div class="modal-header">' +
        '<h2 id="confirm-title" class="modal-title">' + title + "</h2>" +
      "</div>" +
      '<div class="modal-body"><p>' + message + "</p></div>" +
      '<div class="modal-footer">' +
        '<button type="button" class="btn btn--ghost" data-action="cancel">' + cancelLabel + "</button>" +
        '<button type="button" class="btn ' + (destructive ? "btn--danger" : "btn--primary") + '" data-action="confirm">' + confirmLabel + "</button>" +
      "</div>";

    openModal({
      html: html,
      labelId: "confirm-title",
      onMount: function (dialog) {
        dialog.querySelector('[data-action="cancel"]').addEventListener("click", closeModal);
        dialog.querySelector('[data-action="confirm"]').addEventListener("click", function () {
          closeModal();
          onConfirm();
        });
      }
    });
  }

  // ---------- Clipboard ----------

  function copyToClipboard(text, onDone) {
    function fallback() {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.top = "-1000px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        onDone(true);
      } catch (e) {
        onDone(false);
      }
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        onDone(true);
      }).catch(fallback);
    } else {
      fallback();
    }
  }

  // ---------- Empty state ----------

  function emptyStateHTML(options) {
    var title = escapeHTML(options.title || "Nothing here yet");
    var message = escapeHTML(options.message || "");
    var actionHTML = "";
    if (options.actionLabel && options.actionAttr) {
      actionHTML = '<button type="button" class="btn btn--primary" ' + options.actionAttr + ">" + escapeHTML(options.actionLabel) + "</button>";
    }
    return (
      '<div class="empty-state">' +
        '<p class="empty-state__title">' + title + "</p>" +
        '<p class="empty-state__message">' + message + "</p>" +
        actionHTML +
      "</div>"
    );
  }

  // ---------- Nav shell ----------

  function setActiveNav(routeKey) {
    document.querySelectorAll("[data-nav-route]").forEach(function (el) {
      var isActive = el.getAttribute("data-nav-route") === routeKey;
      el.classList.toggle("nav-link--active", isActive);
      if (isActive) {
        el.setAttribute("aria-current", "page");
      } else {
        el.removeAttribute("aria-current");
      }
    });
  }

  function closeMobileMenu() {
    var nav = document.getElementById("sidebar");
    var toggle = document.getElementById("menu-toggle");
    if (nav) nav.classList.remove("sidebar--open");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("no-scroll");
  }

  FDOS.ui = {
    escapeHTML: escapeHTML,
    showToast: showToast,
    statusBadgeHTML: statusBadgeHTML,
    openModal: openModal,
    closeModal: closeModal,
    isModalOpen: isModalOpen,
    confirmDialog: confirmDialog,
    copyToClipboard: copyToClipboard,
    emptyStateHTML: emptyStateHTML,
    setActiveNav: setActiveNav,
    closeMobileMenu: closeMobileMenu
  };

})(window.FDOS = window.FDOS || {});
