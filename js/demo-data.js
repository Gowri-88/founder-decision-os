/* Founder Decision OS — demo-data.js
   Realistic RelayDesk demo workspace. All dates are generated relative to
   runtime "today" so the demo never goes stale.
*/
(function (FDOS) {
  "use strict";

  function iso(d) {
    return d.toISOString();
  }

  function daysFromNow(n) {
    var d = new Date();
    d.setDate(d.getDate() + n);
    return d;
  }

  function createDemoState() {
    var createId = FDOS.storage.createId;
    var now = new Date();

    var bets = [];

    // 1. Current bet — healthy, upcoming review, strong signal
    bets.push({
      id: createId(),
      title: "Product onboarding checklist for new trial users",
      problem: "Trial users who don't complete key setup steps in week one rarely convert to paid.",
      hypothesis: "If we show a short, visible checklist during the first session, more trial users will complete core setup and convert at a higher rate.",
      successMetric: "Trial-to-paid conversion rate for cohorts starting after launch, tracked over 30 days.",
      owner: "Priya (Head of Product)",
      reviewDate: iso(daysFromNow(5)).slice(0, 10),
      status: "active",
      strategyFit: 5,
      upside: 4,
      cost: 2,
      risk: 1,
      evidence: 4,
      reversibility: 5,
      priorityScore: 0,
      parkedReason: "",
      progressNote: "Checklist copy drafted; engineering scoped the first 3 steps and started implementation.",
      createdAt: iso(daysFromNow(-18)),
      updatedAt: iso(daysFromNow(-2)),
      activatedAt: iso(daysFromNow(-12)),
      lastReviewedAt: iso(daysFromNow(-2))
    });

    // 2. Current bet — also upcoming review
    bets.push({
      id: createId(),
      title: "Slack alert for high-risk accounts",
      problem: "Customer success does not learn an account is at risk of churning until the renewal conversation.",
      hypothesis: "If CS gets an early Slack alert when usage drops sharply, they can intervene before the account disengages.",
      successMetric: "Reduction in accounts reaching 'no login in 14 days' status before CS makes contact.",
      owner: "Marcus (CS Lead)",
      reviewDate: iso(daysFromNow(9)).slice(0, 10),
      status: "active",
      strategyFit: 4,
      upside: 4,
      cost: 2,
      risk: 2,
      evidence: 3,
      reversibility: 4,
      priorityScore: 0,
      parkedReason: "",
      progressNote: "Usage-drop threshold defined with CS team; Slack webhook integration in progress.",
      createdAt: iso(daysFromNow(-15)),
      updatedAt: iso(daysFromNow(-4)),
      activatedAt: iso(daysFromNow(-9)),
      lastReviewedAt: iso(daysFromNow(-4))
    });

    // 3. Idea — fresh
    bets.push({
      id: createId(),
      title: "AI-generated support ticket summaries",
      problem: "Support agents spend time re-reading long ticket threads before responding, especially on handoffs.",
      hypothesis: "If agents see a short auto-generated summary at the top of long threads, handoffs and response time improve.",
      successMetric: "Average time-to-first-response on tickets with 5+ messages.",
      owner: "Priya (Head of Product)",
      reviewDate: iso(daysFromNow(21)).slice(0, 10),
      status: "idea",
      strategyFit: 3,
      upside: 3,
      cost: 3,
      risk: 3,
      evidence: 2,
      reversibility: 3,
      priorityScore: 0,
      parkedReason: "",
      progressNote: "",
      createdAt: iso(daysFromNow(-6)),
      updatedAt: iso(daysFromNow(-6)),
      activatedAt: null,
      lastReviewedAt: null
    });

    // 4. Idea — stale (older than 14 days), creates Decision Debt
    bets.push({
      id: createId(),
      title: "CSV export improvements",
      problem: "Several customers have asked for more fields and better formatting in ticket CSV exports.",
      hypothesis: "If we expand export fields and clean up formatting, fewer customers will build brittle manual workarounds.",
      successMetric: "Number of support tickets requesting export changes, tracked monthly.",
      owner: "Devon (PM)",
      reviewDate: iso(daysFromNow(-3)).slice(0, 10),
      status: "idea",
      strategyFit: 2,
      upside: 2,
      cost: 2,
      risk: 1,
      evidence: 3,
      reversibility: 5,
      priorityScore: 0,
      parkedReason: "",
      progressNote: "",
      createdAt: iso(daysFromNow(-26)),
      updatedAt: iso(daysFromNow(-26)),
      activatedAt: null,
      lastReviewedAt: null
    });

    // 5. Parked — insufficient evidence
    bets.push({
      id: createId(),
      title: "Self-serve cancellation flow",
      problem: "Customers who want to cancel currently have to email support, which slows down the process for everyone.",
      hypothesis: "If customers can cancel in-app, support load drops without materially increasing churn.",
      successMetric: "Support tickets tagged 'cancellation' per month, and win-back rate on cancellations.",
      owner: "Marcus (CS Lead)",
      reviewDate: iso(daysFromNow(30)).slice(0, 10),
      status: "parked",
      strategyFit: 2,
      upside: 2,
      cost: 3,
      risk: 3,
      evidence: 1,
      reversibility: 2,
      priorityScore: 0,
      parkedReason: "Insufficient evidence",
      progressNote: "",
      createdAt: iso(daysFromNow(-30)),
      updatedAt: iso(daysFromNow(-10)),
      activatedAt: null,
      lastReviewedAt: iso(daysFromNow(-10))
    });

    // 6. Parked — lower strategic fit
    bets.push({
      id: createId(),
      title: "Integrate with Intercom",
      problem: "A handful of prospects have asked whether RelayDesk integrates with Intercom.",
      hypothesis: "If we build an Intercom integration, we remove a blocker for a small number of deals.",
      successMetric: "Number of deals citing the integration as a blocker, tracked per quarter.",
      owner: "Devon (PM)",
      reviewDate: iso(daysFromNow(60)).slice(0, 10),
      status: "parked",
      strategyFit: 1,
      upside: 2,
      cost: 4,
      risk: 2,
      evidence: 2,
      reversibility: 2,
      priorityScore: 0,
      parkedReason: "Lower strategic fit",
      progressNote: "",
      createdAt: iso(daysFromNow(-40)),
      updatedAt: iso(daysFromNow(-20)),
      activatedAt: null,
      lastReviewedAt: iso(daysFromNow(-20))
    });

    // 7. Done — completed bet, healthy positive signal for history/context
    bets.push({
      id: createId(),
      title: "Usage-based billing experiment",
      problem: "Flat pricing tiers were causing smaller teams to churn before they saw enough value to grow into a tier.",
      hypothesis: "If we offer a usage-based entry tier, smaller teams will convert and expand more predictably.",
      successMetric: "Conversion rate and 90-day expansion rate for teams on the usage-based tier.",
      owner: "Priya (Head of Product)",
      reviewDate: iso(daysFromNow(-14)).slice(0, 10),
      status: "done",
      strategyFit: 5,
      upside: 5,
      cost: 3,
      risk: 2,
      evidence: 4,
      reversibility: 3,
      priorityScore: 0,
      parkedReason: "",
      progressNote: "Shipped to all new signups; conversion improved. Rolled into standard pricing page.",
      createdAt: iso(daysFromNow(-70)),
      updatedAt: iso(daysFromNow(-14)),
      activatedAt: iso(daysFromNow(-55)),
      lastReviewedAt: iso(daysFromNow(-14))
    });

    // Compute Decision Signal for every bet
    bets.forEach(function (b) {
      b.priorityScore = FDOS.calc.calcDecisionSignal(b);
    });

    var week = FDOS.calc.getCurrentWeekRange(now);
    var weekStartISO = FDOS.calc.toISODateOnly(week.monday);
    var weekEndISO = FDOS.calc.toISODateOnly(week.sunday);

    var demoState = {
      bets: bets,
      decisionLogs: [],
      hasSeenWelcome: true
    };

    var logContent = FDOS.generators.generateDecisionLogContent(demoState, week.monday, week.sunday);

    demoState.decisionLogs.push({
      id: createId(),
      weekStart: weekStartISO,
      weekEnd: weekEndISO,
      content: logContent,
      createdAt: iso(now)
    });

    return demoState;
  }

  FDOS.demoData = {
    createDemoState: createDemoState
  };

})(window.FDOS = window.FDOS || {});
