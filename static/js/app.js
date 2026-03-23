/* =========================
   sheet renderer base
========================= */
const SHEET_URLS = {
  intro: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTgItEf1uiKXm2Y9sWKYucwH_XdOzqc5siviWrG6V0AHCThOPV8ltlsGmvoV0UW__EGQy61vOc52Hlq/pub?gid=2112930624&single=true&output=csv",
  slot: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTgItEf1uiKXm2Y9sWKYucwH_XdOzqc5siviWrG6V0AHCThOPV8ltlsGmvoV0UW__EGQy61vOc52Hlq/pub?gid=682726254&single=true&output=csv",
  refund: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTgItEf1uiKXm2Y9sWKYucwH_XdOzqc5siviWrG6V0AHCThOPV8ltlsGmvoV0UW__EGQy61vOc52Hlq/pub?gid=647000100&single=true&output=csv",
  notice: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTgItEf1uiKXm2Y9sWKYucwH_XdOzqc5siviWrG6V0AHCThOPV8ltlsGmvoV0UW__EGQy61vOc52Hlq/pub?gid=495564651&single=true&output=csv",
  price: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTgItEf1uiKXm2Y9sWKYucwH_XdOzqc5siviWrG6V0AHCThOPV8ltlsGmvoV0UW__EGQy61vOc52Hlq/pub?gid=1968534914&single=true&output=csv",
  collab: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTgItEf1uiKXm2Y9sWKYucwH_XdOzqc5siviWrG6V0AHCThOPV8ltlsGmvoV0UW__EGQy61vOc52Hlq/pub?gid=51774507&single=true&output=csv",
  portfolio: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTgItEf1uiKXm2Y9sWKYucwH_XdOzqc5siviWrG6V0AHCThOPV8ltlsGmvoV0UW__EGQy61vOc52Hlq/pub?gid=1592596066&single=true&output=csv",
};

/* =========================
   utils
========================= */
function driveToDirectUrl(url = "") {
  if (!url) return "";

  const trimmed = String(url).trim();

  if (trimmed.includes("lh3.googleusercontent.com/d/")) {
    return trimmed;
  }

  const match = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://lh3.googleusercontent.com/d/${match[1]}`;
  }

  return trimmed;
}

function parseTags(tagText = "") {
  if (!tagText) return [];

  return String(tagText)
    .split("#")
    .map(tag => tag.trim())
    .filter(Boolean);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function nl2br(value = "") {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

/* =========================
   csv parser
========================= */
function parseCsv(csvText = "") {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const next = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(cell);

      const isEmptyRow = row.every(item => String(item).trim() === "");
      if (!isEmptyRow) rows.push(row);

      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    const isEmptyRow = row.every(item => String(item).trim() === "");
    if (!isEmptyRow) rows.push(row);
  }

  if (!rows.length) return [];

  const headers = rows[0].map(header => String(header).trim());
  const dataRows = rows.slice(1);

  return dataRows.map(cols => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = cols[index] != null ? String(cols[index]).trim() : "";
    });
    return obj;
  });
}

/* =========================
   data fetcher
========================= */

async function fetchSheetCsv(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`CSV fetch failed: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  return parseCsv(text);
}

/* =========================
   intro mapper
========================= */

function normalizeIntroRow(row = {}) {
  return {
    name: row.name || "",
    desc: row.desc || "",
    badge: row.badge || "",
    tags: parseTags(row.tags || ""),
    imgUrl: driveToDirectUrl(row.img_url || "")
  };
}

/* =========================
   intro template
========================= */

function createIntroTemplate(data) {
  const {
    name,
    desc,
    badge,
    tags,
    imgUrl
  } = data;

  const badgeHtml = badge
    ? `<span class="intro-badge"><span class="aa-text">${escapeHtml(badge)}</span></span>`
    : "";

  const tagsHtml = tags.length
    ? `
      <ul class="intro-tags">
        ${tags.map(tag => `<li class="intro-tag">#<span class="aa-text">${escapeHtml(tag)}</span></li>`).join("")}
      </ul>
    `
    : "";

    const ctaHtml = `
        <div class="intro-actions">
        <a href="#form" class="intro-btn is-primary">
            문의하기
        </a>
        <a href="#portfolio" class="intro-btn is-ghost">
            작업물 보기
        </a>
        </div>
    `;

  const imageHtml = imgUrl
    ? `
      <div class="intro-media">
        <img src="${imgUrl}" alt="<span class="aa-text">${escapeHtml(name)}</span> 대표 이미지" loading="eager">
      </div>
    `
    : "";

  return `
    <div class="intro-inner">
        <div class="intro-obj obj-1" aria-hidden="true"></div>
        <div class="intro-obj obj-2" aria-hidden="true"></div>
        <div class="intro-obj obj-3" aria-hidden="true"></div>
        <div class="intro-obj obj-4" aria-hidden="true"></div>
        <div class="intro-obj obj-5" aria-hidden="true"></div>
        <div class="intro-obj obj-6" aria-hidden="true"></div>
      <div class="intro-copy">
        ${badgeHtml}
        <h1 class="intro-name"><span class="aa-text">${escapeHtml(name)}</span></h1>
        <p class="intro-desc"><span class="aa-text">${nl2br(desc)}</span></p>
        ${tagsHtml}
        ${ctaHtml}
      </div>
      ${imageHtml}
    </div>
  `;
}

/* =========================
   intro renderer
========================= */

function renderIntroSection(targetSelector, rows) {
  const target = document.querySelector(targetSelector);
  if (!target) {
    console.warn(`[renderIntroSection] target not found: ${targetSelector}`);
    return;
  }

  if (!rows || !rows.length) {
    target.innerHTML = `<div class="intro-empty">표시할 인트로 데이터가 없습니다.</div>`;
    return;
  }

  const introData = normalizeIntroRow(rows[0]);
  target.innerHTML = createIntroTemplate(introData);
}

/* =========================
   init
========================= */

async function initIntroSection() {
  try {
    const rows = await fetchSheetCsv(SHEET_URLS.intro);
    renderIntroSection("#intro", rows);
  } catch (error) {
    console.error("[initIntroSection] failed:", error);

    const target = document.querySelector("#intro");
    if (target) {
      target.innerHTML = `
        <div class="intro-error">
          인트로 데이터를 불러오지 못했습니다.
        </div>
      `;
    }
  }
}

document.addEventListener("DOMContentLoaded", initIntroSection);

/* =========================
   slot helpers
========================= */

function normalizeSlotValue(value = "") {
  const v = String(value).trim().toLowerCase();

  if (!v) {
    return {
      label: "-",
      state: "empty"
    };
  }

  if (["open", "opened", "available", "가능"].includes(v)) {
    return {
      label: "● 가능",
      state: "open"
    };
  }

  if (["close", "closed", "마감", "불가"].includes(v)) {
    return {
      label: "♥ 마감",
      state: "closed"
    };
  }

    if (["hold", "pending", "대기", "조율중", "예약", "reserved", "appoint", "appointment"].includes(v)) {
    return {
        label: "★ 예약",
        state: "hold"
    };
    }

  return {
    label: String(value).trim(),
    state: "custom"
  };
}

function normalizeSlotRows(rows = []) {
  return rows
    .filter(row => row && Object.keys(row).length)
    .map(row => {
      const month = String(row.month || "").trim();

      const slotEntries = Object.entries(row)
        .filter(([key]) => key !== "month")
        .map(([key, value]) => ({
          key,
          title: key,
          ...normalizeSlotValue(value)
        }));

      return {
        month,
        slots: slotEntries
      };
    });
}

function normalizeRefundRows(rows = []) {
  return rows
    .filter(row => row && (row.time || row.refund))
    .map(row => ({
      time: String(row.time || "").trim(),
      refund: String(row.refund || "").trim()
    }));
}

/* =========================
   slot templates
========================= */

function createSlotTable(slotRows = []) {
  if (!slotRows.length) {
    return `<div class="slot-empty">등록된 슬롯 정보가 없습니다.</div>`;
  }

  return `
    <div class="slot-board">
      <div class="slot-board__body">
        ${slotRows.map(row => `
          <div class="slot-row">
            <div class="slot-row__month">
              <span class="slot-month"><span class="aa-text">${escapeHtml(row.month)}</span>월</span>
            </div>

            <div class="slot-row__slots">
              ${row.slots.map(slot => `
                <div class="slot-pill is-${slot.state}">
                  <span class="slot-pill__value"><span class="aa-text">${escapeHtml(slot.label)}</span></span>
                </div>
              `).join("")}
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function createRefundTable(refundRows = []) {
  if (!refundRows.length) {
    return `<div class="slot-empty">등록된 환불 정책 정보가 없습니다.</div>`;
  }

  return `
    <div class="refund-list">
      ${refundRows.map(row => `
        <div class="refund-item">
          <div class="refund-item__time"><span class="aa-text">${nl2br(row.time)}</span></div>
          <div class="refund-item__value"><span class="aa-text">${nl2br(row.refund)}</span></div>
        </div>
      `).join("")}
    </div>
  `;
}

function createSlotSectionTemplate(slotRows, refundRows) {
  return `
    <div class="slot-grid">
      <article class="slot-card slot-card--slot">
        <div class="slot-card__obj obj-a" aria-hidden="true"></div>
        <div class="slot-card__obj obj-b" aria-hidden="true"></div>

        <div class="slot-card__head">
          <span class="slot-card__badge">slot</span>
          <h2 class="slot-card__title">작업 현황</h2>
          <p class="slot-card__hint">♥ 마감 / ● 가능 / ★ 예약</p>
        </div>

        ${createSlotTable(slotRows)}
      </article>

      <article class="slot-card slot-card--refund">
        <div class="slot-card__obj obj-c" aria-hidden="true"></div>
        <div class="slot-card__obj obj-d" aria-hidden="true"></div>

        <div class="slot-card__head">
          <span class="slot-card__badge">refund</span>
          <h2 class="slot-card__title">환불 정책</h2>
        </div>

        ${createRefundTable(refundRows)}
      </article>
    </div>
  `;
}

/* =========================
   slot renderer
========================= */

function renderSlotSection(targetSelector, slotRows, refundRows) {
  const target = document.querySelector(targetSelector);
  if (!target) {
    console.warn(`[renderSlotSection] target not found: ${targetSelector}`);
    return;
  }

  const normalizedSlotRows = normalizeSlotRows(slotRows);
  const normalizedRefundRows = normalizeRefundRows(refundRows);

  target.innerHTML = createSlotSectionTemplate(normalizedSlotRows, normalizedRefundRows);
}

/* =========================
   init
========================= */

async function initSlotSection() {
  try {
    const [slotRows, refundRows] = await Promise.all([
      fetchSheetCsv(SHEET_URLS.slot),
      fetchSheetCsv(SHEET_URLS.refund)
    ]);

    renderSlotSection("#slot", slotRows, refundRows);
  } catch (error) {
    console.error("[initSlotSection] failed:", error);

    const target = document.querySelector("#slot");
    if (target) {
      target.innerHTML = `
        <div class="slot-error">
          슬롯 섹션 데이터를 불러오지 못했습니다.
        </div>
      `;
    }
  }
}

document.addEventListener("DOMContentLoaded", initSlotSection);


/* =========================
   notice helpers
========================= */

function normalizeNoticeRows(rows = []) {
  return rows
    .filter(row => row && (row.order || row.desc))
    .map((row, index) => ({
      order: String(row.order || index + 1).trim(),
      desc: String(row.desc || "").trim()
    }))
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

/* =========================
   notice templates
========================= */

function createNoticeList(noticeRows = []) {
  if (!noticeRows.length) {
    return `<div class="notice-empty">등록된 공지사항 정보가 없습니다.</div>`;
  }

  return `
    <div class="notice-list">
      ${noticeRows.map(row => `
        <div class="notice-item">
          <div class="notice-item__num"><span class="aa-text">${escapeHtml(row.order)}</span></div>
          <div class="notice-item__text"><span class="aa-text">${nl2br(row.desc)}</span></div>
        </div>
      `).join("")}
    </div>
  `;
}

function createNoticeSectionTemplate(noticeRows = []) {
  return `
    <div class="notice-wrap">
      <article class="notice-panel notice-main">
        <div class="notice-obj obj-a" aria-hidden="true"></div>
        <div class="notice-obj obj-b" aria-hidden="true"></div>
        <div class="notice-obj obj-c" aria-hidden="true"></div>

        <div class="notice-head">
          <span class="notice-badge">notice</span>

          <div class="notice-kicker" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>

          <h2 class="notice-title">공지사항</h2>
          <p class="notice-desc">
            문의 전 꼭 확인해주세요. 공지를 읽지 않아 발생한 피해는 책임질 수 없습니다.
          </p>
        </div>

        <div class="notice-body">
          ${createNoticeList(noticeRows)}
        </div>
      </article>
    </div>
  `;
}

/* =========================
   notice renderer
========================= */

function renderNoticeSection(targetSelector, rows) {
  const target = document.querySelector(targetSelector);
  if (!target) {
    console.warn(`[renderNoticeSection] target not found: ${targetSelector}`);
    return;
  }

  const normalizedRows = normalizeNoticeRows(rows);

  if (!normalizedRows.length) {
    target.innerHTML = `<div class="notice-empty">표시할 공지사항 데이터가 없습니다.</div>`;
    return;
  }

  target.innerHTML = createNoticeSectionTemplate(normalizedRows);
}

/* =========================
   init
========================= */

async function initNoticeSection() {
  try {
    const rows = await fetchSheetCsv(SHEET_URLS.notice);
    renderNoticeSection("#notice", rows);
  } catch (error) {
    console.error("[initNoticeSection] failed:", error);

    const target = document.querySelector("#notice");
    if (target) {
      target.innerHTML = `
        <div class="notice-error">
          공지사항 데이터를 불러오지 못했습니다.
        </div>
      `;
    }
  }
}

document.addEventListener("DOMContentLoaded", initNoticeSection);

/* =========================
   price helpers
========================= */

function normalizePriceRows(rows = []) {
  return rows
    .filter(row => row && (row.group || row.title || row.price))
    .map((row, index) => ({
      group: String(row.group || "").trim(),
      order: Number(row.order || index + 1),
      title: String(row.title || "").trim(),
      desc: String(row.desc || "").trim(),
      calc_type: String(row.calc_type || "").trim().toLowerCase(),
      price: Number(String(row.price || "0").replace(/[^0-9.-]/g, "")) || 0
    }))
    .sort((a, b) => {
      if (a.group === b.group) return a.order - b.order;
      return 0;
    });
}

function formatPriceText(price, calcType) {
  const value = `${Number(price || 0).toLocaleString("ko-KR")}원`;
  return calcType === "min" ? `${value}~` : value;
}

function groupPriceRows(rows = []) {
  const grouped = {};

  rows.forEach(row => {
    if (!grouped[row.group]) grouped[row.group] = [];
    grouped[row.group].push(row);
  });

  Object.keys(grouped).forEach(key => {
    grouped[key].sort((a, b) => a.order - b.order);
  });

  return grouped;
}

/* =========================
   price templates
========================= */
function createPricePrimaryCard(item) {
  return `
    <article class="price-primary-card">
      <div class="price-primary-card__top">
        <span class="price-primary-card__badge">Live2D</span>
      </div>

      <h3 class="price-primary-card__title"><span class="aa-text">${escapeHtml(item.title)}</span></h3>
      <p class="price-primary-card__desc"><span class="aa-text">${escapeHtml(item.desc)}</span></p>

      <div class="price-primary-card__price">
        <strong>${formatPriceText(item.price, item.calc_type)}</strong>
      </div>
    </article>
  `;
}

function createPriceOptionCard(item) {
  return `
    <article class="price-option-card">
      <div class="price-option-card__head">
        <div class="price-option-card__title-wrap">
          <h4 class="price-option-card__title"><span class="aa-text">${escapeHtml(item.title)}</span></h4>
        </div>
        <div class="price-option-card__price">${formatPriceText(item.price, item.calc_type)}</div>
      </div>

      <p class="price-option-card__desc ${item.desc ? "" : "is-empty"}">
        ${item.desc ? escapeHtml(item.desc) : ""}
      </p>
    </article>
  `;
}

function createPriceOptionGroup(groupTitle, items = []) {
  if (!items.length) return "";

  return `
    <section class="price-group">
      <div class="price-group__head">
        <h3 class="price-group__title"><span class="aa-text">${escapeHtml(groupTitle)}</span></h3>
      </div>

      <div class="price-option-grid">
        ${items.map((item, index) => createPriceOptionCard(item, index)).join("")}
      </div>
    </section>
  `;
}

function createPriceSectionTemplate(rows = []) {
  const grouped = groupPriceRows(rows);
  const primaryItems = grouped["Live2D 일러스트"] || [];
  const partsItems = grouped["파츠 추가"] || [];
  const optionItems = grouped["추가 옵션"] || [];

  return `
    <div class="price-wrap">
      <div class="price-panel">
        <div class="price-obj obj-a" aria-hidden="true"></div>
        <div class="price-obj obj-b" aria-hidden="true"></div>
        <div class="price-obj obj-c" aria-hidden="true"></div>

        <div class="price-head">
          <span class="price-badge">price</span>

          <div class="price-kicker" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>

          <h2 class="price-title">가격 안내</h2>
        </div>

        <div class="price-body">
          <div class="price-primary-grid">
            ${primaryItems.map(createPricePrimaryCard).join("")}
          </div>

          ${createPriceOptionGroup("파츠 추가", partsItems)}
          ${createPriceOptionGroup("추가 옵션", optionItems)}
        </div>
      </div>
    </div>
  `;
}

/* =========================
   price renderer
========================= */

function renderPriceSection(targetSelector, rows) {
  const target = document.querySelector(targetSelector);
  if (!target) {
    console.warn(`[renderPriceSection] target not found: ${targetSelector}`);
    return;
  }

  const normalizedRows = normalizePriceRows(rows);

  if (!normalizedRows.length) {
    target.innerHTML = `<div class="price-empty">표시할 가격 데이터가 없습니다.</div>`;
    return;
  }

  target.innerHTML = createPriceSectionTemplate(normalizedRows);
}

/* =========================
   init
========================= */

async function initPriceSection() {
  try {
    const rows = await fetchSheetCsv(SHEET_URLS.price);
    renderPriceSection("#price", rows);
  } catch (error) {
    console.error("[initPriceSection] failed:", error);

    const target = document.querySelector("#price");
    if (target) {
      target.innerHTML = `
        <div class="price-error">
          가격 데이터를 불러오지 못했습니다.
        </div>
      `;
    }
  }
}

document.addEventListener("DOMContentLoaded", initPriceSection);

/* =========================
   form helpers
========================= */

function formatFormPriceText(price, calcType) {
  const value = `${Number(price || 0).toLocaleString("ko-KR")}원`;
  return calcType === "min" ? `${value}~` : value;
}

function getFormSumPrice(price) {
  return Number(price || 0);
}

/* =========================
   form chip template
========================= */

function buildFormChip(name, value, text, priceText, type = "checkbox", checked = false) {
  const inputId = `${name}-${String(value).replace(/\s+/g, "-")}-${Math.random().toString(36).slice(2, 8)}`;

  return `
    <label class="request-chip" for="${inputId}">
      <input
        type="${type}"
        id="${inputId}"
        name="${name}"
        value="<span class="aa-text">${escapeHtml(value)}</span>"
        ${checked ? "checked" : ""}
      >
      <span class="request-chip__label">
        <span class="request-chip__check" aria-hidden="true">✓</span>
        <span class="request-chip__body">
          <span class="request-chip__text"><span class="aa-text">${escapeHtml(text)}</span></span>
          <span class="request-chip__price"><span class="aa-text">${escapeHtml(priceText)}</span></span>
        </span>
      </span>
    </label>
  `;
}

function getSelectedText(selector) {
  return Array.from(document.querySelectorAll(selector))
    .map(input => input.value.trim())
    .filter(Boolean);
}

/* =========================
   form price source
========================= */

async function getFormPriceRows() {
  if (Array.isArray(window.__priceRowsCache) && window.__priceRowsCache.length) {
    return window.__priceRowsCache;
  }

  const rows = await fetchSheetCsv(SHEET_URLS.price);
  const normalizedRows = normalizePriceRows(rows);
  window.__priceRowsCache = normalizedRows;
  return normalizedRows;
}

/* =========================
   form render
========================= */

function renderFormOptionLists(rows = []) {
  const grouped = groupPriceRows(rows);

  const typeList = document.querySelector("#form-type-list");
  const partsList = document.querySelector("#form-parts-list");
  const optionsList = document.querySelector("#form-options-list");

  if (!typeList || !partsList || !optionsList) return;

  const typeItems = grouped["Live2D 일러스트"] || [];
  const partsItems = grouped["파츠 추가"] || [];
  const optionItems = grouped["추가 옵션"] || [];

  typeList.innerHTML = typeItems.map((item, index) => {
    return buildFormChip(
      "form-type",
      item.title,
      item.title,
      formatFormPriceText(item.price, item.calc_type),
      "radio",
      index === 0
    );
  }).join("");

  partsList.innerHTML = partsItems.map(item => {
    return buildFormChip(
      "form-parts",
      item.title,
      item.title,
      formatFormPriceText(item.price, item.calc_type),
      "checkbox"
    );
  }).join("");

  optionsList.innerHTML = optionItems.map(item => {
    return buildFormChip(
      "form-options",
      item.title,
      item.title,
      formatFormPriceText(item.price, item.calc_type),
      "checkbox"
    );
  }).join("");
}

/* =========================
   form estimate
========================= */

function updateFormEstimate(rows = []) {
  const priceMap = new Map(
    rows.map(row => [row.title, row])
  );

  const selectedType = document.querySelector('input[name="form-type"]:checked');
  const selectedParts = Array.from(document.querySelectorAll('input[name="form-parts"]:checked'));
  const selectedOptions = Array.from(document.querySelectorAll('input[name="form-options"]:checked'));

  const selectedRows = [];

  if (selectedType && priceMap.has(selectedType.value)) {
    selectedRows.push(priceMap.get(selectedType.value));
  }

  selectedParts.forEach(input => {
    if (priceMap.has(input.value)) selectedRows.push(priceMap.get(input.value));
  });

  selectedOptions.forEach(input => {
    if (priceMap.has(input.value)) selectedRows.push(priceMap.get(input.value));
  });

  const sum = selectedRows.reduce((acc, row) => acc + getFormSumPrice(row.price), 0);

  const priceEl = document.querySelector("#form-estimate-price");
  const itemsEl = document.querySelector("#form-estimate-items");

  if (priceEl) {
    priceEl.textContent = `${sum.toLocaleString("ko-KR")}원`;
  }

  if (itemsEl) {
    if (!selectedRows.length) {
      itemsEl.textContent = "선택된 항목이 없습니다.";
    } else {
      itemsEl.innerHTML = selectedRows
        .map(row => `• <span class="aa-text">${escapeHtml(row.title)}</span> (<span class="aa-text">${escapeHtml(formatFormPriceText(row.price, row.calc_type))}</span>)`)
        .join("<br>");
    }
  }
}

/* =========================
   form actions
========================= */

async function copyFormTemplate(rows = []) {
  const name = document.querySelector("#form-name")?.value.trim() || "";
  const platform = document.querySelector("#form-platform")?.value.trim() || "";
  const rigger = document.querySelector("#form-rigger")?.value.trim() || "";
  const character = document.querySelector("#form-character")?.value.trim() || "";
  const schedule = document.querySelector("#form-schedule")?.value.trim() || "";
  const estimate = document.querySelector("#form-estimate-price")?.textContent.trim() || "0원";

  const selectedType = getSelectedText('input[name="form-type"]:checked');
  const selectedParts = getSelectedText('input[name="form-parts"]:checked');
  const selectedOptions = getSelectedText('input[name="form-options"]:checked');

  const template = `[신청양식]

신청자 닉네임
${name || "-"}

활동 플랫폼
${platform || "-"}

리깅 작가님 닉네임
${rigger || "-"}

신청 타입
${selectedType.join(", ") || "-"}

파츠추가
${selectedParts.join(", ") || "-"}

추가옵션
${selectedOptions.join(", ") || "-"}

캐릭터 정보 (나이/성별/신체특징 등등)
${character || "-"}

공개 일정
${schedule || "-"}

[예상 견적]
${estimate}

* 기본 금액을 단순 합산한 금액입니다. 문의 후 가격이 확정됩니다.`;

  await navigator.clipboard.writeText(template);
}

function resetFormSection(rows = []) {
  const formIds = [
    "#form-name",
    "#form-platform",
    "#form-rigger",
    "#form-character",
    "#form-schedule"
  ];

  formIds.forEach(selector => {
    const el = document.querySelector(selector);
    if (el) el.value = "";
  });

  const typeInputs = document.querySelectorAll('input[name="form-type"]');
  typeInputs.forEach((input, index) => {
    input.checked = index === 0;
  });

  document.querySelectorAll('input[name="form-parts"], input[name="form-options"]').forEach(input => {
    input.checked = false;
  });

  updateFormEstimate(rows);
}

/* =========================
   init
========================= */

async function initFormSection() {
  try {
    const rows = await getFormPriceRows();

    renderFormOptionLists(rows);
    updateFormEstimate(rows);

    document.addEventListener("change", event => {
      const target = event.target;
      if (
        target.matches('input[name="form-type"]') ||
        target.matches('input[name="form-parts"]') ||
        target.matches('input[name="form-options"]')
      ) {
        updateFormEstimate(rows);
      }
    });

    const copyBtn = document.querySelector("#form-copy-btn");
    const resetBtn = document.querySelector("#form-reset-btn");

    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        try {
          await copyFormTemplate(rows);
          copyBtn.textContent = "복사 완료!";
          setTimeout(() => {
            copyBtn.textContent = "양식 복사";
          }, 1400);
        } catch (error) {
          console.error("[form copy] failed:", error);
          alert("복사에 실패했습니다. 다시 시도해주세요.");
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        resetFormSection(rows);
      });
    }
  } catch (error) {
    console.error("[initFormSection] failed:", error);
  }
}

document.addEventListener("DOMContentLoaded", initFormSection);

/* =========================
   collab helpers
========================= */

function formatCollabDiscount(value = "") {
  const amount = Number(String(value).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return "";

  return `${amount.toLocaleString("ko-KR")}원 할인`;
}

function normalizeCollabRows(rows = []) {
  return rows
    .filter(row => row && (row.name || row.desc || row.discount || row.link || row.thumb))
    .map((row, index) => ({
      order: Number(row.order || index + 1) || index + 1,
      name: String(row.name || "").trim(),
      desc: String(row.desc || "").trim(),
      discount: formatCollabDiscount(row.discount || ""),
      link: String(row.link || "").trim(),
      thumb: driveToDirectUrl(row.thumb || "")
    }))
    .sort((a, b) => a.order - b.order);
}

/* =========================
   collab templates
========================= */

function createCollabThumb(item) {
  if (item.thumb) {
    return `
      <div class="collab-thumb">
        <img src="${item.thumb}" alt="<span class="aa-text">${escapeHtml(item.name)}</span> 썸네일" loading="lazy">
      </div>
    `;
  }

  return `
    <div class="collab-thumb is-empty">
      <div class="collab-thumb__empty">이미지 준비중입니다</div>
    </div>
  `;
}

function createCollabLink(item) {
  if (item.link) {
    return `
      <a class="collab-link" href="<span class="aa-text">${escapeHtml(item.link)}</span>" target="_blank" rel="noopener noreferrer">
        작가님 페이지 보러가기
      </a>
    `;
  }

  return `
    <span class="collab-link is-disabled">
      <span class="collab-link__icon">·</span>
      링크 준비중
    </span>
  `;
}

function createCollabCard(item) {
  return `
    <article class="collab-card">
      ${createCollabThumb(item)}

      <div class="collab-card__body">
        <div class="collab-card__top">
          <h3 class="collab-name"><span class="aa-text">${escapeHtml(item.name)}</span></h3>
          ${item.discount ? `<span class="collab-discount"><span class="aa-text">${escapeHtml(item.discount)}</span></span>` : ""}
        </div>

        <p class="collab-text"><span class="aa-text">${nl2br(item.desc)}</span></p>

        <div class="collab-actions">
          ${createCollabLink(item)}
        </div>
      </div>
    </article>
  `;
}

function createCollabSectionTemplate(collabRows = []) {
  if (!collabRows.length) {
    return `<div class="collab-empty">등록된 협력 작가 정보가 없습니다.</div>`;
  }

  return `
    <div class="collab-wrap">
      <section class="collab-panel">
        <div class="collab-obj obj-a" aria-hidden="true"></div>
        <div class="collab-obj obj-b" aria-hidden="true"></div>
        <div class="collab-obj obj-c" aria-hidden="true"></div>

        <div class="collab-head">
          <span class="collab-badge">collab artist</span>

          <div class="collab-dots" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>

          <h2 class="collab-title">협력 작가</h2>
        </div>

        <div class="collab-body">
          <div class="collab-grid">
            ${collabRows.map(createCollabCard).join("")}
          </div>
        </div>
      </section>
    </div>
  `;
}

/* =========================
   collab renderer
========================= */

function renderCollabSection(targetSelector, rows) {
  const target = document.querySelector(targetSelector);
  if (!target) {
    console.warn(`[renderCollabSection] target not found: ${targetSelector}`);
    return;
  }

  const normalizedRows = normalizeCollabRows(rows);
  target.innerHTML = createCollabSectionTemplate(normalizedRows);
}

/* =========================
   init
========================= */

async function initCollabSection() {
  try {
    const rows = await fetchSheetCsv(SHEET_URLS.collab);
    renderCollabSection("#collab", rows);
  } catch (error) {
    console.error("[initCollabSection] failed:", error);

    const target = document.querySelector("#collab");
    if (target) {
      target.innerHTML = `
        <div class="collab-error">
          협력 작가 데이터를 불러오지 못했습니다.
        </div>
      `;
    }
  }
}

document.addEventListener("DOMContentLoaded", initCollabSection);


/* =========================
   portfolio helpers
========================= */

function normalizePortfolioRows(rows = []) {
  return rows
    .filter(row => row && (row.title || row.desc || row.image_url))
    .map((row, index) => ({
      order: Number(row.order || index + 1) || index + 1,
      title: String(row.title || "").trim(),
      desc: String(row.desc || "").trim(),
      imageUrl: driveToDirectUrl(row.image_url || "")
    }))
    .sort((a, b) => a.order - b.order);
}

function getPortfolioMaxIndex(length, visibleCount = 3) {
  return Math.max(0, length - visibleCount);
}

function clampPortfolioIndex(index, length, visibleCount = 3) {
  const maxIndex = getPortfolioMaxIndex(length, visibleCount);
  return Math.min(Math.max(0, index), maxIndex);
}

/* =========================
   portfolio templates
========================= */

function createPortfolioCard(item) {
  return `
    <article class="portfolio-item" data-portfolio-item data-order="${item.order}">
      <div class="portfolio-card">
        <a
          class="portfolio-card__media"
          href="${item.imageUrl}"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="<span class="aa-text">${escapeHtml(item.title)}</span> 이미지 크게 보기"
        >
          <img src="${item.imageUrl}" alt="<span class="aa-text">${escapeHtml(item.title)}</span> 포트폴리오 이미지" loading="lazy">
        </a>

        <div class="portfolio-card__body">
          <div class="portfolio-card__top">
            <h3 class="portfolio-card__title"><span class="aa-text">${escapeHtml(item.title)}</span></h3>
          </div>

          <p class="portfolio-card__desc"><span class="aa-text">${nl2br(item.desc)}</span></p>
        </div>
      </div>
    </article>
  `;
}

function createPortfolioDots(items = []) {
  return items
    .map((_, index) => `<button type="button" class="portfolio-dot" data-portfolio-dot="${index}" aria-label="${index + 1}번째 슬라이드로 이동"></button>`)
    .join("");
}

function createPortfolioSectionTemplate(portfolioRows = []) {
  if (!portfolioRows.length) {
    return `<div class="portfolio-empty">등록된 포트폴리오 정보가 없습니다.</div>`;
  }

  return `
    <div class="portfolio-wrap">
      <section class="portfolio-panel">
        <div class="portfolio-obj obj-a" aria-hidden="true"></div>
        <div class="portfolio-obj obj-b" aria-hidden="true"></div>
        <div class="portfolio-obj obj-c" aria-hidden="true"></div>

        <div class="portfolio-head">
          <div class="portfolio-head__copy">
            <span class="portfolio-badge">portfolio</span>

            <div class="portfolio-dots" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </div>

            <h2 class="portfolio-title">포트폴리오</h2>
            <p class="portfolio-desc">
              이미지를 클릭하면 새 창에서 크게 볼 수 있습니다.
            </p>
          </div>

          <div class="portfolio-nav">
            <button type="button" class="portfolio-nav__btn is-prev" data-portfolio-prev aria-label="이전 슬라이드">‹</button>
            <button type="button" class="portfolio-nav__btn is-next" data-portfolio-next aria-label="다음 슬라이드">›</button>
          </div>
        </div>

        <div class="portfolio-body">
          <div class="portfolio-slider" data-portfolio-slider>
            <div class="portfolio-viewport">
              <div class="portfolio-track" data-portfolio-track>
                ${portfolioRows.map(createPortfolioCard).join("")}
              </div>
            </div>

            <div class="portfolio-pagination">
              ${createPortfolioDots(portfolioRows)}
            </div>
          </div>
        </div>
      </section>
    </div>
  `;
}

/* =========================
   portfolio slider
========================= */

function updatePortfolioSliderState(root) {
  if (!root) return;

  const section = root.closest("#portfolio");
  const track = root.querySelector("[data-portfolio-track]");
  const items = Array.from(root.querySelectorAll("[data-portfolio-item]"));
  const dots = Array.from(root.querySelectorAll("[data-portfolio-dot]"));
  const prevBtn = section ? section.querySelector("[data-portfolio-prev]") : null;
  const nextBtn = section ? section.querySelector("[data-portfolio-next]") : null;

  if (!track || !items.length) return;

  const visibleCount = 3;
  const total = items.length;
  const current = clampPortfolioIndex(
    Number(root.dataset.currentIndex || 0),
    total,
    visibleCount
  );

  root.dataset.currentIndex = String(current);

  const itemWidth = items[0].getBoundingClientRect().width;
  const trackStyle = window.getComputedStyle(track);
  const gap = parseFloat(trackStyle.columnGap || trackStyle.gap || "0") || 0;
  const translateX = (itemWidth + gap) * current;

  track.style.transform = `translate3d(${-translateX}px, 0, 0)`;

  const activeIndex = Math.min(current + 1, total - 1);

  items.forEach((item, index) => {
    item.classList.toggle("is-active", index === activeIndex);
    item.classList.toggle("is-side", index !== activeIndex);
  });

  dots.forEach((dot, index) => {
    dot.classList.toggle("is-active", index === activeIndex);
  });

  const maxIndex = getPortfolioMaxIndex(total, visibleCount);

  if (prevBtn) {
    prevBtn.disabled = current <= 0;
    prevBtn.style.visibility = total <= visibleCount ? "hidden" : "visible";
  }

  if (nextBtn) {
    nextBtn.disabled = current >= maxIndex;
    nextBtn.style.visibility = total <= visibleCount ? "hidden" : "visible";
  }
}

function setupPortfolioSlider(root) {
  if (!root) return;

  const section = root.closest("#portfolio");
  const prevBtn = section ? section.querySelector("[data-portfolio-prev]") : null;
  const nextBtn = section ? section.querySelector("[data-portfolio-next]") : null;
  const dots = Array.from(root.querySelectorAll("[data-portfolio-dot]"));

  root.dataset.currentIndex = "0";
  updatePortfolioSliderState(root);

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      const current = Number(root.dataset.currentIndex || 0);
      root.dataset.currentIndex = String(current - 1);
      updatePortfolioSliderState(root);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      const current = Number(root.dataset.currentIndex || 0);
      root.dataset.currentIndex = String(current + 1);
      updatePortfolioSliderState(root);
    });
  }

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      const items = root.querySelectorAll("[data-portfolio-item]");
      const visibleCount = 3;
      const targetStartIndex = clampPortfolioIndex(index - 1, items.length, visibleCount);
      root.dataset.currentIndex = String(targetStartIndex);
      updatePortfolioSliderState(root);
    });
  });

  window.addEventListener("resize", () => {
    updatePortfolioSliderState(root);
  });
}

/* =========================
   portfolio renderer
========================= */

function renderPortfolioSection(targetSelector, rows) {
  const target = document.querySelector(targetSelector);
  if (!target) {
    console.warn(`[renderPortfolioSection] target not found: ${targetSelector}`);
    return;
  }

  const normalizedRows = normalizePortfolioRows(rows);

  if (!normalizedRows.length) {
    target.innerHTML = `<div class="portfolio-empty">표시할 포트폴리오 데이터가 없습니다.</div>`;
    return;
  }

  target.innerHTML = createPortfolioSectionTemplate(normalizedRows);

  const sliderRoot = target.querySelector("[data-portfolio-slider]");
  setupPortfolioSlider(sliderRoot);
}

/* =========================
   init
========================= */

async function initPortfolioSection() {
  try {
    const rows = await fetchSheetCsv(SHEET_URLS.portfolio);
    renderPortfolioSection("#portfolio", rows);
  } catch (error) {
    console.error("[initPortfolioSection] failed:", error);

    const target = document.querySelector("#portfolio");
    if (target) {
      target.innerHTML = `
        <div class="portfolio-error">
          포트폴리오 데이터를 불러오지 못했습니다.
        </div>
      `;
    }
  }
}

document.addEventListener("DOMContentLoaded", initPortfolioSection);