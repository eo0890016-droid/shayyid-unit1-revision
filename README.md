<div align="center">

<img src="assets/شَيِّـدْ__No background.png" alt="شَيِّـدْ" width="180">

# المراجعة الشاملة — الوحدة الأولى: تكنولوجيا المعلومات والمجتمع

**Interactive Arabic revision app for Unit 1 (IT & Society), Second Secondary — شَيِّـدْ platform**

Essay questions by lesson · Multiple choice · True / False · Dark mode · Watermarked PDF export

</div>

---

## Overview

A single-page, right-to-left revision website built for students of the second secondary year. It covers the whole of Unit 1 across its four lessons, lets students test themselves interactively, and generates print-ready PDF revision sheets in seconds, directly in the browser.

Everything is plain HTML, CSS, and JavaScript. There is no build step, no framework, and no server: open `index.html` or host it on GitHub Pages.

## Features

**Essay questions (الأسئلة المقالية)**
- 77 questions across the four lessons, with model answers and a short explanation for each.
- Lesson tabs stay pinned while scrolling, with "next / previous lesson" at the end of every lesson.
- Rich answer formats: bullet lists, comparison tables, side-by-side pairs, and nested "containment" diagrams (AI ⊃ ML ⊃ DL ⊃ GenAI).
- Instant search across questions and answers, tolerant of Arabic spelling variants (أ/إ/آ, ة/ه, ى/ي, diacritics).

**Multiple choice (اختيار من متعدد)**
- 53 questions. Pick an answer, then check it, or reveal the correct one.
- Score tracking and filters: all / unanswered / correct / wrong.

**True or false (صواب أو خطأ)**
- 50 statements. Choose, then press "التحقق من الإجابة" to see the verdict. Answers are never shown before the attempt.

**PDF export**
- Two downloads: *without answers* (student sheet) and *with model answers* (teacher key).
- Cover page, running header with the platform logo, page numbers, and a light diagonal watermark carrying the instructor's name and phone on every page.
- Generated entirely client-side (canvas + [pdf-lib](https://pdf-lib.js.org/)); a full 37-page key builds in about two seconds.

**Design**
- Mobile-first, RTL layout in the شَيِّـدْ green palette, with the Cairo typeface.
- Light / dark mode toggle in the header, remembered between visits and respecting the system preference by default.
- Accessible controls: keyboard focus styles, ARIA roles for tabs and toggles, reduced-motion support.

## Project structure

```
.
├── index.html              # page shell
├── css/
│   └── styles.css          # all styles (light + dark, print, PDF stage)
├── js/
│   ├── app.js              # rendering, search, quizzes, theme, navigation
│   ├── pdf.js              # client-side PDF builder
│   ├── data.js             # generated question bank (window.REVISION)
│   └── parts/              # essay sources per lesson (l1–l4.json)
├── vendor/
│   └── pdf-lib.min.js      # loaded on demand when a PDF is requested
├── assets/
│   └── شَيِّـدْ__No background.png
└── docs/                   # original Word files the content was taken from
```

## Running locally

No installation is needed.

```bash
git clone https://github.com/<your-user>/<repo>.git
cd <repo>
# then open index.html in a browser
```

If you prefer a local server (optional):

```bash
python -m http.server 8080
# http://localhost:8080
```

## Deploying to GitHub Pages

1. Push the repository to GitHub.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and the `/ (root)` folder, then save.
4. The site will be live at `https://<your-user>.github.io/<repo>/` within a minute or two.

## Editing the content

- **Essay questions** live in `js/parts/l1.json` … `l4.json`. Each item has a `q` (question), `blocks` (model answer), and an optional `explain` and `note`.
- **Multiple choice** and **true/false** items live in the `mcq` and `tf` arrays inside `js/data.js`.
- `js/data.js` is the file the page actually loads, so any change to a lesson JSON must be mirrored there.
- Supported answer block types: plain string, `ul`, `note`, `pair`, `nest`, `table`, `dl`, and `rings` (nested containment diagram). Wrap a key term in `**double asterisks**` to highlight it.
- After editing, bump the `?v=` query string on the `css` and `js` links in `index.html` so browsers fetch the new files.

## Browser support

Current versions of Chrome, Edge, Firefox, and Safari on desktop and mobile. PDF export needs a browser with Canvas and `Blob` support (all of the above).

## Credits

- Content and teaching: **مستر إسلام أسامه سعد** · 01140553528
- Platform: **شَيِّـدْ** — منصة المراجعة التعليمية
- Fonts: [Cairo](https://fonts.google.com/specimen/Cairo) via Google Fonts
- PDF generation: [pdf-lib](https://github.com/Hopding/pdf-lib) (MIT)

## License

Source code is released under the MIT License. The educational content (questions, model answers, and branding) is © مستر إسلام أسامه سعد / شَيِّـدْ and is provided for students' personal study.
