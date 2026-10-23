(function () {
  const data = window.REVISION;
  if (!data) return;

  const letters = ["أ", "ب", "ج", "د"];
  const searchBox = document.getElementById("searchBox");

  function norm(value) {
    return (value || "")
      .replace(/[أإآ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/[ً-ْ]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function rich(value) {
    let html = escapeHtml(value);
    html = html.replace(/(?<![&#\w])([A-Za-z][A-Za-z0-9+./-]*(?:[ \t]+[A-Za-z0-9+./-]*[A-Za-z][A-Za-z0-9+./-]*)*)(?!;)/g, '<bdi class="latin">$1</bdi>');
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong class=\"term\">$1</strong>");
    return html;
  }

  function arabicCount(count) {
    if (count === 1) return "سؤال واحد";
    if (count === 2) return "سؤالان";
    if (count >= 3 && count <= 10) return count + " أسئلة";
    return count + " سؤالاً";
  }

  function blockHtml(block) {
    if (typeof block === "string") return "<p>" + rich(block) + "</p>";
    if (block.ul) {
      return "<ul>" + block.ul.map((item) => "<li>" + rich(item) + "</li>").join("") + "</ul>";
    }
    if (block.note) return "<p class=\"note-chip\">" + rich(block.note) + "</p>";
    if (block.pair) {
      return "<div class=\"pair\">" + block.pair.map((item) =>
        "<article><h4>" + rich(item.title) + "</h4><p>" + rich(item.text) + "</p></article>"
      ).join("") + "</div>";
    }
    if (block.nest) {
      return "<div class=\"nest\">" + block.nest.map((item) =>
        "<article><h4>" + rich(item.title) + "</h4><p>" + rich(item.text) + "</p></article>"
      ).join("") + "</div>";
    }
    if (block.table) {
      const head = "<tr>" + block.table.headers.map((cell) => "<th>" + rich(cell) + "</th>").join("") + "</tr>";
      const rows = block.table.rows.map((row) =>
        "<tr>" + row.map((cell) => "<td>" + rich(cell) + "</td>").join("") + "</tr>"
      ).join("");
      return "<div class=\"cmp-wrap\"><table class=\"cmp\">" + head + rows + "</table></div>";
    }
    if (block.dl) {
      return "<dl class=\"dl\">" + block.dl.map((row) =>
        "<div><dt>" + rich(row[0]) + "</dt><dd>" + rich(row[1]) + "</dd></div>"
      ).join("") + "</dl>";
    }
    if (block.rings) return ringsHtml(block.rings);
    if (block.timeline) return timelineHtml(block.timeline);
    return "";
  }

  function timelineHtml(timeline) {
    const stages = (timeline.stages || []).map((stage, index) =>
      "<li class=\"tl-stage\">" +
        "<span class=\"tl-dot\" aria-hidden=\"true\">" + (index + 1) + "</span>" +
        "<div class=\"tl-body\">" +
          "<span class=\"tl-era\">" + rich(stage.era) + "</span>" +
          "<h4 class=\"tl-tech\">" + rich(stage.tech) + "</h4>" +
          (stage.purpose ? "<p class=\"tl-purpose\"><span>الغرض الأساسي:</span> " + rich(stage.purpose) + "</p>" : "") +
        "</div>" +
      "</li>"
    ).join("");
    return (
      "<figure class=\"timeline\">" +
        (timeline.caption ? "<figcaption>" + rich(timeline.caption) + "</figcaption>" : "") +
        "<ol class=\"tl-list\">" + stages + "</ol>" +
      "</figure>"
    );
  }

  function ringsHtml(rings) {
    const levels = rings.levels || [];
    let inner = "";
    for (let index = levels.length - 1; index >= 0; index -= 1) {
      const level = levels[index];
      inner =
        "<div class=\"ring ring-" + (index + 1) + "\">" +
          "<div class=\"ring-head\"><b>" + rich(level.title) + "</b>" +
          (level.abbr ? "<span class=\"ring-abbr\">" + escapeHtml(level.abbr) + "</span>" : "") + "</div>" +
          (level.text ? "<p>" + rich(level.text) + "</p>" : "") +
          inner +
        "</div>";
    }
    return (
      "<figure class=\"rings\">" +
        (rings.caption ? "<figcaption>" + rich(rings.caption) + "</figcaption>" : "") +
        inner +
      "</figure>"
    );
  }

  function blocksToText(blocks) {
    return (blocks || []).map((block) => {
      if (typeof block === "string") return block;
      if (block.ul) return block.ul.join(" ");
      if (block.note) return block.note;
      if (block.pair) return block.pair.map((item) => item.title + " " + item.text).join(" ");
      if (block.nest) return block.nest.map((item) => item.title + " " + item.text).join(" ");
      if (block.table) return block.table.headers.join(" ") + " " + block.table.rows.flat().join(" ");
      if (block.dl) return block.dl.map((row) => row.join(" ")).join(" ");
      if (block.rings) return (block.rings.caption || "") + " " + (block.rings.levels || []).map((level) => level.title + " " + (level.abbr || "") + " " + (level.text || "")).join(" ");
      if (block.timeline) return (block.timeline.caption || "") + " " + (block.timeline.stages || []).map((stage) => stage.era + " " + stage.tech + " " + (stage.purpose || "")).join(" ");
      return "";
    }).join(" ");
  }

  function answerMarkup(item) {
    const answer = (item.blocks || []).map(blockHtml).join("");
    const explain = (item.explain || []).map(blockHtml).join("");
    return (
      "<div class=\"answer-body\">" +
        "<p class=\"answer-label\">الإجابة النموذجية</p>" +
        answer +
        (explain ? "<div class=\"explain\"><p class=\"answer-label\">التوضيح</p>" + explain + "</div>" : "") +
      "</div>"
    );
  }

  function renderStats() {
    const essayCount = data.lessons.reduce((sum, lesson) => sum + lesson.essays.filter((item) => !item.summary).length, 0);
    const stats = [
      [essayCount, "سؤالًا مقاليًا"],
      [data.mcq.length, "اختيار من متعدد"],
      [data.tf.length, "صواب أو خطأ"]
    ];
    document.getElementById("heroStats").innerHTML = stats.map(([count, label]) =>
      "<div class=\"stat\"><b>" + count + "</b><span>" + label + "</span></div>"
    ).join("");
  }

  function renderLessons() {
    const tabs = document.getElementById("lessonTabs");
    const panels = document.getElementById("lessonPanels");
    data.lessons.forEach((lesson, index) => {
      const count = lesson.essays.filter((item) => !item.summary).length;
      const tab = document.createElement("button");
      tab.className = "lesson-tab";
      tab.type = "button";
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", index === 0 ? "true" : "false");
      tab.dataset.lesson = lesson.id;
      tab.innerHTML = "<b>" + lesson.title + "</b><small>" + arabicCount(count) + "</small>";
      tabs.appendChild(tab);

      const panel = document.createElement("div");
      panel.className = "lesson-panel" + (index === 0 ? " is-active" : "");
      panel.dataset.lesson = lesson.id;
      panel.setAttribute("role", "tabpanel");
      const cards = lesson.essays.map((item, itemIndex) => {
        if (item.summary) {
          return (
            "<article class=\"summary-card\" data-search=\"" + escapeHtml(norm(item.q + " " + blocksToText(item.blocks))) + "\">" +
              "<div class=\"q-head\"><span class=\"q-num\">خلاصة</span><h3 class=\"q-text\">" + rich(item.q) + "</h3></div>" +
              "<div class=\"answer-body\" style=\"margin-top:12px\">" + (item.blocks || []).map(blockHtml).join("") + "</div>" +
            "</article>"
          );
        }
        const number = String(itemIndex + 1).padStart(2, "0");
        const search = norm(item.q + " " + (item.note || "") + " " + blocksToText(item.blocks) + " " + blocksToText(item.explain));
        return (
          "<article class=\"q-card\" data-search=\"" + escapeHtml(search) + "\">" +
            "<div class=\"q-head\"><span class=\"q-num\">" + number + "</span><div><h3 class=\"q-text\">" + rich(item.q) + "</h3>" +
            (item.note ? "<span class=\"note-chip\">" + rich(item.note) + "</span>" : "") +
            "</div></div>" +
            "<button class=\"toggle no-print\" type=\"button\" aria-expanded=\"false\">" +
              "<span>عرض الإجابة النموذجية</span>" +
              "<svg width=\"16\" height=\"16\" viewBox=\"0 0 16 16\" aria-hidden=\"true\"><path d=\"M3 6l5 5 5-5\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/></svg>" +
            "</button>" +
            "<div class=\"answer\"><div class=\"answer-clip\">" + answerMarkup(item) + "</div></div>" +
          "</article>"
        );
      }).join("");
      panel.innerHTML =
        "<div class=\"lesson-banner\"><div><h3>" + lesson.title + "</h3><p>" + lesson.subtitle + "</p></div><span class=\"score-chip\">" + arabicCount(count) + "</span></div>" +
        "<div class=\"stack\">" + cards + "</div>" +
        lessonPager(index);
      panels.appendChild(panel);
    });

    tabs.addEventListener("click", (event) => {
      const tab = event.target.closest(".lesson-tab");
      if (!tab) return;
      selectLesson(tab.dataset.lesson, true);
    });
  }

  function lessonPager(index) {
    const lessons = data.lessons;
    const prev = index > 0
      ? "<button class=\"btn btn-line\" type=\"button\" data-lesson-target=\"" + lessons[index - 1].id + "\">الدرس السابق</button>"
      : "<button class=\"btn btn-line\" type=\"button\" disabled>الدرس السابق</button>";
    const next = index < lessons.length - 1
      ? "<button class=\"btn btn-solid\" type=\"button\" data-lesson-target=\"" + lessons[index + 1].id + "\">الدرس التالي</button>"
      : "<button class=\"btn btn-solid\" type=\"button\" data-jump=\"mcq\">الانتقال إلى الاختيار من متعدد</button>";
    return "<div class=\"lesson-pager no-print\">" + prev + "<span>" + lessons[index].title + "</span>" + next + "</div>";
  }

  function scrollToActiveLesson() {
    const banner = document.querySelector(".lesson-panel.is-active .lesson-banner");
    if (!banner) return;
    const shell = document.querySelector(".sticky-shell").offsetHeight;
    const tabs = document.querySelector(".lesson-tabs-bar").offsetHeight;
    const top = banner.getBoundingClientRect().top + window.scrollY - shell - tabs - 10;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }

  function selectLesson(id, scroll) {
    document.querySelectorAll(".lesson-tab").forEach((tab) => {
      const selected = tab.dataset.lesson === id;
      tab.setAttribute("aria-selected", selected ? "true" : "false");
      if (selected) {
        const scroller = tab.parentElement;
        const tabBox = tab.getBoundingClientRect();
        const scrollerBox = scroller.getBoundingClientRect();
        if (tabBox.left < scrollerBox.left || tabBox.right > scrollerBox.right) {
          scroller.scrollLeft += tabBox.left - scrollerBox.left - 8;
        }
      }
    });
    document.querySelectorAll(".lesson-panel").forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.lesson === id);
    });
    if (scroll) scrollToActiveLesson();
  }

  function setEssayOpen(card, open) {
    card.classList.toggle("is-open", open);
    const answer = card.querySelector(".answer");
    const button = card.querySelector(".toggle");
    if (answer) answer.classList.toggle("open", open);
    if (button) {
      button.setAttribute("aria-expanded", open ? "true" : "false");
      button.querySelector("span").textContent = open ? "إخفاء الإجابة النموذجية" : "عرض الإجابة النموذجية";
    }
  }

  function updateEssayScore() {
    const open = document.querySelectorAll(".q-card.is-open").length;
    const total = document.querySelectorAll(".q-card").length;
    document.getElementById("essayScore").textContent = "الإجابات المفتوحة: " + open + " من " + total;
  }

  function renderMcq() {
    const root = document.getElementById("mcqList");
    root.innerHTML = data.mcq.map((item, index) => {
      const options = item.options.map((option, optionIndex) =>
        "<label class=\"choice\" data-correct=\"" + (optionIndex === item.answer ? "true" : "false") + "\">" +
          "<input type=\"radio\" name=\"mcq-" + index + "\" value=\"" + optionIndex + "\">" +
          "<span class=\"letter\">" + letters[optionIndex] + "</span>" +
          "<span>" + rich(option) + "</span>" +
          "<span class=\"key-flag\">الإجابة الصحيحة</span>" +
        "</label>"
      ).join("");
      const search = norm(item.q + " " + item.options.join(" "));
      return (
        "<article class=\"mcq-card\" data-search=\"" + escapeHtml(search) + "\" data-answer=\"" + item.answer + "\">" +
          "<div class=\"card-top\"><span class=\"q-num\">" + (index + 1) + "</span><h3 class=\"q-text\">" + rich(item.q) + "</h3></div>" +
          "<div class=\"choices\">" + options + "</div>" +
          "<div class=\"card-actions no-print\">" +
            "<button class=\"btn btn-solid\" type=\"button\" data-action=\"check\">التحقق من الإجابة</button>" +
            "<button class=\"btn btn-ghost\" type=\"button\" data-action=\"reveal\">عرض الإجابة الصحيحة</button>" +
            "<button class=\"btn btn-line\" type=\"button\" data-action=\"reset\">إعادة</button>" +
          "</div>" +
          "<div class=\"feedback\" aria-live=\"polite\"></div>" +
        "</article>"
      );
    }).join("");
  }

  function renderTf() {
    const yes = "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M5 12.5 9.2 17 19 7\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>";
    const no = "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M7 7l10 10M17 7 7 17\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/></svg>";
    const root = document.getElementById("tfList");
    root.innerHTML = data.tf.map((item, index) => {
      const search = norm(item.q);
      return (
        "<article class=\"tf-card\" data-search=\"" + escapeHtml(search) + "\" data-answer=\"" + (item.answer ? "true" : "false") + "\">" +
          "<div class=\"card-top\"><span class=\"q-num\">" + (index + 1) + "</span><h3 class=\"q-text\">" + rich(item.q) + "</h3></div>" +
          "<div class=\"tf-actions no-print\">" +
            "<button class=\"judge true-btn\" type=\"button\" data-value=\"true\" aria-pressed=\"false\">" + yes + "<span>صواب</span></button>" +
            "<button class=\"judge false-btn\" type=\"button\" data-value=\"false\" aria-pressed=\"false\">" + no + "<span>خطأ</span></button>" +
            "<button class=\"btn btn-solid\" type=\"button\" data-action=\"check\">التحقق من الإجابة</button>" +
            "<button class=\"btn btn-line\" type=\"button\" data-action=\"reset\">إعادة</button>" +
          "</div>" +
          "<div class=\"feedback\" aria-live=\"polite\"></div>" +
        "</article>"
      );
    }).join("");
  }

  function selectTf(card, value) {
    if (card.classList.contains("is-revealed")) return;
    card.dataset.pick = value;
    card.querySelectorAll(".judge").forEach((button) => {
      const picked = button.dataset.value === value;
      button.classList.toggle("is-picked", picked);
      button.setAttribute("aria-pressed", picked ? "true" : "false");
    });
  }

  function gradeMcq(card, revealOnly) {
    const selected = card.querySelector("input:checked");
    if (!selected && !revealOnly) {
      card.classList.remove("shake");
      void card.offsetWidth;
      card.classList.add("shake");
      return;
    }
    const answer = Number(card.dataset.answer);
    card.querySelectorAll(".choice").forEach((choice) => {
      choice.classList.remove("is-key", "is-bad");
      if (choice.dataset.correct === "true") choice.classList.add("is-key");
    });
    const feedback = card.querySelector(".feedback");
    card.classList.add("is-revealed");
    if (selected) {
      const value = Number(selected.value);
      card.classList.add("is-attempted");
      card.classList.toggle("is-correct", value === answer);
      card.classList.toggle("is-wrong", value !== answer);
      if (value !== answer) selected.closest(".choice").classList.add("is-bad");
      feedback.innerHTML = value === answer
        ? "<span class=\"badge ok\">إجابة صحيحة</span><span>أحسنت، هذا هو الاختيار الصحيح.</span>"
        : "<span class=\"badge no\">إجابة غير صحيحة</span><span>الاختيار الصحيح موضّح باللون الأخضر.</span>";
    } else {
      card.classList.remove("is-attempted", "is-correct", "is-wrong");
      feedback.innerHTML = "<span class=\"badge ok\">الإجابة الصحيحة</span><span>تم تمييز البديل الصحيح.</span>";
    }
    feedback.classList.add("show");
    card.querySelectorAll("input").forEach((input) => { input.disabled = true; });
    updateQuizScore("mcq");
    applyFilters();
  }

  function resetMcqCard(card) {
    card.classList.remove("is-revealed", "is-attempted", "is-correct", "is-wrong", "shake");
    card.querySelectorAll(".choice").forEach((choice) => choice.classList.remove("is-key", "is-bad"));
    card.querySelectorAll("input").forEach((input) => {
      input.disabled = false;
      input.checked = false;
    });
    const feedback = card.querySelector(".feedback");
    feedback.classList.remove("show");
    feedback.innerHTML = "";
  }

  function gradeTf(card, value) {
    const answer = card.dataset.answer === "true";
    const feedback = card.querySelector(".feedback");
    const correct = (value === "true") === answer;
    card.classList.add("is-revealed", "is-attempted");
    card.classList.toggle("is-correct", correct);
    card.classList.toggle("is-wrong", !correct);
    card.querySelectorAll(".judge").forEach((button) => {
      button.disabled = true;
      const isAnswer = (button.dataset.value === "true") === answer;
      const isPick = button.dataset.value === value;
      button.classList.toggle("is-picked", isPick);
      button.classList.toggle("is-good", isAnswer);
      button.classList.toggle("is-bad", isPick && !correct);
    });
    const right = answer ? "صح" : "خطأ";
    feedback.innerHTML = correct
      ? "<span class=\"badge ok\">إجابتك صحيحة</span><span class=\"badge " + (answer ? "ok" : "no") + "\">" + right + "</span>"
      : "<span class=\"badge no\">إجابتك غير صحيحة</span><span>الإجابة: " + right + "</span>";
    feedback.classList.add("show");
    updateQuizScore("tf");
    applyFilters();
  }

  function resetTfCard(card) {
    card.classList.remove("is-revealed", "is-attempted", "is-correct", "is-wrong");
    delete card.dataset.pick;
    card.querySelectorAll(".judge").forEach((button) => {
      button.disabled = false;
      button.classList.remove("is-picked", "is-good", "is-bad");
      button.setAttribute("aria-pressed", "false");
    });
    const feedback = card.querySelector(".feedback");
    feedback.classList.remove("show");
    feedback.innerHTML = "";
  }

  function updateQuizScore(kind) {
    const cards = Array.from(document.querySelectorAll("." + kind + "-card"));
    const attempted = cards.filter((card) => card.classList.contains("is-attempted")).length;
    const correct = cards.filter((card) => card.classList.contains("is-correct")).length;
    const node = document.getElementById(kind + "Score");
    node.textContent = attempted === 0
      ? "لم تبدأ بعد"
      : "الصحيح " + correct + " من " + attempted + " محاولة";
  }

  function applyFilters() {
    const query = norm(searchBox.value);
    document.body.classList.toggle("is-searching", Boolean(query));
    ["mcq", "tf"].forEach((kind) => {
      const pressed = document.querySelector("#" + kind + "Filters button[aria-pressed='true']");
      const filter = pressed ? pressed.dataset.filter : "all";
      let visible = 0;
      document.querySelectorAll("." + kind + "-card").forEach((card) => {
        const matchesSearch = !query || (card.dataset.search || "").includes(query);
        const matchesFilter =
          filter === "all" ||
          (filter === "open" && !card.classList.contains("is-revealed")) ||
          (filter === "correct" && card.classList.contains("is-correct")) ||
          (filter === "wrong" && card.classList.contains("is-wrong"));
        const show = matchesSearch && matchesFilter;
        card.classList.toggle("is-filtered", !show);
        if (show) visible += 1;
      });
      document.getElementById(kind + "Empty").classList.toggle("show", visible === 0);
    });

    document.querySelectorAll(".q-card, .summary-card").forEach((card) => {
      const matches = !query || (card.dataset.search || "").includes(query);
      card.classList.toggle("is-filtered", !matches);
    });
    document.querySelectorAll(".lesson-panel").forEach((panel) => {
      const any = panel.querySelector(".q-card:not(.is-filtered), .summary-card:not(.is-filtered)");
      panel.classList.toggle("is-filtered", Boolean(query) && !any);
      if (query && any) panel.classList.add("is-active");
    });
    if (!query) {
      const current = document.querySelector(".lesson-tab[aria-selected='true']");
      if (current) selectLesson(current.dataset.lesson);
    }
  }

  function bindFilters(id) {
    document.getElementById(id).addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      button.parentElement.querySelectorAll("button").forEach((item) => {
        item.setAttribute("aria-pressed", item === button ? "true" : "false");
      });
      applyFilters();
    });
  }

  function buildWatermark() {
    const host = document.getElementById("printWatermark");
    const text = "مستر: إسلام أسامه سعد - 01140553528";
    let html = "";
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 2; col += 1) {
        const top = 8 + row * 12;
        const left = col === 0 ? 6 : 46;
        html += "<span style=\"top:" + top + "%;left:" + left + "%\">" + text + "</span>";
      }
    }
    host.innerHTML = html;
  }

  document.getElementById("lessonPanels").addEventListener("click", (event) => {
    const jump = event.target.closest("[data-lesson-target], [data-jump]");
    if (jump) {
      if (jump.dataset.jump === "mcq") {
        document.getElementById("mcq").scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      selectLesson(jump.dataset.lessonTarget, true);
      return;
    }
    const button = event.target.closest(".toggle");
    if (!button) return;
    const card = button.closest(".q-card");
    setEssayOpen(card, !card.classList.contains("is-open"));
    updateEssayScore();
  });

  document.getElementById("expandEssays").addEventListener("click", () => {
    document.querySelectorAll(".q-card").forEach((card) => setEssayOpen(card, true));
    updateEssayScore();
  });

  document.getElementById("collapseEssays").addEventListener("click", () => {
    document.querySelectorAll(".q-card").forEach((card) => setEssayOpen(card, false));
    updateEssayScore();
  });

  document.getElementById("mcqList").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const card = button.closest(".mcq-card");
    if (button.dataset.action === "check") gradeMcq(card, false);
    if (button.dataset.action === "reveal") gradeMcq(card, true);
    if (button.dataset.action === "reset") {
      resetMcqCard(card);
      updateQuizScore("mcq");
      applyFilters();
    }
  });

  document.getElementById("tfList").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const card = button.closest(".tf-card");
    if (button.classList.contains("judge")) selectTf(card, button.dataset.value);
    if (button.dataset.action === "check") {
      if (!card.dataset.pick) {
        card.classList.remove("shake");
        void card.offsetWidth;
        card.classList.add("shake");
        return;
      }
      gradeTf(card, card.dataset.pick);
    }
    if (button.dataset.action === "reset") {
      resetTfCard(card);
      updateQuizScore("tf");
      applyFilters();
    }
  });

  document.getElementById("showAllMcq").addEventListener("click", () => {
    document.querySelectorAll(".mcq-card").forEach((card) => gradeMcq(card, true));
  });
  document.getElementById("resetMcq").addEventListener("click", () => {
    document.querySelectorAll(".mcq-card").forEach(resetMcqCard);
    updateQuizScore("mcq");
    applyFilters();
  });
  document.getElementById("resetTf").addEventListener("click", () => {
    document.querySelectorAll(".tf-card").forEach(resetTfCard);
    updateQuizScore("tf");
    applyFilters();
  });

  searchBox.addEventListener("input", applyFilters);
  bindFilters("mcqFilters");
  bindFilters("tfFilters");

  let pdfBusy = false;
  async function startPdf(withAnswers) {
    if (pdfBusy || !window.ShayyidPdf) return;
    pdfBusy = true;
    const blank = document.getElementById("printBlank");
    const keyed = document.getElementById("printKeyed");
    blank.disabled = true;
    keyed.disabled = true;
    try {
      await window.ShayyidPdf.download(withAnswers);
    } catch (error) {
      document.getElementById("pdfModal").hidden = true;
      window.alert("تعذر إنشاء ملف PDF. أعد المحاولة بعد لحظات.");
    } finally {
      pdfBusy = false;
      blank.disabled = false;
      keyed.disabled = false;
    }
  }

  document.getElementById("printBlank").addEventListener("click", () => startPdf(false));
  document.getElementById("printKeyed").addEventListener("click", () => startPdf(true));

  const themeToggle = document.getElementById("themeToggle");
  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }
  themeToggle.setAttribute("aria-pressed", currentTheme() === "dark" ? "true" : "false");
  themeToggle.addEventListener("click", () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    if (next === "dark") document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
    try { localStorage.setItem("shayyid-theme", next); } catch (error) {}
    const meta = document.querySelector("meta[name='theme-color']");
    if (meta) meta.setAttribute("content", next === "dark" ? "#0E1713" : "#0F5132");
    themeToggle.setAttribute("aria-pressed", next === "dark" ? "true" : "false");
  });

  const links = Array.from(document.querySelectorAll(".section-nav a"));
  const sections = links.map((link) => document.querySelector(link.getAttribute("href")));
  function markCurrentSection() {
    let current = sections[0];
    sections.forEach((section) => {
      if (section.getBoundingClientRect().top < 180) current = section;
    });
    links.forEach((link) => {
      link.setAttribute("aria-current", link.getAttribute("href") === "#" + current.id ? "true" : "false");
    });
  }

  let scrollTick = false;
  window.addEventListener("scroll", () => {
    if (scrollTick) return;
    scrollTick = true;
    window.requestAnimationFrame(() => {
      scrollTick = false;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const width = height > 0 ? (window.scrollY / height) * 100 : 0;
      document.getElementById("scrollProgress").style.width = width + "%";
      markCurrentSection();
    });
  }, { passive: true });

  function syncChrome() {
    const shell = document.querySelector(".sticky-shell");
    if (shell) document.documentElement.style.setProperty("--sticky-offset", shell.offsetHeight + "px");
    document.documentElement.style.setProperty("--viewport", document.documentElement.clientWidth + "px");
  }
  window.addEventListener("resize", syncChrome);
  syncChrome();

  buildWatermark();
  renderStats();
  renderLessons();
  renderMcq();
  renderTf();
  updateEssayScore();
  markCurrentSection();
})();
