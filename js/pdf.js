(function () {
  const PW = 595.28;
  const PH = 841.89;
  const S = 2;
  const MARGIN = 32;
  const GREEN = "#0F5132";
  const GREEN_2 = "#146C43";
  const INK = "#1A251E";
  const MUTED = "#3E5248";
  const LINE = "#D5E6DC";
  const SAGE = "#E8F5E9";
  const ANSWER_BG = "#F4FBF6";
  const RIGHT = PW - MARGIN;
  const INNER = PW - MARGIN * 2;

  let ctx;
  let canvas;
  let y = 0;
  let limit = PH - 30;
  const contentTop = 64;
  let withAnswers = false;
  let pdfDoc = null;
  let pageRefs = [];
  let pageOpen = false;
  let logo = null;

  function px(value) {
    return value * S;
  }

  function setFont(weight, size) {
    ctx.font = weight + " " + px(size) + "px Cairo, Tahoma, sans-serif";
  }

  function widthOf(text) {
    return ctx.measureText(text).width / S;
  }

  function plain(value) {
    return String(value == null ? "" : value).replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
  }

  function wrap(text, maxWidth, size, weight) {
    setFont(weight, size);
    const words = plain(text).split(" ").filter(Boolean);
    const lines = [];
    let line = "";
    words.forEach((word) => {
      if (widthOf(word) > maxWidth) {
        if (line) lines.push(line);
        let chunk = "";
        Array.from(word).forEach((char) => {
          if (chunk && widthOf(chunk + char) > maxWidth) {
            lines.push(chunk);
            chunk = char;
          } else chunk += char;
        });
        line = chunk;
        return;
      }
      const next = line ? line + " " + word : word;
      if (line && widthOf(next) > maxWidth) {
        lines.push(line);
        line = word;
      } else line = next;
    });
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  }

  function roundRect(x, y0, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(px(x + r), px(y0));
    ctx.arcTo(px(x + w), px(y0), px(x + w), px(y0 + h), px(r));
    ctx.arcTo(px(x + w), px(y0 + h), px(x), px(y0 + h), px(r));
    ctx.arcTo(px(x), px(y0 + h), px(x), px(y0), px(r));
    ctx.arcTo(px(x), px(y0), px(x + w), px(y0), px(r));
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = Math.max(1, S * 0.8);
      ctx.stroke();
    }
  }

  function drawWatermark() {
    ctx.save();
    ctx.translate(px(PW / 2), px(PH / 2));
    ctx.rotate(-30 * Math.PI / 180);
    ctx.fillStyle = "rgba(15, 81, 50, 0.07)";
    setFont(700, 13);
    ctx.textAlign = "center";
    ctx.direction = "rtl";
    const text = "مستر: إسلام أسامه سعد  ·  01140553528";
    for (let row = -7; row <= 7; row += 1) {
      const shift = row % 2 === 0 ? 0 : px(150);
      for (let col = -2; col <= 2; col += 1) {
        ctx.fillText(text, col * px(360) + shift, row * px(118));
      }
    }
    ctx.restore();
  }

  function drawHeader() {
    ctx.fillStyle = GREEN;
    ctx.fillRect(0, 0, px(PW), px(46));
    roundRect(RIGHT - 86, 8, 86, 30, 8, "#E7F6EE");
    if (logo && logo.complete && logo.naturalWidth) {
      const lw = 74;
      const lh = lw * (logo.naturalHeight / logo.naturalWidth);
      ctx.drawImage(logo, px(RIGHT - 80), px(23 - lh / 2), px(lw), px(lh));
    }
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "right";
    ctx.direction = "rtl";
    setFont(800, 11);
    ctx.fillText("المراجعة الشاملة — الوحدة الأولى", px(RIGHT - 96), px(20));
    ctx.fillStyle = "#D1E7DD";
    setFont(700, 8);
    ctx.fillText("مستر: إسلام أسامه سعد  ·  01140553528", px(RIGHT - 96), px(34));
    const mode = withAnswers ? "مع الإجابات" : "بدون إجابات";
    setFont(700, 9);
    ctx.direction = "rtl";
    const modeWidth = widthOf(mode) + 18;
    roundRect(12, 11, modeWidth, 24, 8, "#E7F6EE");
    ctx.fillStyle = GREEN;
    ctx.textAlign = "center";
    ctx.fillText(mode, px(12 + modeWidth / 2), px(27));
  }

  function drawFooterStrip() {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, px(PH - 26), px(PW), px(26));
    ctx.fillStyle = LINE;
    ctx.fillRect(px(MARGIN), px(PH - 26), px(INNER), px(1));
  }

  function begin(kind) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawWatermark();
    if (kind === "content") drawHeader();
    drawFooterStrip();
    pageOpen = true;
    y = kind === "content" ? contentTop : 0;
  }

  function canvasBytes() {
    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          reject(new Error("image"));
          return;
        }
        resolve(new Uint8Array(await blob.arrayBuffer()));
      }, "image/jpeg", 0.86);
    });
  }

  async function commit() {
    if (!pageOpen) return;
    const image = await pdfDoc.embedJpg(await canvasBytes());
    const page = pdfDoc.addPage([PW, PH]);
    page.drawImage(image, { x: 0, y: 0, width: PW, height: PH });
    pageRefs.push(page);
    pageOpen = false;
    const guess = 28;
    setStatus("تم إعداد " + pageRefs.length + " صفحة", Math.min(0.9, pageRefs.length / guess));
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  }

  async function nextPage() {
    await commit();
    begin("content");
  }

  async function place(atom) {
    if (atom.skipAtTop && y <= contentTop + 1) return;
    const room = limit - contentTop;
    if (atom.h < room && y + atom.h + (atom.keep || 0) > limit && y > contentTop + 1) await nextPage();
    atom.draw(y);
    y += atom.h;
  }

  async function placeNode(node) {
    if (node.kind === "group") {
      const room = limit - contentTop;
      if (node.h <= room && y + node.h > limit && y > contentTop + 1) await nextPage();
      for (let index = 0; index < node.items.length; index += 1) await place(node.items[index]);
      return;
    }
    await place(node);
  }

  function gap(h, skipAtTop) {
    return { h: h, skipAtTop: skipAtTop, draw: function () {} };
  }

  function rule() {
    return {
      h: 10,
      skipAtTop: true,
      draw: function (top) {
        ctx.fillStyle = LINE;
        ctx.fillRect(px(MARGIN), px(top + 4), px(INNER), px(1));
      }
    };
  }

  function heading(text, size) {
    const lines = wrap(text, INNER, size, 800);
    const h = lines.length * (size + 8) + 8;
    return {
      h: h,
      keep: 28,
      draw: function (top) {
        setFont(800, size);
        ctx.fillStyle = GREEN;
        ctx.textAlign = "right";
        ctx.direction = "rtl";
        lines.forEach((line, index) => {
          ctx.fillText(line, px(RIGHT), px(top + size + index * (size + 8)));
        });
        ctx.fillStyle = "#D1E7DD";
        ctx.fillRect(px(MARGIN), px(top + h - 4), px(INNER), px(2));
      }
    };
  }

  function subhead(text) {
    const lines = wrap(text, INNER, 10, 600);
    return {
      h: lines.length * 16 + 4,
      keep: 22,
      draw: function (top) {
        setFont(600, 10);
        ctx.fillStyle = MUTED;
        ctx.textAlign = "right";
        ctx.direction = "rtl";
        lines.forEach((line, index) => ctx.fillText(line, px(RIGHT), px(top + 12 + index * 16)));
      }
    };
  }

  function textLine(text, size, weight, color, width, x, extra) {
    return {
      h: extra || size * 1.65,
      draw: function (top) {
        setFont(weight, size);
        ctx.fillStyle = color;
        ctx.textAlign = "right";
        ctx.direction = "rtl";
        ctx.fillText(text, px(x), px(top + size + 1));
      }
    };
  }

  function questionLines(number, text) {
    const badge = 18;
    const textWidth = INNER - badge - 8;
    const lines = wrap(text, textWidth, 12, 700);
    return lines.map((line, index) => ({
      h: index === 0 ? 24 : 20,
      draw: function (top) {
        if (index === 0 && number != null) {
          roundRect(RIGHT - badge, top + 1, badge, badge, 5, SAGE);
          setFont(800, 8);
          ctx.fillStyle = GREEN;
          ctx.textAlign = "center";
          ctx.direction = "ltr";
          ctx.fillText(String(number), px(RIGHT - badge / 2), px(top + 13.5));
        }
        setFont(700, 12);
        ctx.fillStyle = INK;
        ctx.textAlign = "right";
        ctx.direction = "rtl";
        ctx.fillText(line, px(RIGHT - badge - 8), px(top + 15));
      }
    }));
  }

  function answerPad(h) {
    return {
      h: h,
      draw: function (top) {
        ctx.fillStyle = ANSWER_BG;
        ctx.fillRect(px(MARGIN), px(top), px(INNER), px(h));
        ctx.fillStyle = GREEN_2;
        ctx.fillRect(px(RIGHT - 3), px(top), px(3), px(h));
      }
    };
  }

  function answerLine(text, width, color, weight) {
    return {
      h: 16,
      draw: function (top) {
        ctx.fillStyle = ANSWER_BG;
        ctx.fillRect(px(MARGIN), px(top), px(INNER), px(16));
        ctx.fillStyle = GREEN_2;
        ctx.fillRect(px(RIGHT - 3), px(top), px(3), px(16));
        setFont(weight || 400, 10.5);
        ctx.fillStyle = color || INK;
        ctx.textAlign = "right";
        ctx.direction = "rtl";
        ctx.fillText(text, px(RIGHT - 12), px(top + 12));
      }
    };
  }

  function answerLabel(text) {
    return {
      h: 18,
      draw: function (top) {
        ctx.fillStyle = ANSWER_BG;
        ctx.fillRect(px(MARGIN), px(top), px(INNER), px(18));
        ctx.fillStyle = GREEN_2;
        ctx.fillRect(px(RIGHT - 3), px(top), px(3), px(18));
        setFont(800, 10);
        ctx.fillStyle = GREEN_2;
        ctx.textAlign = "right";
        ctx.direction = "rtl";
        ctx.fillText(text, px(RIGHT - 12), px(top + 13));
      }
    };
  }

  function paragraphAtoms(text, width, tone) {
    const color = tone === "muted" ? MUTED : INK;
    return wrap(text, width, 10.5, 400).map((line) => answerLine(line, width, color, 400));
  }

  function bulletAtoms(text, width) {
    const lines = wrap(text, width - 14, 10.5, 400);
    return lines.map((line, index) => answerLine((index === 0 ? "•  " : "    ") + line, width, INK, 400));
  }

  function tableAtoms(table, width) {
    const cols = table.headers.length;
    const colW = width / cols;
    const atoms = [];
    function rowAtom(cells, header, stripe) {
      const wrapped = cells.map((cell) => wrap(plain(cell), colW - 8, 8, header ? 700 : 400));
      const lines = wrapped.reduce((max, item) => Math.max(max, item.length), 1);
      const h = lines * 11 + 8;
      atoms.push({
        h: h,
        draw: function (top) {
          for (let col = 0; col < cols; col += 1) {
            const cellRight = RIGHT - 12 - col * colW;
            ctx.fillStyle = header ? GREEN : (stripe ? "#F7FBFA" : "#ffffff");
            ctx.fillRect(px(cellRight - colW), px(top), px(colW), px(h));
            ctx.strokeStyle = header ? "#0C3F27" : LINE;
            ctx.lineWidth = 1;
            ctx.strokeRect(px(cellRight - colW) + 0.5, px(top) + 0.5, px(colW), px(h));
            setFont(header ? 700 : 400, 8);
            ctx.fillStyle = header ? "#ffffff" : INK;
            ctx.textAlign = "right";
            ctx.direction = "rtl";
            wrapped[col].forEach((line, lineIndex) => {
              ctx.fillText(line, px(cellRight - 4), px(top + 12 + lineIndex * 11));
            });
          }
        }
      });
    }
    atoms.push(answerPad(4));
    rowAtom(table.headers, true, false);
    table.rows.forEach((row, index) => rowAtom(row, false, index % 2 === 1));
    atoms.push(answerPad(4));
    return atoms;
  }

  function ringsAtoms(rings, width) {
    const levels = rings.levels || [];
    const pad = 10;
    const headH = 16;
    const lineH = 11;
    const captionH = rings.caption ? 22 : 0;
    const fills = ["#F7FBF8", "#E8F5E9", "#D1E7DD", "#0F5132"];
    const strokes = ["#D5E6DC", "#BFDCCB", "#9CC7AF", "#0F5132"];
    const descLines = levels.map((level, index) => wrap(plain(level.text || ""), width - pad * 2 - index * pad * 2, 8, 400).slice(0, 2));
    function descHeight(index) {
      return descLines[index].length * lineH + 2;
    }
    function levelHeight(index) {
      if (index >= levels.length) return 0;
      return pad * 2 + headH + descHeight(index) + (index + 1 < levels.length ? levelHeight(index + 1) + 4 : 0);
    }
    const total = captionH + levelHeight(0) + 12;
    return [{
      h: total,
      draw: function (top) {
        ctx.fillStyle = ANSWER_BG;
        ctx.fillRect(px(MARGIN), px(top), px(INNER), px(total));
        ctx.fillStyle = GREEN_2;
        ctx.fillRect(px(RIGHT - 3), px(top), px(3), px(total));
        let y0 = top + 6;
        if (rings.caption) {
          setFont(800, 10.5);
          ctx.fillStyle = GREEN;
          ctx.textAlign = "center";
          ctx.direction = "rtl";
          ctx.fillText(plain(rings.caption), px(RIGHT - 12 - width / 2), px(y0 + 12));
          ctx.fillStyle = "#D1E7DD";
          ctx.fillRect(px(RIGHT - 12 - width / 2 - 40), px(y0 + 18), px(80), px(1.5));
          y0 += captionH;
        }
        let x0 = RIGHT - 12;
        let w = width;
        levels.forEach((level, index) => {
          const last = index === levels.length - 1;
          const h = levelHeight(index);
          const fill = fills[Math.min(index, fills.length - 1)];
          roundRect(x0 - w, y0, w, h, 10, fill, strokes[Math.min(index, strokes.length - 1)]);
          const titleColor = last ? "#ffffff" : GREEN;
          const textColor = last ? "rgba(255,255,255,0.88)" : MUTED;
          setFont(800, 10);
          ctx.fillStyle = titleColor;
          ctx.textAlign = "right";
          ctx.direction = "rtl";
          ctx.fillText(plain(level.title), px(x0 - pad), px(y0 + pad + 10));
          if (level.abbr) {
            setFont(800, 7.5);
            const abbrW = widthOf(level.abbr) + 10;
            roundRect(x0 - w + pad, y0 + pad - 1, abbrW, 13, 6.5, last ? "rgba(255,255,255,0.2)" : "rgba(15,81,50,0.08)");
            ctx.fillStyle = last ? "#ffffff" : GREEN_2;
            ctx.textAlign = "center";
            ctx.direction = "ltr";
            ctx.fillText(level.abbr, px(x0 - w + pad + abbrW / 2), px(y0 + pad + 8.5));
          }
          setFont(400, 8);
          ctx.fillStyle = textColor;
          ctx.textAlign = "right";
          ctx.direction = "rtl";
          descLines[index].forEach((line, lineIndex) => {
            ctx.fillText(line, px(x0 - pad), px(y0 + pad + headH + 9 + lineIndex * lineH));
          });
          x0 -= pad;
          w -= pad * 2;
          y0 += pad + headH + descHeight(index) + 4;
        });
      }
    }];
  }

  function timelineAtoms(timeline, width) {
    const atoms = [];
    const stages = timeline.stages || [];
    const dot = 16;
    const gapX = 10;
    const cardW = width - dot - gapX;
    const padX = 8;
    const textW = cardW - padX * 2;
    atoms.push(answerPad(4));
    if (timeline.caption) {
      atoms.push({
        h: 22,
        draw: function (top) {
          ctx.fillStyle = ANSWER_BG;
          ctx.fillRect(px(MARGIN), px(top), px(INNER), px(22));
          ctx.fillStyle = GREEN_2;
          ctx.fillRect(px(RIGHT - 3), px(top), px(3), px(22));
          setFont(800, 10.5);
          ctx.fillStyle = GREEN;
          ctx.textAlign = "center";
          ctx.direction = "rtl";
          ctx.fillText(plain(timeline.caption), px(RIGHT - 12 - width / 2), px(top + 12));
          ctx.fillStyle = "#D1E7DD";
          ctx.fillRect(px(RIGHT - 12 - width / 2 - 40), px(top + 18), px(80), px(1.5));
        }
      });
    }
    stages.forEach((stage, index) => {
      const techLines = wrap(plain(stage.tech), textW, 9.5, 700);
      const purposeLines = stage.purpose ? wrap("الغرض الأساسي: " + plain(stage.purpose), textW, 8.5, 400) : [];
      const h = 8 + 14 + techLines.length * 14 + purposeLines.length * 12 + 8;
      const last = index === stages.length - 1;
      atoms.push({
        h: h + 6,
        draw: function (top) {
          ctx.fillStyle = ANSWER_BG;
          ctx.fillRect(px(MARGIN), px(top), px(INNER), px(h + 6));
          ctx.fillStyle = GREEN_2;
          ctx.fillRect(px(RIGHT - 3), px(top), px(3), px(h + 6));
          const cx = RIGHT - 12 - dot / 2;
          if (!last) {
            ctx.fillStyle = "#BFDCCB";
            ctx.fillRect(px(cx - 0.75), px(top + dot + 2), px(1.5), px(h + 6 - dot - 2));
          }
          ctx.beginPath();
          ctx.arc(px(cx), px(top + 2 + dot / 2), px(dot / 2), 0, Math.PI * 2);
          ctx.fillStyle = last ? GREEN : "#ffffff";
          ctx.fill();
          ctx.strokeStyle = GREEN_2;
          ctx.lineWidth = Math.max(1, S * 0.8);
          ctx.stroke();
          setFont(800, 7.5);
          ctx.fillStyle = last ? "#ffffff" : GREEN;
          ctx.textAlign = "center";
          ctx.direction = "ltr";
          ctx.fillText(String(index + 1), px(cx), px(top + 2 + dot / 2 + 2.7));
          const cardRight = RIGHT - 12 - dot - gapX;
          roundRect(cardRight - cardW, top, cardW, h, 8, "#ffffff", LINE);
          let y0 = top + 8;
          setFont(800, 7.5);
          ctx.direction = "rtl";
          const era = plain(stage.era);
          const eraW = widthOf(era) + 12;
          roundRect(cardRight - padX - eraW, y0 - 1, eraW, 12, 6, "#E8F5E9");
          ctx.fillStyle = GREEN_2;
          ctx.textAlign = "center";
          ctx.fillText(era, px(cardRight - padX - eraW / 2), px(y0 + 7.8));
          y0 += 14;
          setFont(700, 9.5);
          ctx.fillStyle = GREEN;
          ctx.textAlign = "right";
          techLines.forEach((line, lineIndex) => {
            ctx.fillText(line, px(cardRight - padX), px(y0 + 10 + lineIndex * 14));
          });
          y0 += techLines.length * 14;
          setFont(400, 8.5);
          ctx.fillStyle = INK;
          purposeLines.forEach((line, lineIndex) => {
            ctx.fillText(line, px(cardRight - padX), px(y0 + 9 + lineIndex * 12));
          });
        }
      });
    });
    atoms.push(answerPad(4));
    return atoms;
  }

  function blocksToAtoms(blocks) {
    const width = INNER - 24;
    const atoms = [];
    (blocks || []).forEach((block) => {
      if (typeof block === "string") paragraphAtoms(plain(block), width).forEach((atom) => atoms.push(atom));
      else if (block.ul) block.ul.forEach((item) => bulletAtoms(plain(item), width).forEach((atom) => atoms.push(atom)));
      else if (block.note) paragraphAtoms(plain(block.note), width, "muted").forEach((atom) => atoms.push(atom));
      else if (block.pair) {
        block.pair.forEach((item) => {
          atoms.push(answerLine(plain(item.title), width, GREEN, 800));
          paragraphAtoms(plain(item.text), width).forEach((atom) => atoms.push(atom));
          atoms.push(answerPad(3));
        });
      } else if (block.nest) {
        block.nest.forEach((item) => bulletAtoms(plain(item.title) + ": " + plain(item.text), width).forEach((atom) => atoms.push(atom)));
      } else if (block.dl) {
        block.dl.forEach((row) => bulletAtoms(plain(row[0]) + ": " + plain(row[1]), width).forEach((atom) => atoms.push(atom)));
      } else if (block.table) tableAtoms(block.table, width).forEach((atom) => atoms.push(atom));
      else if (block.rings) ringsAtoms(block.rings, width).forEach((atom) => atoms.push(atom));
      else if (block.timeline) timelineAtoms(block.timeline, width).forEach((atom) => atoms.push(atom));
    });
    return atoms;
  }

  function questionNode(number, item, answers) {
    const items = [gap(8, true)];
    if (plain(item.q)) questionLines(number, item.q).forEach((atom) => items.push(atom));
    if (item.note) {
      wrap(plain(item.note), INNER - 26, 9, 600).forEach((line) => {
        items.push(textLine(line, 9, 600, MUTED, INNER - 26, RIGHT - 26, 15));
      });
    }
    if (answers) {
      items.push(gap(4));
      items.push(answerPad(5));
      items.push(answerLabel("الإجابة النموذجية"));
      blocksToAtoms(item.blocks).forEach((atom) => items.push(atom));
      if (item.explain && item.explain.length) {
        items.push(answerPad(3));
        items.push(answerLabel("التوضيح"));
        blocksToAtoms(item.explain).forEach((atom) => items.push(atom));
      }
      items.push(answerPad(6));
    }
    items.push(gap(2));
    return { kind: "group", h: items.reduce((sum, atom) => sum + atom.h, 0), items: items };
  }

  function choiceNode(number, item, answers) {
    const items = [gap(6)];
    questionLines(number, item.q).forEach((atom) => items.push(atom));
    const letters = ["أ", "ب", "ج", "د"];
    item.options.forEach((option, index) => {
      const correct = answers && index === item.answer;
      const lines = wrap(letters[index] + ".  " + plain(option), INNER - 26, 10.5, correct ? 800 : 400);
      lines.forEach((line) => {
        items.push({
          h: 16,
          draw: function (top) {
            if (correct) {
              ctx.fillStyle = SAGE;
              ctx.fillRect(px(MARGIN), px(top), px(INNER), px(16));
            }
            setFont(correct ? 800 : 400, 10.5);
            ctx.fillStyle = correct ? GREEN : INK;
            ctx.textAlign = "right";
            ctx.direction = "rtl";
            ctx.fillText(line, px(RIGHT - 10), px(top + 12));
          }
        });
      });
    });
    items.push(rule());
    return { kind: "group", h: items.reduce((sum, atom) => sum + atom.h, 0), items: items };
  }

  function tfNode(number, item, answers) {
    const badge = answers ? 36 : 0;
    const lines = wrap(plain(item.q), INNER - 26 - badge, 11, 600);
    const items = [gap(4)];
    lines.forEach((line, index) => {
      items.push({
        h: 18,
        draw: function (top) {
          if (index === 0) {
            roundRect(RIGHT - 18, top, 18, 18, 5, SAGE);
            setFont(800, 8);
            ctx.fillStyle = GREEN;
            ctx.textAlign = "center";
            ctx.direction = "ltr";
            ctx.fillText(String(number), px(RIGHT - 9), px(top + 12.5));
            if (answers) {
              const label = item.answer ? "صح" : "خطأ";
              setFont(800, 10);
              ctx.fillStyle = item.answer ? GREEN : "#B42318";
              ctx.textAlign = "left";
              ctx.direction = "rtl";
              ctx.fillText(label, px(MARGIN), px(top + 13));
            }
          }
          setFont(600, 11);
          ctx.fillStyle = INK;
          ctx.textAlign = "right";
          ctx.direction = "rtl";
          ctx.fillText(line, px(RIGHT - 26), px(top + 14));
        }
      });
    });
    return { kind: "group", h: items.reduce((sum, atom) => sum + atom.h, 0), items: items };
  }

  function buildNodes(data) {
    const nodes = [];
    nodes.push(heading("الأسئلة المقالية", 18));
    nodes.push(gap(8));
    data.lessons.forEach((lesson) => {
      const essays = lesson.essays.filter((item) => !item.summary);
      essays.forEach((item, index) => {
        const node = questionNode(index + 1, item, withAnswers);
        if (index === 0) {
          const head = [heading(lesson.title, 15), subhead(lesson.subtitle), gap(4)];
          node.items = head.concat(node.items);
          node.h += head.reduce((sum, atom) => sum + atom.h, 0);
        }
        nodes.push(node);
      });
      if (withAnswers) {
        const summary = lesson.essays.find((item) => item.summary);
        if (summary) {
          const node = questionNode(null, { q: "", blocks: summary.blocks, explain: summary.explain }, true);
          node.items = node.items.filter((atom) => atom.h > 0);
          const head = [gap(8), heading(summary.q, 14)];
          node.items = head.concat(node.items);
          node.h += head.reduce((sum, atom) => sum + atom.h, 0);
          nodes.push(node);
        }
      }
    });
    nodes.push(gap(12));
    nodes.push(heading("أسئلة الاختيار من متعدد", 18));
    nodes.push(gap(6));
    data.mcq.forEach((item, index) => nodes.push(choiceNode(index + 1, item, withAnswers)));
    nodes.push(gap(8));
    nodes.push(heading("أسئلة صواب أو خطأ", 18));
    nodes.push(gap(6));
    data.tf.forEach((item, index) => nodes.push(tfNode(index + 1, item, withAnswers)));
    return nodes;
  }

  function drawCover(data) {
    begin("cover");
    ctx.fillStyle = GREEN;
    ctx.fillRect(0, 0, px(PW), px(168));
    roundRect(PW / 2 - 70, 28, 140, 78, 16, "#ffffff");
    if (logo && logo.complete && logo.naturalWidth) {
      const lw = 120;
      const lh = lw * (logo.naturalHeight / logo.naturalWidth);
      ctx.drawImage(logo, px(PW / 2 - lw / 2), px(67 - lh / 2), px(lw), px(lh));
    }
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.direction = "rtl";
    setFont(800, 12);
    ctx.fillText("منصة المراجعة التعليمية", px(PW / 2), px(132));
    setFont(700, 9);
    ctx.fillStyle = "#D1E7DD";
    ctx.fillText("الصف الثاني الثانوي", px(PW / 2), px(150));

    roundRect(36, 196, PW - 72, 318, 18, "#F7FBFA", GREEN);
    ctx.textAlign = "center";
    ctx.direction = "rtl";
    ctx.fillStyle = GREEN;
    setFont(800, 22);
    ctx.fillText("المراجعة الشاملة", px(PW / 2), px(246));
    setFont(700, 12);
    ctx.fillStyle = INK;
    const unit = wrap("الوحدة الأولى: تكنولوجيا المعلومات والمجتمع", PW - 120, 12, 700);
    unit.forEach((line, index) => ctx.fillText(line, px(PW / 2), px(276 + index * 20)));
    ctx.fillStyle = LINE;
    ctx.fillRect(px(PW / 2 - 40), px(318), px(80), px(2));
    ctx.fillStyle = INK;
    setFont(700, 12);
    ctx.fillText("مستر: إسلام أسامه سعد", px(PW / 2), px(348));
    setFont(800, 13);
    ctx.fillStyle = GREEN;
    ctx.fillText("01140553528", px(PW / 2), px(372));
    const mode = withAnswers ? "نسخة مع الإجابات النموذجية" : "نسخة بدون إجابات";
    setFont(800, 11);
    const modeWidth = widthOf(mode) + 28;
    roundRect(PW / 2 - modeWidth / 2, 392, modeWidth, 28, 14, GREEN);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(mode, px(PW / 2), px(411));

    const essayTotal = data.lessons.reduce((sum, lesson) => sum + lesson.essays.filter((item) => !item.summary).length, 0);
    const stats = [
      [String(essayTotal), "سؤالًا مقاليًا"],
      [String(data.mcq.length), "اختيار من متعدد"],
      [String(data.tf.length), "صواب أو خطأ"]
    ];
    const boxW = (INNER - 20) / 3;
    stats.forEach((stat, index) => {
      const x = RIGHT - (index + 1) * boxW - index * 10;
      roundRect(x, 548, boxW, 78, 14, "#ffffff", LINE);
      ctx.textAlign = "center";
      ctx.fillStyle = GREEN;
      setFont(800, 22);
      ctx.fillText(stat[0], px(x + boxW / 2), px(582));
      ctx.fillStyle = MUTED;
      setFont(700, 9);
      ctx.fillText(stat[1], px(x + boxW / 2), px(606));
    });

    ctx.fillStyle = GREEN;
    ctx.fillRect(0, px(PH - 64), px(PW), px(38));
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.direction = "rtl";
    setFont(700, 10);
    ctx.fillText("شَيِّـدْ  ·  مستر: إسلام أسامه سعد  ·  01140553528", px(PW / 2), px(PH - 40));
    y = PH;
  }

  function setStatus(text, ratio) {
    const status = document.getElementById("pdfStatus");
    const bar = document.getElementById("pdfBar");
    if (status) status.textContent = text;
    if (bar) bar.style.width = Math.round(Math.max(0, Math.min(1, ratio)) * 100) + "%";
  }

  function loadPdfLib() {
    if (window.PDFLib) return Promise.resolve();
    if (!loadPdfLib.promise) {
      loadPdfLib.promise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "vendor/pdf-lib.min.js?v=3";
        script.onload = function () { resolve(); };
        script.onerror = function () { reject(new Error("pdf-lib")); };
        document.head.appendChild(script);
      });
    }
    return loadPdfLib.promise;
  }

  async function download(answers) {
    const data = window.REVISION;
    if (!data) throw new Error("data");
    withAnswers = Boolean(answers);
    const modal = document.getElementById("pdfModal");
    modal.hidden = false;
    setStatus("تجهيز الملف", 0.04);
    await loadPdfLib();
    await document.fonts.ready;
    await Promise.all([
      document.fonts.load("400 16px Cairo"),
      document.fonts.load("700 16px Cairo"),
      document.fonts.load("800 16px Cairo")
    ]);
    logo = document.querySelector(".logo-badge img");
    canvas = document.createElement("canvas");
    canvas.width = Math.round(PW * S);
    canvas.height = Math.round(PH * S);
    ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    const lib = window.PDFLib;
    pdfDoc = await lib.PDFDocument.create();
    pageRefs = [];
    pageOpen = false;
    setStatus("بناء الصفحات", 0.08);
    drawCover(data);
    await commit();
    begin("content");
    const nodes = buildNodes(data);
    for (let index = 0; index < nodes.length; index += 1) await placeNode(nodes[index]);
    await commit();
    setStatus("ترقيم الصفحات", 0.94);
    const font = await pdfDoc.embedFont(lib.StandardFonts.Helvetica);
    pageRefs.forEach((page, index) => {
      const label = (index + 1) + " / " + pageRefs.length;
      const textWidth = font.widthOfTextAtSize(label, 9);
      page.drawText(label, {
        x: (PW - textWidth) / 2,
        y: 9,
        size: 9,
        font: font,
        color: lib.rgb(0.09, 0.32, 0.2)
      });
    });
    pdfDoc.setTitle(withAnswers ? "مراجعة الوحدة الأولى - مع الإجابات" : "مراجعة الوحدة الأولى - بدون إجابات");
    pdfDoc.setAuthor("مستر: إسلام أسامه سعد");
    pdfDoc.setCreator("منصة شَيِّـدْ");
    setStatus("حفظ الملف", 0.98);
    const bytes = await pdfDoc.save();
    const file = new Blob([bytes], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = withAnswers
      ? "مراجعة-الوحدة-الأولى-مع-الإجابات.pdf"
      : "مراجعة-الوحدة-الأولى-بدون-إجابات.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(link.href); }, 4000);
    setStatus("تم حفظ الملف", 1);
    window.setTimeout(function () { modal.hidden = true; }, 350);
    canvas.width = 1;
    canvas.height = 1;
  }

  window.ShayyidPdf = { download: download };
})();
