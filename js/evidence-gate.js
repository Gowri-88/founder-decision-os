/* Founder Decision OS — evidence-gate.js
   Rule-based analysis of a raw idea/feature request/customer comment.

   IMPORTANT: This is a deliberate, honest MOCK — not a real AI model.
   It uses keyword and pattern heuristics only. It is structured so the
   internals of analyze() can later be swapped for a real API call
   without changing anything that calls it (same input, same output shape,
   both synchronous today and Promise-returning for forward compatibility).

   This tool identifies missing evidence and unstated assumptions. It
   cannot verify whether claimed evidence is true, and it will not stop
   someone determined to fabricate detail. It raises the floor on
   unconscious vagueness — it is not a lie detector.
*/
(function (FDOS) {
  "use strict";

  var EVIDENCE_WORDS = [
    "interview", "interviews", "survey", "surveys", "ticket", "tickets",
    "data", "metric", "metrics", "said", "reported", "requested", "asked",
    "churn", "nps", "customer", "customers", "user", "users", "cohort",
    "baseline", "conversion", "retention", "revenue", "signup", "signups",
    "%", "percent"
  ];

  var SEGMENT_WORDS = [
    "segment", "cohort", "trial", "enterprise", "new user", "existing",
    "which users", "small business", "smb", "power user"
  ];

  var BASELINE_WORDS = [
    "currently", "baseline", "today", "right now", "at the moment", "%"
  ];

  var OUTCOME_TRIGGERS = [
    "will ", "to increase", "to improve", "to reduce", "to boost",
    "to grow", "leads to", "leading to", "results in", "so that", "improve ",
    "increase ", "reduce ", "boost ", "would be", "would result", "would lead",
    "outcome would", "outcome is", "outcome:"
  ];

  var CATEGORY_RULES = [
    {
      keywords: ["retention", "churn", "engagement", "streak", "habit", "addict"],
      alternative: "Low retention or engagement could be caused by weak onboarding, unclear core value, or users never reaching the product's core activation moment — not necessarily by the absence of this specific feature.",
      testIfNoEvidence: "Interview 5 recently inactive or churned users about why they actually left, before building anything.",
      testIfSomeEvidence: "Get one concrete number (a retention curve, a churn rate, a specific cohort) behind this claim before treating it as validated."
    },
    {
      keywords: ["checkout", "payment", "billing", "convert", "conversion", "revenue", "pricing", "cart"],
      alternative: "Conversion or revenue issues are often caused by trust signals, pricing clarity, or friction already in the existing flow, rather than a missing feature — worth ruling out before building something new.",
      testIfNoEvidence: "Pull the actual funnel drop-off data or run 4-6 short interviews with users who abandoned this flow, before scoping a rebuild.",
      testIfSomeEvidence: "Confirm the specific step in the flow where users drop off with real funnel data before committing to a full rebuild."
    },
    {
      keywords: ["signup", "acquisition", "growth", "traffic", "leads", "onboarding"],
      alternative: "Weak acquisition or activation is often a channel, positioning, or targeting problem rather than a product gap — worth checking before assuming a new feature will fix it.",
      testIfNoEvidence: "Talk to 4-6 recent signups (or people who didn't convert) about what almost stopped them, before building.",
      testIfSomeEvidence: "Confirm the claimed driver with a small instrumented test before committing further build time."
    },
    {
      keywords: ["support", "ticket", "agent", "helpdesk", "response time"],
      alternative: "Support load is sometimes caused by product confusion upstream rather than a missing tool for agents — worth checking where in the product users get stuck before adding tooling.",
      testIfNoEvidence: "Shadow or interview 3-4 support agents about where this specific friction actually shows up, before building.",
      testIfSomeEvidence: "Confirm the ticket volume or time-saved estimate with real support data before committing further build time."
    }
  ];

  var DEFAULT_RULE = {
    alternative: "There may be a simpler or unrelated explanation for the underlying problem that hasn't been ruled out yet.",
    testIfNoEvidence: "Talk to 4-6 relevant users directly about the underlying problem before building anything — this idea currently has no supporting evidence attached.",
    testIfSomeEvidence: "Get one more concrete data point (a number, a ticket count, a specific quote) before treating this as validated."
  };

  function toLower(s) { return (s || "").toLowerCase(); }

  function containsAny(text, words) {
    var lower = toLower(text);
    for (var i = 0; i < words.length; i++) {
      if (lower.indexOf(words[i]) !== -1) return true;
    }
    return false;
  }

  function countMatches(text, words) {
    var lower = toLower(text);
    var count = 0;
    for (var i = 0; i < words.length; i++) {
      if (lower.indexOf(words[i]) !== -1) count++;
    }
    return count;
  }

  function extractProposedSolution(text) {
    var trimmed = text.trim();
    var firstSentenceMatch = trimmed.match(/^[^.!?]+[.!?]?/);
    var first = firstSentenceMatch ? firstSentenceMatch[0].trim() : trimmed;
    if (first.length > 140) first = first.slice(0, 140).trim() + "…";
    return first || "Not clearly stated.";
  }

  function extractClaimedOutcome(text) {
    var lower = toLower(text);
    for (var i = 0; i < OUTCOME_TRIGGERS.length; i++) {
      var trigger = OUTCOME_TRIGGERS[i];
      var idx = lower.indexOf(trigger);
      if (idx !== -1) {
        var after = text.slice(idx + trigger.length);
        var sentenceEnd = after.search(/[.!?]/);
        var snippet = sentenceEnd !== -1 ? after.slice(0, sentenceEnd) : after.slice(0, 90);
        snippet = snippet.trim();
        if (snippet) {
          return "Improve/achieve: " + snippet + (snippet.length >= 90 ? "…" : "");
        }
      }
    }
    return "No explicit outcome stated in the text — only inferred, if anything.";
  }

  function detectEvidence(text) {
    var hasDigit = /\d/.test(text);
    var hasPercent = text.indexOf("%") !== -1;
    var evidenceWordCount = countMatches(text, EVIDENCE_WORDS);
    var hedgeWords = ["believe me", "i think", "i guess", "probably", "i don't know", "trust me", "should work", "will work"];
    var hasHedge = containsAny(text, hedgeWords);

    if ((hasDigit || hasPercent) && evidenceWordCount > 0) {
      return {
        level: "found",
        summary: "Contains a number and a reference to customers/users/data — check whether this is a real, checkable data point or an estimate."
      };
    }
    if (evidenceWordCount > 0 && !hasHedge) {
      return {
        level: "partial",
        summary: "Mentions users, customers, or data in general terms, but no concrete number, source, or specific data point is given."
      };
    }
    if (hasHedge) {
      return {
        level: "none",
        summary: "No evidence provided — the language used (\"" + firstMatchingHedge(text, hedgeWords) + "\") signals an assumption stated as fact, not a checked claim."
      };
    }
    return {
      level: "none",
      summary: "No evidence provided — no numbers, customer references, or data sources found in the text."
    };
  }

  function firstMatchingHedge(text, hedgeWords) {
    var lower = toLower(text);
    for (var i = 0; i < hedgeWords.length; i++) {
      if (lower.indexOf(hedgeWords[i]) !== -1) return hedgeWords[i];
    }
    return "";
  }

  function detectMissing(text, evidenceResult, claimedOutcome) {
    var missing = [];
    if (!containsAny(text, SEGMENT_WORDS)) {
      missing.push("Which specific users or segment this affects.");
    }
    if (!containsAny(text, BASELINE_WORDS) && !/\d/.test(text)) {
      missing.push("What the current baseline behavior or metric is, before any change.");
    }
    if (claimedOutcome.indexOf("No explicit outcome") === 0) {
      missing.push("What would specifically count as success.");
    }
    missing.push("Why this solution specifically, rather than an alternative.");
    return missing.slice(0, 4);
  }

  function matchCategory(text) {
    for (var i = 0; i < CATEGORY_RULES.length; i++) {
      if (containsAny(text, CATEGORY_RULES[i].keywords)) return CATEGORY_RULES[i];
    }
    return DEFAULT_RULE;
  }

  function analyzeSync(rawText) {
    var text = (rawText || "").trim();
    if (!text) {
      return null;
    }
    var proposedSolution = extractProposedSolution(text);
    var claimedOutcome = extractClaimedOutcome(text);
    var evidenceResult = detectEvidence(text);
    var missing = detectMissing(text, evidenceResult, claimedOutcome);
    var category = matchCategory(text);
    var recommendation = evidenceResult.level === "found" ? category.testIfSomeEvidence : category.testIfNoEvidence;

    var suggestedReadiness = evidenceResult.level === "found" ? "delivery" : "discovery";

    return {
      rawIdeaText: text,
      proposedSolution: proposedSolution,
      claimedOutcome: claimedOutcome,
      evidenceGiven: evidenceResult.summary,
      evidenceLevel: evidenceResult.level,
      missing: missing,
      alternativeExplanation: category.alternative,
      recommendation: recommendation,
      suggestedReadiness: suggestedReadiness
    };
  }

  // Returns a Promise so callers don't need to change when a real API
  // eventually replaces the synchronous rule-based version internally.
  function analyze(rawText) {
    return new Promise(function (resolve) {
      resolve(analyzeSync(rawText));
    });
  }

  FDOS.evidenceGate = {
    analyze: analyze,
    _analyzeSync: analyzeSync // exposed for testing only
  };

})(window.FDOS = window.FDOS || {});
