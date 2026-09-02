/* Founder Decision OS — calculations.js
   Decision Signal, Bottleneck Signal, Decision Debt, and date helpers.
*/
(function (FDOS) {
  "use strict";

  var DAY_MS = 24 * 60 * 60 * 1000;

  // ---------- Date helpers ----------

  function parseDate(str) {
    if (!str) return null;
    var d = new Date(str);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  function daysBetween(a, b) {
    var start = new Date(a.getFullYear(), a.getMonth(), a.getDate());
    var end = new Date(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((end - start) / DAY_MS);
  }

  function daysAgo(isoString) {
    var d = parseDate(isoString);
    if (!d) return null;
    return daysBetween(d, new Date());
  }

  function isPastDate(isoString) {
    var d = parseDate(isoString);
    if (!d) return false;
    var today = new Date();
    var todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return target < todayMid;
  }

  function formatDate(isoString) {
    var d = parseDate(isoString);
    if (!d) return "No date set";
    var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return months[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
  }

  function toISODateOnly(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function addDays(d, n) {
    var copy = new Date(d.getTime());
    copy.setDate(copy.getDate() + n);
    return copy;
  }

  // Returns { monday: Date, sunday: Date } for the current week
  function getCurrentWeekRange(refDate) {
    var d = refDate ? new Date(refDate.getTime()) : new Date();
    var day = d.getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
    var diffToMonday = (day === 0) ? -6 : (1 - day);
    var monday = addDays(d, diffToMonday);
    var sunday = addDays(monday, 6);
    monday.setHours(0, 0, 0, 0);
    sunday.setHours(0, 0, 0, 0);
    return { monday: monday, sunday: sunday };
  }

  function formatWeekRange(mondayDate, sundayDate) {
    return formatDate(toISODateOnly(mondayDate)) + " – " + formatDate(toISODateOnly(sundayDate));
  }

  // ---------- Decision Signal ----------

  function calcDecisionSignal(bet) {
    var sf = Number(bet.strategyFit) || 0;
    var up = Number(bet.upside) || 0;
    var cost = Number(bet.cost) || 0;
    var risk = Number(bet.risk) || 0;
    var ev = Number(bet.evidence) || 0;
    var rev = Number(bet.reversibility) || 0;
    return sf + up + ev + rev - cost - risk;
  }

  // ---------- Status helpers ----------

  var STATUS_LABELS = {
    idea: "Idea",
    active: "Current",
    parked: "Parked",
    done: "Done",
    killed: "Killed"
  };

  function statusLabel(status) {
    return STATUS_LABELS[status] || status;
  }

  function isStaleIdea(bet, thresholdDays) {
    thresholdDays = thresholdDays || 14;
    if (bet.status !== "idea") return false;
    var age = daysAgo(bet.createdAt);
    return age !== null && age >= thresholdDays;
  }

  function isOverdue(bet) {
    if (!bet.reviewDate) return false;
    if (bet.status === "done" || bet.status === "killed") return false;
    return isPastDate(bet.reviewDate);
  }

  function notReviewedRecently(bet, thresholdDays) {
    thresholdDays = thresholdDays || 14;
    if (bet.status === "done" || bet.status === "killed") return false;
    var refDate = bet.lastReviewedAt || bet.updatedAt || bet.createdAt;
    var age = daysAgo(refDate);
    return age !== null && age >= thresholdDays;
  }

  // ---------- Bottleneck Signal ----------
  // Practical focus-risk heuristic, 0-100, not a scientific measurement.

  function calcBottleneckSignal(bets) {
    var score = 0;
    var reasons = [];

    var active = bets.filter(function (b) { return b.status === "active"; });

    if (active.length > 2) {
      score += 20;
      reasons.push(active.length + " bets are marked current, above the two-bet focus limit.");
    }

    var overdueActiveCount = 0;
    active.forEach(function (b) {
      if (isOverdue(b)) overdueActiveCount++;
    });
    if (overdueActiveCount > 0) {
      score += 10 * overdueActiveCount;
      reasons.push(overdueActiveCount + " current bet" + (overdueActiveCount === 1 ? "" : "s") + " " + (overdueActiveCount === 1 ? "has" : "have") + " a review date in the past.");
    }

    var overdueNonTerminalCount = 0;
    bets.forEach(function (b) {
      if (b.status !== "done" && b.status !== "killed" && b.status !== "active" && isOverdue(b)) {
        overdueNonTerminalCount++;
      }
    });
    if (overdueNonTerminalCount > 0) {
      score += 8 * overdueNonTerminalCount;
      reasons.push(overdueNonTerminalCount + " other unresolved bet" + (overdueNonTerminalCount === 1 ? "" : "s") + " " + (overdueNonTerminalCount === 1 ? "has" : "have") + " passed its review date.");
    }

    var staleReviewCount = 0;
    bets.forEach(function (b) {
      if (b.status !== "done" && b.status !== "killed" && notReviewedRecently(b, 14)) {
        staleReviewCount++;
      }
    });
    if (staleReviewCount > 0) {
      score += 6 * staleReviewCount;
      reasons.push(staleReviewCount + " bet" + (staleReviewCount === 1 ? "" : "s") + " " + (staleReviewCount === 1 ? "hasn't" : "haven't") + " been reviewed in 14+ days.");
    }

    var staleIdeaCount = 0;
    bets.forEach(function (b) {
      if (isStaleIdea(b, 14)) staleIdeaCount++;
    });
    if (staleIdeaCount > 0) {
      score += 5 * staleIdeaCount;
      reasons.push(staleIdeaCount + " idea" + (staleIdeaCount === 1 ? "" : "s") + " " + (staleIdeaCount === 1 ? "has" : "have") + " sat unresolved for 14+ days.");
    }

    if (score > 100) score = 100;

    var classification;
    if (score <= 20) classification = "Clear";
    else if (score <= 45) classification = "Watch";
    else if (score <= 70) classification = "At risk";
    else classification = "Bottlenecked";

    return {
      score: score,
      classification: classification,
      reasons: reasons.slice(0, 3)
    };
  }

  // ---------- Decision Debt ----------

  function calcDecisionDebt(bets) {
    var overdueActive = bets.filter(function (b) {
      return b.status === "active" && isOverdue(b);
    });

    var staleIdeas = bets.filter(function (b) {
      return isStaleIdea(b, 14);
    });

    var activeNoProgress = bets.filter(function (b) {
      return b.status === "active" && (!b.progressNote || !b.progressNote.trim());
    });

    var parkedNoReason = bets.filter(function (b) {
      return b.status === "parked" && (!b.parkedReason || !b.parkedReason.trim());
    });

    var total = overdueActive.length + staleIdeas.length + activeNoProgress.length + parkedNoReason.length;

    return {
      total: total,
      overdueActive: overdueActive,
      staleIdeas: staleIdeas,
      activeNoProgress: activeNoProgress,
      parkedNoReason: parkedNoReason
    };
  }

  FDOS.calc = {
    parseDate: parseDate,
    daysAgo: daysAgo,
    isPastDate: isPastDate,
    formatDate: formatDate,
    toISODateOnly: toISODateOnly,
    addDays: addDays,
    getCurrentWeekRange: getCurrentWeekRange,
    formatWeekRange: formatWeekRange,
    calcDecisionSignal: calcDecisionSignal,
    statusLabel: statusLabel,
    isStaleIdea: isStaleIdea,
    isOverdue: isOverdue,
    notReviewedRecently: notReviewedRecently,
    calcBottleneckSignal: calcBottleneckSignal,
    calcDecisionDebt: calcDecisionDebt
  };

})(window.FDOS = window.FDOS || {});
