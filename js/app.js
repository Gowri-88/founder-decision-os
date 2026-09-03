/* Founder Decision OS — app.js
   App initialization, hash router, rendering of all screens, modals,
   CRUD logic, and event delegation. Single global namespace: window.FDOS.
*/
(function (FDOS) {
  "use strict";

  var storage = FDOS.storage;
  var calc = FDOS.calc;
  var ui = FDOS.ui;
  var generators = FDOS.generators;
  var demoData = FDOS.demoData;
  var esc = ui.escapeHTML;

  var state = storage.loadState();
  var appRoot = null;

  // Transient UI state (not persisted)
  var betsView = { status: "all", search: "", sort: "signal" };
  var currentGateAnalysis = null;

  // ================= CORE HELPERS =================

  function persist() {
    storage.saveState(state);
  }

  function findBet(id) {
    for (var i = 0; i < state.bets.length; i++) {
      if (state.bets[i].id === id) return state.bets[i];
    }
    return null;
  }

  function findLog(id) {
    for (var i = 0; i < state.decisionLogs.length; i++) {
      if (state.decisionLogs[i].id === id) return state.decisionLogs[i];
    }
    return null;
  }

  function activeBets() {
    return state.bets.filter(function (b) { return b.status === "active"; });
  }

  function touch(bet) {
    bet.updatedAt = new Date().toISOString();
  }

  function nowISO() {
    return new Date().toISOString();
  }

  // ================= ROUTER =================

  function parseHash() {
    var hash = window.location.hash || "#dashboard";
    hash = hash.replace(/^#/, "");
    var segments = hash.split("/");
    var route = segments[0] || "dashboard";
    var param = segments[1] ? decodeURIComponent(segments[1]) : null;
    return { route: route, param: param };
  }

  function navigate(hash) {
    if (window.location.hash === hash) {
      render();
    } else {
      window.location.hash = hash;
    }
  }

  function onHashChange() {
    ui.closeMobileMenu();
    render();
    window.scrollTo(0, 0);
  }

  function render() {
    var parsed = parseHash();
    var route = parsed.route;
    var validRoutes = ["dashboard", "bets", "bet", "council", "logs", "how-it-works", "evidence-gate"];
    if (validRoutes.indexOf(route) === -1) route = "dashboard";

    ui.setActiveNav(route === "bet" ? "bets" : route);

    if (!appRoot) return;

    switch (route) {
      case "dashboard":
        appRoot.innerHTML = renderDashboard();
        break;
      case "bets":
        appRoot.innerHTML = renderBetsList();
        break;
      case "bet":
        appRoot.innerHTML = renderBetDetail(parsed.param);
        break;
      case "council":
        appRoot.innerHTML = renderCouncil();
        break;
      case "logs":
        appRoot.innerHTML = renderLogs();
        break;
      case "how-it-works":
        appRoot.innerHTML = renderHowItWorks();
        break;
      case "evidence-gate":
        appRoot.innerHTML = renderEvidenceGate();
        wireEvidenceGateEvents();
        break;
      default:
        appRoot.innerHTML = renderDashboard();
    }
  }

  function bottleneckClass(classification) {
    switch (classification) {
      case "Clear": return "clear";
      case "Watch": return "watch";
      case "At risk": return "at-risk";
      case "Bottlenecked": return "bottlenecked";
      default: return "clear";
    }
  }

  // ================= SHARED CARD RENDERERS =================

  function renderBetCard(bet) {
    var problemPreview = bet.problem && bet.problem.length > 110 ? bet.problem.slice(0, 110) + "…" : (bet.problem || "No problem statement yet.");
    var makeCurrentBtn = "";
    if (bet.status !== "active" && bet.status !== "done" && bet.status !== "killed") {
      makeCurrentBtn = '<button type="button" class="btn btn--ghost btn--small" data-action="make-current" data-id="' + esc(bet.id) + '">Make current</button>';
    }
    var parkBtn = "";
    if (bet.status !== "parked" && bet.status !== "done" && bet.status !== "killed") {
      parkBtn = '<button type="button" class="btn btn--ghost btn--small" data-action="open-park" data-id="' + esc(bet.id) + '">Park</button>';
    }
    return (
      '<article class="card bet-card">' +
        '<div class="bet-card__top">' +
          '<h3 class="bet-card__title">' + esc(bet.title || "Untitled bet") + "</h3>" +
          '<span class="bet-card__badges">' + ui.statusBadgeHTML(bet.status) + readinessBadgeHTML(bet.readiness) + "</span>" +
        "</div>" +
        '<p class="bet-card__problem">' + esc(problemPreview) + "</p>" +
        '<div class="bet-card__meta">' +
          '<span>Signal: <strong>' + bet.priorityScore + "</strong></span>" +
          '<span>' + esc(bet.owner || "Unassigned") + "</span>" +
          '<span>Review: ' + esc(calc.formatDate(bet.reviewDate)) + "</span>" +
        "</div>" +
        '<div class="bet-card__actions">' +
          '<button type="button" class="btn btn--ghost btn--small" data-action="view-bet" data-id="' + esc(bet.id) + '">View / Edit</button>' +
          makeCurrentBtn +
          parkBtn +
        "</div>" +
      "</article>"
    );
  }

  function renderCouncilCard(bet, section) {
    var actions = [];
    if (section === "current") {
      actions.push('<button type="button" class="btn btn--ghost btn--small" data-action="move-backlog" data-id="' + esc(bet.id) + '">Move to backlog</button>');
      actions.push('<button type="button" class="btn btn--ghost btn--small" data-action="open-park" data-id="' + esc(bet.id) + '">Park</button>');
    } else if (section === "backlog") {
      actions.push('<button type="button" class="btn btn--ghost btn--small" data-action="make-current" data-id="' + esc(bet.id) + '">Make current</button>');
      actions.push('<button type="button" class="btn btn--ghost btn--small" data-action="open-park" data-id="' + esc(bet.id) + '">Park</button>');
    } else if (section === "parked") {
      actions.push('<button type="button" class="btn btn--ghost btn--small" data-action="make-current" data-id="' + esc(bet.id) + '">Make current</button>');
      actions.push('<button type="button" class="btn btn--ghost btn--small" data-action="move-backlog" data-id="' + esc(bet.id) + '">Move to backlog</button>');
    }
    actions.push('<button type="button" class="btn btn--ghost btn--small" data-action="view-bet" data-id="' + esc(bet.id) + '">Open Bet Brief</button>');

    return (
      '<article class="card bet-card">' +
        '<div class="bet-card__top">' +
          '<h3 class="bet-card__title">' + esc(bet.title || "Untitled bet") + "</h3>" +
          '<span class="bet-card__badges">' + ui.statusBadgeHTML(bet.status) + readinessBadgeHTML(bet.readiness) + "</span>" +
        "</div>" +
        '<div class="bet-card__meta">' +
          '<span>Signal: <strong>' + bet.priorityScore + "</strong></span>" +
          '<span>' + esc(bet.owner || "Unassigned") + "</span>" +
          '<span>Review: ' + esc(calc.formatDate(bet.reviewDate)) + "</span>" +
        "</div>" +
        (section === "parked" && bet.parkedReason ? '<p class="muted small">Reason: ' + esc(bet.parkedReason) + "</p>" : "") +
        '<div class="bet-card__actions">' + actions.join("") + "</div>" +
      "</article>"
    );
  }

  // ================= DASHBOARD =================

  function renderDashboard() {
    var current = activeBets();
    var bottleneck = calc.calcBottleneckSignal(state.bets);
    var debt = calc.calcDecisionDebt(state.bets);

    var strongest = state.bets
      .filter(function (b) { return b.status !== "done" && b.status !== "killed"; })
      .slice()
      .sort(function (a, b) { return b.priorityScore - a.priorityScore; })
      .slice(0, 3);

    var welcomeHTML = "";
    if (!state.hasSeenWelcome) {
      welcomeHTML =
        '<div class="panel panel--welcome" role="region" aria-label="Welcome">' +
          '<p class="panel--welcome__text">Welcome to Founder Decision OS. Start with demo data to see the ritual, or add your first real bet.</p>' +
          '<div class="panel--welcome__actions">' +
            '<button type="button" class="btn btn--primary" data-action="load-demo">Try demo workspace</button>' +
            '<button type="button" class="btn btn--secondary" data-action="new-bet">Add my first bet</button>' +
            '<button type="button" class="btn btn--ghost" data-action="dismiss-welcome">Dismiss</button>' +
          "</div>" +
        "</div>";
    }

    var currentBetsHTML;
    if (current.length === 0) {
      currentBetsHTML = ui.emptyStateHTML({
        title: "No bets are current right now",
        message: "Choose up to two bets to focus on this cycle.",
        actionLabel: "Run Bet Council",
        actionAttr: 'data-action="goto-council"'
      });
    } else {
      currentBetsHTML = '<div class="bet-grid">' + current.map(renderBetCard).join("") + "</div>";
      if (current.length > 2) {
        currentBetsHTML =
          '<div class="alert alert--warning">More than two bets are marked current. Visit Bet Council to bring this back to two.</div>' +
          currentBetsHTML;
      }
    }

    var reasonsHTML = bottleneck.reasons.length
      ? '<ul class="reason-list">' + bottleneck.reasons.map(function (r) { return "<li>" + esc(r) + "</li>"; }).join("") + "</ul>"
      : '<p class="muted small">No specific focus-risk factors detected right now.</p>';

    var nextStepHref = "#council";
    var nextStepLabel = "Open Bet Council";
    if (bottleneck.score <= 20) {
      nextStepHref = "#bets";
      nextStepLabel = "Review bets";
    }

    var debtRows = [
      { label: "Overdue current bets", count: debt.overdueActive.length },
      { label: "Stale ideas (14+ days)", count: debt.staleIdeas.length },
      { label: "Current bets without a progress note", count: debt.activeNoProgress.length },
      { label: "Parked bets without a reason", count: debt.parkedNoReason.length }
    ];

    var strongestHTML;
    if (strongest.length === 0) {
      strongestHTML = ui.emptyStateHTML({
        title: "No bets yet",
        message: "Add a bet to see how it stacks up.",
        actionLabel: "Add a bet",
        actionAttr: 'data-action="new-bet"'
      });
    } else {
      strongestHTML =
        '<div class="signal-list">' +
        strongest.map(function (b) {
          return (
            '<div class="signal-row">' +
              '<div class="signal-row__main">' +
                '<span class="signal-row__title">' + esc(b.title || "Untitled bet") + "</span>" +
                ui.statusBadgeHTML(b.status) +
              "</div>" +
              '<div class="signal-row__meta">' +
                '<span>Signal: <strong>' + b.priorityScore + "</strong></span>" +
                '<span>' + esc(b.owner || "Unassigned") + "</span>" +
                '<span>Review: ' + esc(calc.formatDate(b.reviewDate)) + "</span>" +
              "</div>" +
              '<button type="button" class="btn btn--ghost btn--small" data-action="view-bet" data-id="' + esc(b.id) + '">View</button>' +
            "</div>"
          );
        }).join("") +
        "</div>";
    }

    return (
      '<header class="page-header">' +
        '<div>' +
          '<h1 class="page-title">Decision Health</h1>' +
          '<p class="page-subtitle">Make fewer, clearer bets each week.</p>' +
        "</div>" +
        '<div class="page-header__actions">' +
          '<button type="button" class="btn btn--secondary" data-action="goto-council">Run Bet Council</button>' +
          '<button type="button" class="btn btn--primary" data-action="new-bet">Add a bet</button>' +
        "</div>" +
      "</header>" +
      welcomeHTML +
      '<section class="section" aria-labelledby="current-bets-heading">' +
        '<div class="section__header">' +
          '<h2 id="current-bets-heading" class="section__title">Current bets</h2>' +
          '<span class="capacity-pill">' + current.length + " of 2 current bets</span>" +
        "</div>" +
        currentBetsHTML +
      "</section>" +
      '<section class="section dashboard-grid" aria-label="Signals">' +
        '<div class="panel">' +
          '<h2 class="panel__title">Bottleneck Signal</h2>' +
          '<div class="bottleneck-display">' +
            '<span class="bottleneck-display__score">' + bottleneck.score + " / 100</span>" +
            '<span class="badge badge--' + bottleneckClass(bottleneck.classification) + '">' + esc(bottleneck.classification) + "</span>" +
          "</div>" +
          '<div class="meter" role="img" aria-label="Bottleneck Signal ' + bottleneck.score + ' out of 100">' +
            '<div class="meter__fill" style="width:' + bottleneck.score + '%"></div>' +
          "</div>" +
          '<p class="muted small">A practical focus-risk heuristic, not a measure of performance.</p>' +
          reasonsHTML +
          '<a class="link-action" href="' + nextStepHref + '">' + nextStepLabel + " →</a>" +
        "</div>" +
        '<div class="panel">' +
          '<h2 class="panel__title">Decision Debt</h2>' +
          '<div class="debt-total">' + debt.total + '<span class="debt-total__label"> unresolved item' + (debt.total === 1 ? "" : "s") + "</span></div>" +
          '<ul class="debt-breakdown">' +
          debtRows.map(function (r) {
            return "<li><span>" + esc(r.label) + '</span><span class="debt-breakdown__count">' + r.count + "</span></li>";
          }).join("") +
          "</ul>" +
          '<button type="button" class="btn btn--secondary btn--full" data-action="goto-council">Resolve in Bet Council</button>' +
        "</div>" +
      "</section>" +
      '<section class="section" aria-labelledby="strongest-heading">' +
        '<h2 id="strongest-heading" class="section__title">Strongest Decision Signals</h2>' +
        strongestHTML +
      "</section>" +
      '<section class="section">' +
        '<div class="panel panel--prompt">' +
          '<p>What would you stop doing to make room for your two highest-conviction bets?</p>' +
        "</div>" +
      "</section>"
    );
  }

  // ================= BETS LIST =================

  function renderBetsList() {
    var filtered = state.bets.filter(function (b) {
      if (betsView.status !== "all" && b.status !== betsView.status) return false;
      if (betsView.search) {
        var q = betsView.search.toLowerCase();
        var hay = ((b.title || "") + " " + (b.problem || "")).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });

    filtered.sort(function (a, b) {
      if (betsView.sort === "signal") return b.priorityScore - a.priorityScore;
      if (betsView.sort === "review") {
        var da = calc.parseDate(a.reviewDate);
        var db = calc.parseDate(b.reviewDate);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da - db;
      }
      if (betsView.sort === "newest") {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      return 0;
    });

    var statusFilters = [
      { key: "all", label: "All" },
      { key: "idea", label: "Idea" },
      { key: "active", label: "Active" },
      { key: "parked", label: "Parked" },
      { key: "done", label: "Done" },
      { key: "killed", label: "Killed" }
    ];

    var filterButtons = statusFilters.map(function (f) {
      var active = f.key === betsView.status;
      return '<button type="button" class="chip' + (active ? " chip--active" : "") + '" data-action="filter-status" data-status="' + f.key + '" aria-pressed="' + active + '">' + esc(f.label) + "</button>";
    }).join("");

    var listHTML;
    if (filtered.length === 0) {
      listHTML = ui.emptyStateHTML({
        title: "No bets match this view",
        message: state.bets.length === 0 ? "Add your first bet to get started." : "Try a different filter or search term.",
        actionLabel: "Add Bet",
        actionAttr: 'data-action="new-bet"'
      });
    } else {
      listHTML = '<div class="bet-grid">' + filtered.map(renderBetCard).join("") + "</div>";
    }

    return (
      '<header class="page-header">' +
        '<div>' +
          '<h1 class="page-title">Bets</h1>' +
          '<p class="page-subtitle">Capture ideas before they become invisible commitments.</p>' +
        "</div>" +
        '<div class="page-header__actions">' +
          '<button type="button" class="btn btn--secondary" data-action="load-demo">Load demo workspace</button>' +
          '<button type="button" class="btn btn--primary" data-action="new-bet">Add Bet</button>' +
        "</div>" +
      "</header>" +
      '<div class="controls-bar">' +
        '<div class="chip-group" role="group" aria-label="Filter by status">' + filterButtons + "</div>" +
        '<div class="controls-bar__row">' +
          '<label class="visually-hidden" for="bet-search">Search bets</label>' +
          '<input type="search" id="bet-search" class="input" placeholder="Search title or problem…" value="' + esc(betsView.search) + '" data-action="search-bets">' +
          '<label class="visually-hidden" for="bet-sort">Sort bets</label>' +
          '<select id="bet-sort" class="input" data-action="sort-bets">' +
            '<option value="signal"' + (betsView.sort === "signal" ? " selected" : "") + '>Decision Signal (highest first)</option>' +
            '<option value="review"' + (betsView.sort === "review" ? " selected" : "") + '>Review Date (nearest first)</option>' +
            '<option value="newest"' + (betsView.sort === "newest" ? " selected" : "") + '>Newest</option>' +
          "</select>" +
        "</div>" +
      "</div>" +
      '<section class="section">' + listHTML + "</section>"
    );
  }

  // ================= BET DETAIL =================

  function scoreBreakdownHTML(bet) {
    var items = [
      { label: "Strategy Fit", value: bet.strategyFit },
      { label: "Upside", value: bet.upside },
      { label: "Cost", value: bet.cost },
      { label: "Risk", value: bet.risk },
      { label: "Evidence", value: bet.evidence },
      { label: "Reversibility", value: bet.reversibility }
    ];
    return (
      '<div class="score-grid">' +
      items.map(function (i) {
        return '<div class="score-item"><span class="score-item__label">' + esc(i.label) + '</span><span class="score-item__value">' + i.value + " / 5</span></div>";
      }).join("") +
      "</div>"
    );
  }

  function renderBetDetail(id) {
    var bet = findBet(id);
    if (!bet) {
      return (
        '<a class="back-link" href="#bets">← Back to Bets</a>' +
        '<section class="section">' +
          ui.emptyStateHTML({
            title: "Bet not found",
            message: "This bet may have been deleted.",
            actionLabel: "Back to Bets",
            actionAttr: 'data-action="goto-bets"'
          }) +
        "</section>"
      );
    }

    var actionButtons = [];
    actionButtons.push('<button type="button" class="btn btn--secondary" data-action="edit-bet" data-id="' + esc(bet.id) + '">Edit bet</button>');
    if (bet.status !== "active" && bet.status !== "done" && bet.status !== "killed") {
      actionButtons.push('<button type="button" class="btn btn--ghost" data-action="make-current" data-id="' + esc(bet.id) + '">Make current</button>');
    }
    if (bet.status !== "parked" && bet.status !== "done" && bet.status !== "killed") {
      actionButtons.push('<button type="button" class="btn btn--ghost" data-action="open-park" data-id="' + esc(bet.id) + '">Park</button>');
    }
    if (bet.status !== "done" && bet.status !== "killed") {
      actionButtons.push('<button type="button" class="btn btn--ghost" data-action="mark-done" data-id="' + esc(bet.id) + '">Mark done</button>');
      actionButtons.push('<button type="button" class="btn btn--ghost" data-action="mark-killed" data-id="' + esc(bet.id) + '">Mark killed</button>');
    }
    actionButtons.push('<button type="button" class="btn btn--danger" data-action="delete-bet" data-id="' + esc(bet.id) + '">Delete</button>');

    var parkedReasonHTML = bet.status === "parked"
      ? '<div class="detail-row"><span class="detail-row__label">Parked reason</span><span class="detail-row__value">' + esc(bet.parkedReason || "No reason recorded.") + "</span></div>"
      : "";

    var brief = generators.generateBetBrief(bet);

    return (
      '<a class="back-link" href="#bets">← Back to Bets</a>' +
      '<header class="page-header">' +
        '<div>' +
          '<h1 class="page-title">' + esc(bet.title || "Untitled bet") + "</h1>" +
          '<div class="page-header__badges">' + ui.statusBadgeHTML(bet.status) + readinessBadgeHTML(bet.readiness) + "</div>" +
        "</div>" +
      "</header>" +
      '<div class="action-row">' + actionButtons.join("") + "</div>" +
      '<section class="section dashboard-grid">' +
        '<div class="panel">' +
          '<h2 class="panel__title">Decision Signal</h2>' +
          '<div class="bottleneck-display"><span class="bottleneck-display__score">' + bet.priorityScore + "</span></div>" +
          '<p class="muted small">Scores start the conversation. They do not replace judgment.</p>' +
          scoreBreakdownHTML(bet) +
        "</div>" +
        '<div class="panel">' +
          '<h2 class="panel__title">Bet details</h2>' +
          '<div class="detail-grid">' +
            '<div class="detail-row"><span class="detail-row__label">Problem</span><span class="detail-row__value">' + esc(bet.problem || "Not specified.") + "</span></div>" +
            '<div class="detail-row"><span class="detail-row__label">Hypothesis</span><span class="detail-row__value">' + esc(bet.hypothesis || "Not specified.") + "</span></div>" +
            '<div class="detail-row"><span class="detail-row__label">Success metric</span><span class="detail-row__value">' + esc(bet.successMetric || "Not specified.") + "</span></div>" +
            '<div class="detail-row"><span class="detail-row__label">Owner</span><span class="detail-row__value">' + esc(bet.owner || "Unassigned") + "</span></div>" +
            '<div class="detail-row"><span class="detail-row__label">Review date</span><span class="detail-row__value">' + esc(calc.formatDate(bet.reviewDate)) + "</span></div>" +
            '<div class="detail-row"><span class="detail-row__label">Progress note</span><span class="detail-row__value">' + esc(bet.progressNote || "No progress note yet.") + "</span></div>" +
            parkedReasonHTML +
          "</div>" +
        "</div>" +
      "</section>" +
      '<section class="section">' +
        '<div class="panel">' +
          '<div class="panel__header-row">' +
            '<h2 class="panel__title">Bet Brief</h2>' +
            '<button type="button" class="btn btn--secondary btn--small" data-action="copy-brief" data-id="' + esc(bet.id) + '">Copy Bet Brief</button>' +
          "</div>" +
          '<pre class="brief-pre">' + esc(brief) + "</pre>" +
        "</div>" +
      "</section>" +
      evidenceAuditPanelHTML(bet)
    );
  }

  function readinessBadgeHTML(readiness) {
    if (readiness === "discovery") return ' <span class="badge badge--watch">Discovery</span>';
    if (readiness === "delivery") return ' <span class="badge badge--clear">Delivery</span>';
    return "";
  }

  function evidenceAuditPanelHTML(bet) {
    if (!bet.evidenceAudit) return "";
    var a = bet.evidenceAudit;
    var missingHTML = a.missing && a.missing.length
      ? '<ul class="reason-list">' + a.missing.map(function (m) { return "<li>" + esc(m) + "</li>"; }).join("") + "</ul>"
      : '<p class="muted small">Nothing flagged as missing.</p>';

    return (
      '<section class="section">' +
        '<div class="panel">' +
          '<h2 class="panel__title">Evidence Gate audit</h2>' +
          '<p class="muted small">Generated from a rule-based read of the original pasted text, then reviewed and edited by a human before saving. This does not verify truth \u2014 it flags what was stated versus assumed.</p>' +
          '<div class="detail-grid">' +
            '<div class="detail-row"><span class="detail-row__label">Claimed outcome</span><span class="detail-row__value">' + esc(a.claimedOutcome || "Not specified.") + "</span></div>" +
            '<div class="detail-row"><span class="detail-row__label">Evidence given</span><span class="detail-row__value">' + esc(a.evidenceGiven || "Not specified.") + "</span></div>" +
            '<div class="detail-row"><span class="detail-row__label">Missing</span><span class="detail-row__value">' + missingHTML + "</span></div>" +
            '<div class="detail-row"><span class="detail-row__label">Alternative explanation</span><span class="detail-row__value">' + esc(a.alternativeExplanation || "Not specified.") + "</span></div>" +
            '<div class="detail-row"><span class="detail-row__label">Recommended next test</span><span class="detail-row__value">' + esc(a.recommendation || "Not specified.") + "</span></div>" +
          "</div>" +
          (bet.rawIdeaText ? '<p class="muted small" style="margin-top:0.9rem;">Original pasted text: \u201c' + esc(bet.rawIdeaText) + '\u201d</p>' : "") +
        "</div>" +
      "</section>"
    );
  }

  // ================= BET COUNCIL =================

  function renderCouncil() {
    var current = state.bets.filter(function (b) { return b.status === "active"; });
    var backlog = state.bets.filter(function (b) { return b.status === "idea"; });
    var parked = state.bets.filter(function (b) { return b.status === "parked"; });

    var capacityText;
    if (current.length >= 2) {
      capacityText = "Your focus capacity is full.";
    } else {
      var remaining = 2 - current.length;
      capacityText = "You have " + remaining + " focus slot" + (remaining === 1 ? "" : "s") + " remaining.";
    }

    function columnHTML(title, bets, section, emptyMsg) {
      var body = bets.length === 0
        ? '<p class="muted small">' + esc(emptyMsg) + "</p>"
        : '<div class="council-column__list">' + bets.map(function (b) { return renderCouncilCard(b, section); }).join("") + "</div>";
      return (
        '<div class="council-column">' +
          '<div class="council-column__header"><h3>' + esc(title) + '</h3><span class="council-column__count">' + bets.length + "</span></div>" +
          body +
        "</div>"
      );
    }

    return (
      '<header class="page-header">' +
        '<div>' +
          '<h1 class="page-title">Bet Council</h1>' +
          '<p class="page-subtitle">Protect focus by choosing only the bets you can truly support right now.</p>' +
        "</div>" +
      "</header>" +
      '<div class="capacity-banner">' +
        '<span class="capacity-pill capacity-pill--large">' + current.length + " of 2 current bets</span>" +
        "<p>" + esc(capacityText) + "</p>" +
      "</div>" +
      '<section class="section council-columns">' +
        columnHTML("Current bets", current, "current", "No bets are current. Promote one from the backlog below.") +
        columnHTML("Backlog / ideas", backlog, "backlog", "No ideas waiting in the backlog.") +
        columnHTML("Parked", parked, "parked", "Nothing parked right now.") +
      "</section>" +
      '<section class="section">' +
        '<div class="panel">' +
          '<h2 class="panel__title">Council checklist</h2>' +
          '<ol class="checklist">' +
            "<li>What must be true for this bet to matter?</li>" +
            "<li>What evidence do we have?</li>" +
            "<li>What would we stop doing to make room?</li>" +
            "<li>What is the smallest test we can run?</li>" +
          "</ol>" +
          '<p class="muted small">Decision Signal is a discussion aid, not an automatic ranking.</p>' +
          '<button type="button" class="btn btn--primary" data-action="save-weekly-log">Save this week\u2019s decision log</button>' +
        "</div>" +
      "</section>"
    );
  }

  // ================= DECISION LOGS =================

  function renderLogs() {
    var logs = state.decisionLogs.slice().sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    var listHTML;
    if (logs.length === 0) {
      listHTML = ui.emptyStateHTML({
        title: "No decision logs yet",
        message: "Decision logs reduce repeated debates by giving the team a shared record of what was decided and why.",
        actionLabel: "Create this week\u2019s decision log",
        actionAttr: 'data-action="create-log"'
      });
    } else {
      listHTML = '<div class="log-list">' + logs.map(function (log) {
        var preview = log.content.length > 220 ? log.content.slice(0, 220) + "…" : log.content;
        var weekRange = esc(log.weekStart) + " to " + esc(log.weekEnd);
        return (
          '<article class="card log-card">' +
            '<div class="log-card__top">' +
              '<h3>' + weekRange + "</h3>" +
              '<span class="muted small">Created ' + esc(calc.formatDate(log.createdAt.slice(0, 10))) + "</span>" +
            "</div>" +
            '<pre class="log-card__preview">' + esc(preview) + "</pre>" +
            '<div class="bet-card__actions">' +
              '<button type="button" class="btn btn--ghost btn--small" data-action="edit-log" data-id="' + esc(log.id) + '">View / Edit</button>' +
              '<button type="button" class="btn btn--ghost btn--small" data-action="copy-log" data-id="' + esc(log.id) + '">Copy</button>' +
              '<button type="button" class="btn btn--ghost btn--small" data-action="delete-log" data-id="' + esc(log.id) + '">Delete</button>' +
            "</div>" +
          "</article>"
        );
      }).join("") + "</div>";
    }

    return (
      '<header class="page-header">' +
        '<div>' +
          '<h1 class="page-title">Decision Logs</h1>' +
          '<p class="page-subtitle">Keep a record of decisions so the team does not re-litigate them.</p>' +
        "</div>" +
        '<div class="page-header__actions">' +
          '<button type="button" class="btn btn--primary" data-action="create-log">Create this week\u2019s decision log</button>' +
        "</div>" +
      "</header>" +
      '<section class="section">' + listHTML + "</section>"
    );
  }

  // ================= HOW IT WORKS =================

  function renderHowItWorks() {
    return (
      '<header class="page-header">' +
        '<div>' +
          '<h1 class="page-title">How Founder Decision OS works</h1>' +
        "</div>" +
      "</header>" +
      '<section class="section how-it-works">' +
        '<div class="panel">' +
          '<h2 class="panel__title">What a Bet is</h2>' +
          '<p>A Bet is a bounded product investment — a problem, a hypothesis, a success metric, an owner, and a review date. It is more than an idea: naming it as a bet forces a decision, whereas an idea can drift indefinitely without one.</p>' +
        "</div>" +
        '<div class="panel">' +
          '<h2 class="panel__title">Why two current bets</h2>' +
          '<p>A small startup usually cannot execute well on more than two truly current product bets at once. Limiting current work to two forces conscious trade-offs instead of letting the roadmap silently expand into a wishlist.</p>' +
        "</div>" +
        '<div class="panel">' +
          '<h2 class="panel__title">Decision Signal</h2>' +
          '<p>Decision Signal = Strategy Fit + Upside + Evidence + Reversibility − Cost − Risk, using six factors you score from 0–5. Scores start the conversation. They do not replace judgment, and Decision Signal starts a conversation; it does not decide.</p>' +
        "</div>" +
        '<div class="panel">' +
          '<h2 class="panel__title">Bottleneck Signal</h2>' +
          '<p>Bottleneck Signal is a practical heuristic, not a diagnosis. It looks at overdue reviews, stale ideas, unresolved items, and excessive active work to flag focus risk — it is not scientifically validated and does not measure performance.</p>' +
        "</div>" +
        '<div class="panel">' +
          '<h2 class="panel__title">Decision Debt</h2>' +
          '<p>Decision Debt is visible unresolved work: overdue current bets, stale ideas, current bets lacking progress, or parked bets lacking a reason. Keeping decisions from silently becoming commitments starts with seeing this debt clearly.</p>' +
        "</div>" +
        '<div class="panel">' +
          '<h2 class="panel__title">The weekly ritual</h2>' +
          '<ol class="checklist">' +
            "<li>Capture ideas.</li>" +
            "<li>Review evidence and trade-offs.</li>" +
            "<li>Make no more than two bets current.</li>" +
            "<li>Park the rest with a reason.</li>" +
            "<li>Save a decision log.</li>" +
            "<li>Review progress and trade-offs next time.</li>" +
          "</ol>" +
          '<p class="muted small">Use this as a discussion tool, not an automatic answer.</p>' +
        "</div>" +
      "</section>" +
      '<section class="section">' +
        '<div class="panel panel--prompt">' +
          '<p>Ready to make the trade-offs visible?</p>' +
          '<button type="button" class="btn btn--primary" data-action="goto-council">Run your Bet Council</button>' +
        "</div>" +
      "</section>"
    );
  }

  // ================= EVIDENCE GATE =================

  function renderEvidenceGate() {
    var textValue = currentGateAnalysis ? esc(currentGateAnalysis.rawIdeaText) : "";
    var analysisHTML = "";

    if (currentGateAnalysis) {
      var a = currentGateAnalysis;
      var readinessLabel = a.suggestedReadiness === "delivery"
        ? "Numbers/customer language found — verify before treating as evidence"
        : "Little or no evidence detected — starts as a discovery question";
      var readinessBadgeClass = a.suggestedReadiness === "delivery" ? "watch" : "idea";

      analysisHTML =
        '<section class="section">' +
          '<div class="panel">' +
            '<div class="panel__header-row">' +
              '<h2 class="panel__title">Evidence Gate analysis</h2>' +
              '<span class="badge badge--' + readinessBadgeClass + '">' + esc(readinessLabel) + "</span>" +
            "</div>" +
            '<p class="muted small">This is a rule-based read of what you pasted, not a verified fact-check or a live AI model in this version. Edit anything below before saving — you decide what\u2019s actually true, the tool only flags what\u2019s unstated.</p>' +
            '<div class="field">' +
              '<label class="field-label" for="gate-solution">Proposed solution</label>' +
              '<input type="text" id="gate-solution" class="input" value="' + esc(a.proposedSolution) + '">' +
            "</div>" +
            '<div class="field">' +
              '<label class="field-label" for="gate-outcome">Claimed outcome</label>' +
              '<textarea id="gate-outcome" class="input textarea" rows="2">' + esc(a.claimedOutcome) + "</textarea>" +
            "</div>" +
            '<div class="field">' +
              '<label class="field-label" for="gate-evidence">Evidence given</label>' +
              '<textarea id="gate-evidence" class="input textarea" rows="2">' + esc(a.evidenceGiven) + "</textarea>" +
            "</div>" +
            '<div class="field">' +
              '<label class="field-label" for="gate-missing">Missing <span class="muted small">(one per line)</span></label>' +
              '<textarea id="gate-missing" class="input textarea" rows="3">' + esc(a.missing.join("\n")) + "</textarea>" +
            "</div>" +
            '<div class="field">' +
              '<label class="field-label" for="gate-alternative">Alternative explanation</label>' +
              '<textarea id="gate-alternative" class="input textarea" rows="2">' + esc(a.alternativeExplanation) + "</textarea>" +
            "</div>" +
            '<div class="field">' +
              '<label class="field-label" for="gate-recommendation">Recommended next test</label>' +
              '<textarea id="gate-recommendation" class="input textarea" rows="2">' + esc(a.recommendation) + "</textarea>" +
            "</div>" +
            '<div class="action-row">' +
              '<button type="button" class="btn btn--secondary" id="gate-save-discovery">Save as Discovery Bet</button>' +
              '<button type="button" class="btn btn--primary" id="gate-save-delivery">Save as Delivery Bet</button>' +
              '<button type="button" class="btn btn--ghost" id="gate-discard">Discard</button>' +
            "</div>" +
          "</div>" +
        "</section>";
    }

    return (
      '<header class="page-header">' +
        '<div>' +
          '<h1 class="page-title">Evidence Gate</h1>' +
          '<p class="page-subtitle">Catch unsupported assumptions before they become roadmap commitments.</p>' +
        "</div>" +
      "</header>" +
      '<section class="section">' +
        '<div class="panel">' +
          '<div class="field">' +
            '<label class="field-label" for="gate-input">Paste an idea, feature request, or customer comment</label>' +
            '<textarea id="gate-input" class="input textarea textarea--large" rows="5" placeholder="e.g. Add a streak feature. It will make users addicted and improve retention.">' + textValue + "</textarea>" +
          "</div>" +
          '<button type="button" class="btn btn--primary" id="gate-analyze-btn">Analyze</button>' +
          '<p class="muted small gate-disclaimer">This reads your text for evidence, gaps, and stated-vs-assumed claims using a rule-based check — not a live AI model in this version. It cannot verify whether evidence is true; it flags what\u2019s missing so a human can check it.</p>' +
        "</div>" +
      "</section>" +
      analysisHTML
    );
  }

  function wireEvidenceGateEvents() {
    var analyzeBtn = document.getElementById("gate-analyze-btn");
    if (analyzeBtn) {
      analyzeBtn.addEventListener("click", function () {
        var textEl = document.getElementById("gate-input");
        var text = textEl ? textEl.value : "";
        if (!text.trim()) {
          ui.showToast("Paste an idea first.");
          return;
        }
        FDOS.evidenceGate.analyze(text).then(function (result) {
          currentGateAnalysis = result;
          render();
        });
      });
    }

    var discoveryBtn = document.getElementById("gate-save-discovery");
    if (discoveryBtn) {
      discoveryBtn.addEventListener("click", function () { saveFromEvidenceGate("discovery"); });
    }

    var deliveryBtn = document.getElementById("gate-save-delivery");
    if (deliveryBtn) {
      deliveryBtn.addEventListener("click", function () { saveFromEvidenceGate("delivery"); });
    }

    var discardBtn = document.getElementById("gate-discard");
    if (discardBtn) {
      discardBtn.addEventListener("click", function () {
        currentGateAnalysis = null;
        render();
      });
    }
  }

  function saveFromEvidenceGate(readiness) {
    if (!currentGateAnalysis) return;

    var solution = (document.getElementById("gate-solution") || {}).value || currentGateAnalysis.proposedSolution;
    var outcome = (document.getElementById("gate-outcome") || {}).value || "";
    var evidenceGiven = (document.getElementById("gate-evidence") || {}).value || "";
    var missingRaw = (document.getElementById("gate-missing") || {}).value || "";
    var alternative = (document.getElementById("gate-alternative") || {}).value || "";
    var recommendation = (document.getElementById("gate-recommendation") || {}).value || "";
    var missingList = missingRaw.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);

    pendingEvidenceGateData = {
      rawIdeaText: currentGateAnalysis.rawIdeaText,
      readiness: readiness,
      evidenceAudit: {
        proposedSolution: solution,
        claimedOutcome: outcome,
        evidenceGiven: evidenceGiven,
        missing: missingList,
        alternativeExplanation: alternative,
        recommendation: recommendation
      }
    };

    openBetFormModal(null, {
      title: solution,
      problem: currentGateAnalysis.rawIdeaText,
      hypothesis: outcome,
      successMetric: "",
      owner: "",
      reviewDate: "",
      progressNote: ""
    });
  }

  // ================= BET FORM MODAL =================

  var SCORE_FIELDS = [
    { key: "strategyFit", label: "Strategy Fit", hint: "How aligned is this with the current company goal?" },
    { key: "upside", label: "Upside", hint: "If successful, how meaningful is the impact?" },
    { key: "cost", label: "Cost", hint: "How expensive is it in time, people, or money?" },
    { key: "risk", label: "Risk", hint: "How likely is it to fail or create downside?" },
    { key: "evidence", label: "Evidence", hint: "How much customer or data evidence exists?" },
    { key: "reversibility", label: "Reversibility", hint: "How easy is it to undo if we are wrong?" }
  ];

  var pendingEvidenceGateData = null; // { rawIdeaText, evidenceAudit, readiness } stashed before opening a prefilled bet form

  function betFormFieldsHTML(bet) {
    function val(key) { return bet && bet[key] !== undefined && bet[key] !== null ? bet[key] : ""; }
    function scoreVal(key) { return bet && typeof bet[key] === "number" ? bet[key] : 0; }

    return (
      '<div class="field">' +
        '<label class="field-label" for="f-title">Title</label>' +
        '<input type="text" id="f-title" class="input" value="' + esc(val("title")) + '" required>' +
        '<span class="field-error" id="err-title"></span>' +
      "</div>" +
      '<div class="field">' +
        '<label class="field-label" for="f-problem">Problem</label>' +
        '<textarea id="f-problem" class="input textarea" rows="2" required>' + esc(val("problem")) + "</textarea>" +
        '<span class="field-error" id="err-problem"></span>' +
      "</div>" +
      '<div class="field">' +
        '<label class="field-label" for="f-hypothesis">Hypothesis</label>' +
        '<textarea id="f-hypothesis" class="input textarea" rows="2" required>' + esc(val("hypothesis")) + "</textarea>" +
        '<span class="field-error" id="err-hypothesis"></span>' +
      "</div>" +
      '<div class="field">' +
        '<label class="field-label" for="f-successMetric">Success metric</label>' +
        '<input type="text" id="f-successMetric" class="input" value="' + esc(val("successMetric")) + '" required>' +
        '<span class="field-error" id="err-successMetric"></span>' +
      "</div>" +
      '<div class="field-row">' +
        '<div class="field">' +
          '<label class="field-label" for="f-owner">Owner</label>' +
          '<input type="text" id="f-owner" class="input" value="' + esc(val("owner")) + '" required>' +
          '<span class="field-error" id="err-owner"></span>' +
        "</div>" +
        '<div class="field">' +
          '<label class="field-label" for="f-reviewDate">Review date</label>' +
          '<input type="date" id="f-reviewDate" class="input" value="' + esc(val("reviewDate")) + '" required>' +
          '<span class="field-error" id="err-reviewDate"></span>' +
        "</div>" +
      "</div>" +
      '<div class="field">' +
        '<label class="field-label" for="f-progressNote">Progress note <span class="muted small">(optional)</span></label>' +
        '<textarea id="f-progressNote" class="input textarea" rows="2">' + esc(val("progressNote")) + "</textarea>" +
      "</div>" +
      '<div class="score-section">' +
        '<h3 class="score-section__title">Decision Signal factors <span class="muted small">(optional, 0\u20135)</span></h3>' +
        '<p class="muted small">Scores start the conversation. They do not replace judgment.</p>' +
        '<div class="score-fields">' +
        SCORE_FIELDS.map(function (f) {
          return (
            '<div class="field score-field">' +
              '<label class="field-label" for="f-' + f.key + '">' + esc(f.label) + "</label>" +
              '<input type="number" min="0" max="5" step="1" id="f-' + f.key + '" class="input input--score" value="' + scoreVal(f.key) + '" data-score-input>' +
              '<span class="field-hint">' + esc(f.hint) + "</span>" +
            "</div>"
          );
        }).join("") +
        "</div>" +
        '<p class="live-signal">Decision Signal preview: <strong id="live-signal-value">' + (bet ? bet.priorityScore : 0) + "</strong></p>" +
      "</div>"
    );
  }

  function collectScoreObjectFromForm(dialog) {
    var obj = {};
    SCORE_FIELDS.forEach(function (f) {
      var input = dialog.querySelector("#f-" + f.key);
      var n = input ? parseInt(input.value, 10) : 0;
      if (isNaN(n)) n = 0;
      if (n < 0) n = 0;
      if (n > 5) n = 5;
      obj[f.key] = n;
    });
    return obj;
  }

  function wireLiveSignal(dialog) {
    var liveEl = dialog.querySelector("#live-signal-value");
    function update() {
      var scores = collectScoreObjectFromForm(dialog);
      var signal = calc.calcDecisionSignal(scores);
      if (liveEl) liveEl.textContent = signal;
    }
    SCORE_FIELDS.forEach(function (f) {
      var input = dialog.querySelector("#f-" + f.key);
      if (input) input.addEventListener("input", update);
    });
    update();
  }

  function setFieldError(dialog, key, message) {
    var errEl = dialog.querySelector("#err-" + key);
    var inputEl = dialog.querySelector("#f-" + key);
    if (errEl) errEl.textContent = message || "";
    if (inputEl) inputEl.classList.toggle("input--invalid", !!message);
  }

  function openBetFormModal(bet, prefill) {
    var isEdit = !!bet;
    var displayValues = bet || prefill || null;
    var title = isEdit ? "Edit bet" : "Add a bet";

    var html =
      '<div class="modal-header"><h2 id="bet-form-title" class="modal-title">' + esc(title) + "</h2></div>" +
      '<div class="modal-body">' +
        '<form id="bet-form" novalidate>' +
          betFormFieldsHTML(displayValues) +
        "</form>" +
      "</div>" +
      '<div class="modal-footer">' +
        '<button type="button" class="btn btn--ghost" data-action="modal-cancel">Cancel</button>' +
        '<button type="submit" form="bet-form" class="btn btn--primary">Save bet</button>' +
      "</div>";

    ui.openModal({
      html: html,
      labelId: "bet-form-title",
      initialFocusSelector: "#f-title",
      onMount: function (dialog) {
        wireLiveSignal(dialog);
        dialog.querySelector('[data-action="modal-cancel"]').addEventListener("click", function () {
          pendingEvidenceGateData = null;
          ui.closeModal();
        });
        dialog.querySelector("#bet-form").addEventListener("submit", function (e) {
          e.preventDefault();
          submitBetForm(dialog, bet);
        });
      }
    });
  }

  function submitBetForm(dialog, existingBet) {
    var fields = ["title", "problem", "hypothesis", "successMetric", "owner", "reviewDate"];
    var values = {};
    var firstInvalid = null;

    fields.forEach(function (key) {
      var input = dialog.querySelector("#f-" + key);
      var v = input ? input.value.trim() : "";
      values[key] = v;
      if (!v) {
        setFieldError(dialog, key, "This field is required.");
        if (!firstInvalid) firstInvalid = input;
      } else {
        setFieldError(dialog, key, "");
      }
    });

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    values.progressNote = (dialog.querySelector("#f-progressNote") || {}).value || "";
    var scores = collectScoreObjectFromForm(dialog);

    var now = nowISO();

    if (existingBet) {
      existingBet.title = values.title;
      existingBet.problem = values.problem;
      existingBet.hypothesis = values.hypothesis;
      existingBet.successMetric = values.successMetric;
      existingBet.owner = values.owner;
      existingBet.reviewDate = values.reviewDate;
      existingBet.progressNote = values.progressNote;
      existingBet.strategyFit = scores.strategyFit;
      existingBet.upside = scores.upside;
      existingBet.cost = scores.cost;
      existingBet.risk = scores.risk;
      existingBet.evidence = scores.evidence;
      existingBet.reversibility = scores.reversibility;
      existingBet.priorityScore = calc.calcDecisionSignal(existingBet);
      touch(existingBet);
      persist();
      ui.closeModal();
      render();
      ui.showToast("Bet updated.");
    } else {
      var newBet = {
        id: storage.createId(),
        title: values.title,
        problem: values.problem,
        hypothesis: values.hypothesis,
        successMetric: values.successMetric,
        owner: values.owner,
        reviewDate: values.reviewDate,
        status: "idea",
        strategyFit: scores.strategyFit,
        upside: scores.upside,
        cost: scores.cost,
        risk: scores.risk,
        evidence: scores.evidence,
        reversibility: scores.reversibility,
        priorityScore: 0,
        parkedReason: "",
        progressNote: values.progressNote,
        createdAt: now,
        updatedAt: now,
        activatedAt: null,
        lastReviewedAt: null,
        readiness: null,
        rawIdeaText: "",
        evidenceAudit: null
      };
      if (pendingEvidenceGateData) {
        newBet.readiness = pendingEvidenceGateData.readiness || null;
        newBet.rawIdeaText = pendingEvidenceGateData.rawIdeaText || "";
        newBet.evidenceAudit = pendingEvidenceGateData.evidenceAudit || null;
        pendingEvidenceGateData = null;
      }
      newBet.priorityScore = calc.calcDecisionSignal(newBet);
      state.bets.push(newBet);
      persist();
      ui.closeModal();
      navigate("#bet/" + newBet.id);
      ui.showToast(newBet.readiness ? "Bet added from Evidence Gate." : "Bet added.");
    }
  }

  // ================= PARK MODAL =================

  var PARK_REASONS = ["Not now", "Insufficient evidence", "Too costly", "Lower strategic fit", "Revisit after a future date", "Other"];

  function openParkModal(id) {
    var bet = findBet(id);
    if (!bet) return;

    var optionsHTML = PARK_REASONS.map(function (reason, idx) {
      var inputId = "park-reason-" + idx;
      return (
        '<label class="radio-option" for="' + inputId + '">' +
          '<input type="radio" name="park-reason" id="' + inputId + '" value="' + esc(reason) + '"' + (idx === 0 ? " checked" : "") + ">" +
          '<span>' + esc(reason) + "</span>" +
        "</label>"
      );
    }).join("");

    var html =
      '<div class="modal-header"><h2 id="park-title" class="modal-title">Park \u201c' + esc(bet.title || "this bet") + '\u201d</h2></div>' +
      '<div class="modal-body">' +
        '<p class="muted small">Parking is a conscious decision not to pursue this bet now. Choose a reason.</p>' +
        '<div class="radio-group" role="radiogroup" aria-label="Parking reason">' + optionsHTML + "</div>" +
        '<div class="field" id="park-custom-wrap" hidden>' +
          '<label class="field-label" for="park-custom-reason">Custom reason</label>' +
          '<textarea id="park-custom-reason" class="input textarea" rows="2"></textarea>' +
          '<span class="field-error" id="err-park-custom"></span>' +
        "</div>" +
      "</div>" +
      '<div class="modal-footer">' +
        '<button type="button" class="btn btn--ghost" data-action="modal-cancel">Cancel</button>' +
        '<button type="button" class="btn btn--primary" id="park-save-btn">Park bet</button>' +
      "</div>";

    ui.openModal({
      html: html,
      labelId: "park-title",
      onMount: function (dialog) {
        var customWrap = dialog.querySelector("#park-custom-wrap");
        var radios = dialog.querySelectorAll('input[name="park-reason"]');
        function syncCustom() {
          var checked = dialog.querySelector('input[name="park-reason"]:checked');
          var isOther = checked && checked.value === "Other";
          customWrap.hidden = !isOther;
        }
        radios.forEach(function (r) { r.addEventListener("change", syncCustom); });
        syncCustom();

        dialog.querySelector('[data-action="modal-cancel"]').addEventListener("click", ui.closeModal);
        dialog.querySelector("#park-save-btn").addEventListener("click", function () {
          var checked = dialog.querySelector('input[name="park-reason"]:checked');
          var reason = checked ? checked.value : "Not now";
          if (reason === "Other") {
            var customEl = dialog.querySelector("#park-custom-reason");
            var customVal = customEl.value.trim();
            if (!customVal) {
              dialog.querySelector("#err-park-custom").textContent = "Please describe the reason.";
              customEl.focus();
              return;
            }
            reason = customVal;
          }
          bet.status = "parked";
          bet.parkedReason = reason;
          bet.lastReviewedAt = nowISO();
          touch(bet);
          persist();
          ui.closeModal();
          render();
          ui.showToast('"' + (bet.title || "Bet") + '" parked.');
        });
      }
    });
  }

  // ================= DECISION LOG MODAL =================

  function openLogModal(log) {
    var isEdit = !!log;
    var weekStart, weekEnd, content;

    if (isEdit) {
      weekStart = log.weekStart;
      weekEnd = log.weekEnd;
      content = log.content;
    } else {
      var range = calc.getCurrentWeekRange(new Date());
      weekStart = calc.toISODateOnly(range.monday);
      weekEnd = calc.toISODateOnly(range.sunday);
      content = generators.generateDecisionLogContent(state, range.monday, range.sunday);
    }

    var html =
      '<div class="modal-header"><h2 id="log-title" class="modal-title">' + (isEdit ? "Edit decision log" : "This week\u2019s decision log") + "</h2></div>" +
      '<div class="modal-body">' +
        '<div class="field-row">' +
          '<div class="field">' +
            '<label class="field-label" for="log-week-start">Week start</label>' +
            '<input type="date" id="log-week-start" class="input" value="' + esc(weekStart) + '">' +
          "</div>" +
          '<div class="field">' +
            '<label class="field-label" for="log-week-end">Week end</label>' +
            '<input type="date" id="log-week-end" class="input" value="' + esc(weekEnd) + '">' +
          "</div>" +
        "</div>" +
        '<div class="field">' +
          '<label class="field-label" for="log-content">Log content</label>' +
          '<textarea id="log-content" class="input textarea textarea--large" rows="14">' + esc(content) + "</textarea>" +
        "</div>" +
      "</div>" +
      '<div class="modal-footer">' +
        '<button type="button" class="btn btn--ghost" data-action="modal-cancel">Cancel</button>' +
        '<button type="button" class="btn btn--primary" id="log-save-btn">Save decision log</button>' +
      "</div>";

    ui.openModal({
      html: html,
      labelId: "log-title",
      initialFocusSelector: "#log-content",
      onMount: function (dialog) {
        dialog.querySelector('[data-action="modal-cancel"]').addEventListener("click", ui.closeModal);
        dialog.querySelector("#log-save-btn").addEventListener("click", function () {
          var ws = dialog.querySelector("#log-week-start").value;
          var we = dialog.querySelector("#log-week-end").value;
          var body = dialog.querySelector("#log-content").value;

          if (isEdit) {
            log.weekStart = ws;
            log.weekEnd = we;
            log.content = body;
          } else {
            state.decisionLogs.push({
              id: storage.createId(),
              weekStart: ws,
              weekEnd: we,
              content: body,
              createdAt: nowISO()
            });
          }
          persist();
          ui.closeModal();
          navigate("#logs");
          ui.showToast(isEdit ? "Decision log updated." : "Decision log saved.");
        });
      }
    });
  }

  // ================= ACTIONS =================

  function makeCurrentBet(id) {
    var bet = findBet(id);
    if (!bet) return;
    if (bet.status !== "active" && activeBets().length >= 2) {
      ui.showToast("Your focus limit is two current bets. Park, complete, or kill one before making another bet current.");
      return;
    }
    bet.status = "active";
    var now = nowISO();
    if (!bet.activatedAt) bet.activatedAt = now;
    bet.lastReviewedAt = now;
    bet.parkedReason = "";
    touch(bet);
    persist();
    render();
    ui.showToast('"' + (bet.title || "Bet") + '" is now a current bet.');
  }

  function moveToBacklog(id) {
    var bet = findBet(id);
    if (!bet) return;
    bet.status = "idea";
    bet.lastReviewedAt = nowISO();
    touch(bet);
    persist();
    render();
    ui.showToast('"' + (bet.title || "Bet") + '" moved to backlog.');
  }

  function markStatus(id, status) {
    var bet = findBet(id);
    if (!bet) return;
    bet.status = status;
    bet.lastReviewedAt = nowISO();
    touch(bet);
    persist();
    render();
    ui.showToast('"' + (bet.title || "Bet") + '" marked ' + status + ".");
  }

  function confirmDeleteBet(id) {
    var bet = findBet(id);
    if (!bet) return;
    ui.confirmDialog({
      title: "Delete this bet?",
      message: 'This will permanently remove "' + (bet.title || "this bet") + '" from your workspace. This cannot be undone.',
      confirmLabel: "Delete",
      destructive: true
    }, function () {
      state.bets = state.bets.filter(function (b) { return b.id !== id; });
      persist();
      navigate("#bets");
      ui.showToast("Bet deleted.");
    });
  }

  function copyBetBrief(id) {
    var bet = findBet(id);
    if (!bet) return;
    var brief = generators.generateBetBrief(bet);
    ui.copyToClipboard(brief, function (ok) {
      ui.showToast(ok ? "Bet Brief copied to clipboard." : "Could not copy. Please select and copy manually.");
    });
  }

  function copyLogContent(id) {
    var log = findLog(id);
    if (!log) return;
    ui.copyToClipboard(log.content, function (ok) {
      ui.showToast(ok ? "Decision log copied to clipboard." : "Could not copy. Please select and copy manually.");
    });
  }

  function confirmDeleteLog(id) {
    var log = findLog(id);
    if (!log) return;
    ui.confirmDialog({
      title: "Delete this decision log?",
      message: "This will permanently remove this decision log. This cannot be undone.",
      confirmLabel: "Delete",
      destructive: true
    }, function () {
      state.decisionLogs = state.decisionLogs.filter(function (l) { return l.id !== id; });
      persist();
      render();
      ui.showToast("Decision log deleted.");
    });
  }

  function handleSaveWeeklyLog() {
    openLogModal(null);
  }

  function dismissWelcome() {
    state.hasSeenWelcome = true;
    persist();
    render();
  }

  function proceedLoadDemo() {
    state = demoData.createDemoState();
    persist();
    navigate("#dashboard");
    ui.showToast("Demo workspace loaded.");
  }

  function handleLoadDemo() {
    if (state.bets.length > 0 || state.decisionLogs.length > 0) {
      ui.confirmDialog({
        title: "Replace current workspace?",
        message: "Loading the demo workspace will replace all bets and decision logs currently stored in this browser. This cannot be undone.",
        confirmLabel: "Load demo data",
        destructive: true
      }, proceedLoadDemo);
    } else {
      proceedLoadDemo();
    }
  }

  function handleResetWorkspace() {
    ui.confirmDialog({
      title: "Reset workspace?",
      message: "This will remove all bets and decision logs stored in this browser. This cannot be undone.",
      confirmLabel: "Reset workspace",
      destructive: true
    }, function () {
      state = storage.resetState();
      navigate("#dashboard");
      ui.showToast("Workspace reset.");
    });
  }

  // ================= EVENT DELEGATION =================

  function toggleMobileMenu() {
    var sidebar = document.getElementById("sidebar");
    var toggle = document.getElementById("menu-toggle");
    if (!sidebar || !toggle) return;
    var isOpen = sidebar.classList.toggle("sidebar--open");
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    document.body.classList.toggle("no-scroll", isOpen);
  }

  function setStatusFilter(status) {
    betsView.status = status;
    render();
  }

  function wireGlobalEvents() {
    document.body.addEventListener("click", function (e) {
      var target = e.target.closest("[data-action]");
      if (!target) return;
      var action = target.getAttribute("data-action");
      var id = target.getAttribute("data-id");

      switch (action) {
        case "new-bet":
          openBetFormModal(null);
          break;
        case "edit-bet":
          openBetFormModal(findBet(id));
          break;
        case "view-bet":
          navigate("#bet/" + id);
          break;
        case "goto-bets":
          navigate("#bets");
          break;
        case "goto-council":
          navigate("#council");
          break;
        case "make-current":
          makeCurrentBet(id);
          break;
        case "open-park":
          openParkModal(id);
          break;
        case "move-backlog":
          moveToBacklog(id);
          break;
        case "mark-done":
          markStatus(id, "done");
          break;
        case "mark-killed":
          markStatus(id, "killed");
          break;
        case "delete-bet":
          confirmDeleteBet(id);
          break;
        case "copy-brief":
          copyBetBrief(id);
          break;
        case "load-demo":
          handleLoadDemo();
          break;
        case "dismiss-welcome":
          dismissWelcome();
          break;
        case "reset-workspace":
          handleResetWorkspace();
          break;
        case "filter-status":
          setStatusFilter(target.getAttribute("data-status"));
          break;
        case "create-log":
          openLogModal(null);
          break;
        case "edit-log":
          openLogModal(findLog(id));
          break;
        case "copy-log":
          copyLogContent(id);
          break;
        case "delete-log":
          confirmDeleteLog(id);
          break;
        case "save-weekly-log":
          handleSaveWeeklyLog();
          break;
        case "menu-toggle":
          toggleMobileMenu();
          break;
        default:
          break;
      }
    });

    document.body.addEventListener("input", function (e) {
      if (e.target && e.target.id === "bet-search") {
        var cursor = e.target.selectionStart;
        betsView.search = e.target.value;
        render();
        var el = document.getElementById("bet-search");
        if (el) {
          el.focus();
          try { el.setSelectionRange(cursor, cursor); } catch (err) { /* ignore */ }
        }
      }
    });

    document.body.addEventListener("change", function (e) {
      if (e.target && e.target.id === "bet-sort") {
        betsView.sort = e.target.value;
        render();
      }
    });

    document.querySelectorAll(".nav-link").forEach(function (link) {
      link.addEventListener("click", function () {
        ui.closeMobileMenu();
      });
    });

    window.addEventListener("hashchange", onHashChange);
  }

  // ================= INIT =================

  function init() {
    appRoot = document.getElementById("app-root");
    if (!window.location.hash) {
      window.location.hash = "#dashboard";
    }
    wireGlobalEvents();
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  FDOS.app = {
    navigate: navigate
  };

})(window.FDOS = window.FDOS || {});
