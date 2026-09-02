/* Founder Decision OS — generators.js
   Deterministic, template-based generation of Bet Briefs and Decision Logs.
   No AI, no network requests.
*/
(function (FDOS) {
  "use strict";

  function safe(text, fallback) {
    if (text && String(text).trim()) return String(text).trim();
    return fallback || "Not specified yet.";
  }

  // ---------- Bet Brief ----------

  function generateWhyNow(bet) {
    var parts = [];
    if (Number(bet.strategyFit) >= 4) {
      parts.push("It aligns closely with the current company goal.");
    }
    if (Number(bet.upside) >= 4) {
      parts.push("If it works, the impact looks meaningful rather than marginal.");
    }
    if (Number(bet.evidence) >= 4) {
      parts.push("There is already reasonable customer or usage evidence pointing this direction.");
    }
    if (Number(bet.evidence) <= 2) {
      parts.push("Evidence is currently limited, so validation should happen before a broad build.");
    }
    if (parts.length === 0) {
      parts.push("The case for urgency is not strong on the numbers alone — treat this as worth discussing rather than assuming.");
    }
    parts.push("None of this is certain; it is a starting point for a conversation, not a guarantee.");
    return parts.join(" ");
  }

  function generateAssumptions(bet) {
    var title = safe(bet.title, "this bet");
    var assumptions = [];
    assumptions.push("Customers who encounter \"" + title + "\" actually experience the problem described, not just an adjacent one.");
    if (Number(bet.evidence) <= 2) {
      assumptions.push("The problem is common enough, and painful enough, to justify the cost of solving it now.");
    } else {
      assumptions.push("The existing evidence generalizes beyond the customers who already raised it.");
    }
    if (Number(bet.risk) >= 4) {
      assumptions.push("A smaller, lower-risk version can still produce a meaningful signal before committing further.");
    } else {
      assumptions.push("The success metric will move quickly enough to know within the review window whether this is working.");
    }
    return assumptions.slice(0, 3);
  }

  function generateExperiments(bet, betTitle) {
    var experiments = [];
    var lowEvidence = Number(bet.evidence) <= 2;
    var highRisk = Number(bet.risk) >= 4;

    if (lowEvidence) {
      experiments.push("Run 4–6 short customer interviews focused specifically on the problem behind \"" + betTitle + "\", before writing any code.");
      experiments.push("Put up a simple landing page or waitlist describing \"" + betTitle + "\" to see how many people actually want it.");
      experiments.push("Build a clickable prototype of \"" + betTitle + "\" and walk 3–5 customers through it to gauge reaction.");
    } else if (highRisk) {
      experiments.push("Run a short technical spike to de-risk the hardest part of \"" + betTitle + "\" before committing the full build.");
      experiments.push("Deliver \"" + betTitle + "\" manually or as a concierge service for a handful of accounts first.");
      experiments.push("Build a rough prototype of \"" + betTitle + "\" to test the riskiest assumption directly.");
    } else {
      experiments.push("Ship a small, instrumented version of \"" + betTitle + "\" to a limited segment and watch the success metric closely.");
      experiments.push("Run a short usability test of \"" + betTitle + "\" with 3–5 target customers.");
      experiments.push("Reach out directly to a handful of relevant customers about \"" + betTitle + "\" to sanity-check the hypothesis.");
    }
    return experiments.slice(0, 3);
  }

  function generateBetBrief(bet) {
    var title = safe(bet.title, "Untitled bet");
    var hypothesis = safe(bet.hypothesis, "the underlying hypothesis for this bet");
    var lines = [];

    lines.push("# Bet Brief: " + title);
    lines.push("");
    lines.push("## 1. Decision to make");
    lines.push("Should we invest in " + title + " now?");
    lines.push("");
    lines.push("## 2. Problem");
    lines.push(safe(bet.problem, "No problem statement recorded yet."));
    lines.push("");
    lines.push("## 3. Hypothesis");
    lines.push(safe(bet.hypothesis, "No hypothesis recorded yet."));
    lines.push("");
    lines.push("## 4. Success signal");
    lines.push(safe(bet.successMetric, "No success metric recorded yet."));
    lines.push("");
    lines.push("## 5. Why now");
    lines.push(generateWhyNow(bet));
    lines.push("");
    lines.push("## 6. Scope");
    lines.push("In: The smallest version needed to test whether " + hypothesis + ".");
    lines.push("Out: A full-scale build, unrelated roadmap work, and premature optimization.");
    lines.push("");
    lines.push("## 7. Assumptions to test");
    generateAssumptions(bet).forEach(function (a) {
      lines.push("- " + a);
    });
    lines.push("");
    lines.push("## 8. Smallest experiments");
    generateExperiments(bet, title).forEach(function (e) {
      lines.push("- " + e);
    });
    lines.push("");
    lines.push("## 9. Review checkpoint");
    lines.push("Owner: " + safe(bet.owner, "Unassigned") + ". Review on: " + FDOS.calc.formatDate(bet.reviewDate) + ".");
    lines.push("");
    lines.push("## 10. Decision Signal note");
    lines.push("Decision Signal: " + bet.priorityScore + ". This score is a conversation aid, not a decision.");
    lines.push("");

    return lines.join("\n");
  }

  // ---------- Decision Log ----------

  function reasonForCurrentBet(bet) {
    var reasons = [];
    if (Number(bet.strategyFit) >= 4) reasons.push("strong strategic fit");
    if (Number(bet.upside) >= 4) reasons.push("meaningful upside if it works");
    if (Number(bet.evidence) >= 4) reasons.push("solid supporting evidence");
    if (reasons.length === 0) {
      return "Decision Signal of " + bet.priorityScore + " and team judgment.";
    }
    return reasons.join(", ") + " (Decision Signal: " + bet.priorityScore + ").";
  }

  function generateDecisionLogContent(state, mondayDate, sundayDate) {
    var calc = FDOS.calc;
    var weekRange = calc.formatWeekRange(mondayDate, sundayDate);
    var bets = state.bets || [];

    var current = bets.filter(function (b) { return b.status === "active"; });
    var parked = bets.filter(function (b) { return b.status === "parked"; });

    var lines = [];
    lines.push("# Weekly Decision Log — " + weekRange);
    lines.push("");
    lines.push("## Current bets");
    if (current.length === 0) {
      lines.push("- No bets are currently marked as current.");
    } else {
      current.forEach(function (b) {
        lines.push("- " + safe(b.title, "Untitled bet") + ": " + reasonForCurrentBet(b));
      });
    }
    lines.push("");
    lines.push("## Parked bets");
    if (parked.length === 0) {
      lines.push("- No bets are currently parked.");
    } else {
      parked.forEach(function (b) {
        lines.push("- " + safe(b.title, "Untitled bet") + ": " + safe(b.parkedReason, "No reason recorded."));
      });
    }
    lines.push("");
    lines.push("## Decisions to revisit");
    var toRevisit = [];
    bets.forEach(function (b) {
      if (b.status === "done" || b.status === "killed") return;
      if (calc.isOverdue(b)) {
        toRevisit.push(safe(b.title, "Untitled bet") + " — review date has passed.");
      } else if (calc.isStaleIdea(b, 14)) {
        toRevisit.push(safe(b.title, "Untitled bet") + " — idea has sat unresolved for 14+ days.");
      }
    });
    if (toRevisit.length === 0) {
      lines.push("- None identified this week.");
    } else {
      toRevisit.forEach(function (t) { lines.push("- " + t); });
    }
    lines.push("");
    lines.push("## Focus for next week");
    if (current.length >= 2) {
      lines.push("- Protect time for " + safe(current[0].title, "current bet 1") + " and " + safe(current[1].title, "current bet 2") + ". Do not make another bet current unless one is completed, killed, or parked.");
    } else if (current.length === 1) {
      lines.push("- Protect time for " + safe(current[0].title, "the current bet") + ". There is one focus slot remaining — use it deliberately.");
    } else {
      lines.push("- No bets are current. Use Bet Council to choose up to two before next week.");
    }
    lines.push("");

    return lines.join("\n");
  }

  FDOS.generators = {
    generateBetBrief: generateBetBrief,
    generateDecisionLogContent: generateDecisionLogContent
  };

})(window.FDOS = window.FDOS || {});
