/* Founder Decision OS — storage.js
   State shape, localStorage read/write/reset, ID generation, validation.
*/
(function (FDOS) {
  "use strict";

  var STORAGE_KEY = "founderDecisionOSState";

  function defaultState() {
    return {
      bets: [],
      decisionLogs: [],
      hasSeenWelcome: false
    };
  }

  function createId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    // Fallback ID generator (not cryptographically strong, but unique enough for local use)
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function isString(v) { return typeof v === "string"; }
  function isNumber(v) { return typeof v === "number" && !isNaN(v); }

  var VALID_STATUSES = ["idea", "active", "parked", "done", "killed"];

  function sanitizeBet(raw) {
    if (!raw || typeof raw !== "object") return null;
    var now = new Date().toISOString();
    var bet = {
      id: isString(raw.id) && raw.id ? raw.id : createId(),
      title: isString(raw.title) ? raw.title : "",
      problem: isString(raw.problem) ? raw.problem : "",
      hypothesis: isString(raw.hypothesis) ? raw.hypothesis : "",
      successMetric: isString(raw.successMetric) ? raw.successMetric : "",
      owner: isString(raw.owner) ? raw.owner : "",
      reviewDate: isString(raw.reviewDate) ? raw.reviewDate : "",
      status: VALID_STATUSES.indexOf(raw.status) !== -1 ? raw.status : "idea",
      strategyFit: isNumber(raw.strategyFit) ? clamp05(raw.strategyFit) : 0,
      upside: isNumber(raw.upside) ? clamp05(raw.upside) : 0,
      cost: isNumber(raw.cost) ? clamp05(raw.cost) : 0,
      risk: isNumber(raw.risk) ? clamp05(raw.risk) : 0,
      evidence: isNumber(raw.evidence) ? clamp05(raw.evidence) : 0,
      reversibility: isNumber(raw.reversibility) ? clamp05(raw.reversibility) : 0,
      priorityScore: isNumber(raw.priorityScore) ? raw.priorityScore : 0,
      parkedReason: isString(raw.parkedReason) ? raw.parkedReason : "",
      progressNote: isString(raw.progressNote) ? raw.progressNote : "",
      createdAt: isString(raw.createdAt) ? raw.createdAt : now,
      updatedAt: isString(raw.updatedAt) ? raw.updatedAt : now,
      activatedAt: isString(raw.activatedAt) ? raw.activatedAt : null,
      lastReviewedAt: isString(raw.lastReviewedAt) ? raw.lastReviewedAt : null
    };
    return bet;
  }

  function clamp05(n) {
    n = Math.round(n);
    if (n < 0) return 0;
    if (n > 5) return 5;
    return n;
  }

  function sanitizeLog(raw) {
    if (!raw || typeof raw !== "object") return null;
    var now = new Date().toISOString();
    return {
      id: isString(raw.id) && raw.id ? raw.id : createId(),
      weekStart: isString(raw.weekStart) ? raw.weekStart : "",
      weekEnd: isString(raw.weekEnd) ? raw.weekEnd : "",
      content: isString(raw.content) ? raw.content : "",
      createdAt: isString(raw.createdAt) ? raw.createdAt : now
    };
  }

  function validateState(raw) {
    var fallback = defaultState();
    if (!raw || typeof raw !== "object") return fallback;

    var state = {
      bets: [],
      decisionLogs: [],
      hasSeenWelcome: typeof raw.hasSeenWelcome === "boolean" ? raw.hasSeenWelcome : false
    };

    if (Array.isArray(raw.bets)) {
      raw.bets.forEach(function (b) {
        var clean = sanitizeBet(b);
        if (clean) state.bets.push(clean);
      });
    }

    if (Array.isArray(raw.decisionLogs)) {
      raw.decisionLogs.forEach(function (l) {
        var clean = sanitizeLog(l);
        if (clean) state.decisionLogs.push(clean);
      });
    }

    return state;
  }

  function loadState() {
    try {
      var rawText = window.localStorage.getItem(STORAGE_KEY);
      if (!rawText) return defaultState();
      var parsed = JSON.parse(rawText);
      return validateState(parsed);
    } catch (e) {
      console.warn("FDOS: failed to load state, falling back to default.", e);
      return defaultState();
    }
  }

  function saveState(state) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      console.warn("FDOS: failed to save state.", e);
      return false;
    }
  }

  function resetState() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn("FDOS: failed to clear storage.", e);
    }
    return defaultState();
  }

  FDOS.storage = {
    STORAGE_KEY: STORAGE_KEY,
    defaultState: defaultState,
    createId: createId,
    validateState: validateState,
    loadState: loadState,
    saveState: saveState,
    resetState: resetState,
    sanitizeBet: sanitizeBet,
    sanitizeLog: sanitizeLog,
    VALID_STATUSES: VALID_STATUSES
  };

})(window.FDOS = window.FDOS || {});
