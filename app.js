const state = {
  jobs: [],
  sourceHealth: [],
  discoverySources: [],
  careerPortals: [],
  query: "",
  source: "all",
  field: "all",
  companyType: "all",
  keyword: "all",
  career: "all",
  sort: "deadline",
};

const els = {
  totalJobs: document.querySelector("#totalJobs"),
  juniorJobs: document.querySelector("#juniorJobs"),
  soonJobs: document.querySelector("#soonJobs"),
  channelCount: document.querySelector("#channelCount"),
  updatedAt: document.querySelector("#updatedAt"),
  resultCount: document.querySelector("#resultCount"),
  sourceFilter: document.querySelector("#sourceFilter"),
  fieldFilter: document.querySelector("#fieldFilter"),
  companyTypeFilter: document.querySelector("#companyTypeFilter"),
  keywordFilter: document.querySelector("#keywordFilter"),
  sortSelect: document.querySelector("#sortSelect"),
  searchInput: document.querySelector("#searchInput"),
  filterSummary: document.querySelector("#filterSummary"),
  jobList: document.querySelector("#jobList"),
  emptyState: document.querySelector("#emptyState"),
  sourceList: document.querySelector("#sourceList"),
  discoveryList: document.querySelector("#discoveryList"),
  careerPortalList: document.querySelector("#careerPortalList"),
  portalCount: document.querySelector("#portalCount"),
};

const formatDate = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
});

async function init() {
  const response = await fetch("./public/jobs.json", { cache: "no-store" });
  const data = await response.json();
  state.jobs = Array.isArray(data.jobs) ? data.jobs : [];
  state.sourceHealth = Array.isArray(data.sourceHealth) ? data.sourceHealth : [];
  state.discoverySources = Array.isArray(data.discoverySources) ? data.discoverySources : [];
  state.careerPortals = Array.isArray(data.careerPortals) ? data.careerPortals : [];

  populateFilters();
  bindEvents();
  render(data.generatedAt);
}

function populateFilters() {
  refreshFilterOptions();
}

function bindEvents() {
  els.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    render();
  });

  els.sourceFilter.addEventListener("change", (event) => {
    state.source = event.target.value;
    render();
  });

  els.fieldFilter.addEventListener("change", (event) => {
    state.field = event.target.value;
    render();
  });

  els.companyTypeFilter.addEventListener("change", (event) => {
    state.companyType = event.target.value;
    render();
  });

  els.keywordFilter.addEventListener("change", (event) => {
    state.keyword = event.target.value;
    render();
  });

  els.sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    render();
  });

  document.querySelectorAll(".segment").forEach((button) => {
    button.addEventListener("click", () => {
      document
        .querySelectorAll(".segment")
        .forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.career = button.dataset.career;
      render();
    });
  });
}

function render(generatedAt) {
  const filtered = applyFilters(state.jobs);

  els.totalJobs.textContent = state.jobs.length.toLocaleString("ko-KR");
  els.juniorJobs.textContent = state.jobs
    .filter((job) => job.careerGroup === "junior" || job.careerGroup === "intern")
    .length.toLocaleString("ko-KR");
  els.soonJobs.textContent = state.jobs.filter(isClosingSoon).length.toLocaleString("ko-KR");
  els.channelCount.textContent = (
    state.sourceHealth.length +
    state.discoverySources.length +
    state.careerPortals.length
  ).toLocaleString("ko-KR");

  if (generatedAt) {
    els.updatedAt.textContent = `마지막 갱신: ${formatDate.format(new Date(generatedAt))}`;
  }

  els.resultCount.textContent = `${filtered.length.toLocaleString("ko-KR")}개 표시`;
  els.filterSummary.textContent = `현재 조건에 맞는 공고 ${filtered.length.toLocaleString("ko-KR")}개`;
  els.jobList.innerHTML = filtered.map(renderJobCard).join("");
  els.emptyState.hidden = filtered.length > 0;
  refreshFilterOptions();
  refreshCareerCounts();
  renderSources();
  renderCareerPortals();
}

function applyFilters(jobs, overrides = {}) {
  const filters = { ...state, ...overrides };
  return jobs
    .filter((job) => {
      if (filters.source !== "all" && job.source !== filters.source) return false;
      if (filters.field !== "all" && !(job.fields || []).includes(filters.field)) return false;
      if (filters.companyType !== "all" && (job.companyType || "분류 필요") !== filters.companyType) return false;
      if (filters.keyword !== "all" && !(job.focusKeywords || []).includes(filters.keyword)) return false;
      if (filters.career !== "all" && job.careerGroup !== filters.career) return false;
      if (!filters.query) return true;

      const haystack = [
        job.title,
        job.company,
        job.location,
        job.career,
        job.education,
        job.employmentType,
        job.companyType,
        ...(job.fields || []),
        ...(job.skills || []),
        ...(job.focusKeywords || []),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(filters.query);
    })
    .sort(sortJobs);
}

function refreshFilterOptions() {
  const sourceOptions = unique(state.jobs.map((job) => job.source).filter(Boolean));
  const fieldOptions = unique(state.jobs.flatMap((job) => job.fields || []));
  const companyTypeOptions = ["대기업", "중견기업", "중소기업", "스타트업", "분류 필요"];
  const keywordOptions = unique(state.jobs.flatMap((job) => job.focusKeywords || []));

  setSelectOptions(els.sourceFilter, "전체 출처", sourceOptions, "source");
  setSelectOptions(els.fieldFilter, "전체 분야", fieldOptions, "field");
  setSelectOptions(els.companyTypeFilter, "전체 규모", companyTypeOptions, "companyType");
  setSelectOptions(els.keywordFilter, "전체 키워드", keywordOptions, "keyword");
}

function setSelectOptions(selectEl, allLabel, values, key) {
  const currentValue = state[key];
  const labels = [
    option("all", `${allLabel} (${countForFilter(key, "all")})`),
    ...values.map((value) => option(value, `${value} (${countForFilter(key, value)})`)),
  ];

  selectEl.innerHTML = labels.join("");
  selectEl.value = values.includes(currentValue) || currentValue === "all" ? currentValue : "all";
}

function refreshCareerCounts() {
  document.querySelectorAll("[data-career-count]").forEach((countEl) => {
    const value = countEl.dataset.careerCount;
    countEl.textContent = countForFilter("career", value).toLocaleString("ko-KR");
  });
}

function countForFilter(key, value) {
  return applyFilters(state.jobs, { [key]: value }).length;
}

function sortJobs(a, b) {
  if (state.sort === "company") return safe(a.company).localeCompare(safe(b.company), "ko");
  if (state.sort === "recent") return safeDate(b.collectedAt) - safeDate(a.collectedAt);
  return safeDeadline(a.deadline) - safeDeadline(b.deadline);
}

function renderJobCard(job) {
  const focusKeywords = (job.focusKeywords || []).slice(0, 5);
  const usedTags = new Set(focusKeywords);
  const fields = (job.fields || []).filter((field) => !usedTags.has(field)).slice(0, 4);
  fields.forEach((field) => usedTags.add(field));
  const skills = (job.skills || []).filter((skill) => !usedTags.has(skill)).slice(0, 5);

  return `
    <article class="job-card">
      <div class="job-main">
        <div class="job-topline">
          <span class="source-badge">${escapeHtml(job.source)}</span>
          <span class="company-type-badge">${escapeHtml(job.companyType || "분류 필요")}</span>
          <span class="deadline-badge">${escapeHtml(deadlineLabel(job.deadline))}</span>
        </div>
        <h3>${escapeHtml(job.title)}</h3>
        <p class="company">${escapeHtml(job.company)}</p>
        <div class="job-meta">
          ${metaBox("경력", job.career)}
          ${metaBox("학력", job.education)}
          ${metaBox("근무지", job.location)}
          ${metaBox("고용형태", job.employmentType)}
        </div>
        <div class="tags">
          ${focusKeywords.map((keyword) => `<span class="keyword-tag">${escapeHtml(keyword)}</span>`).join("")}
          ${fields.map((field) => `<span class="tag">${escapeHtml(field)}</span>`).join("")}
          ${skills.map((skill) => `<span class="tag">${escapeHtml(skill)}</span>`).join("")}
        </div>
      </div>
      <div class="job-actions">
        <a class="apply-link" href="${escapeAttribute(job.url)}" target="_blank" rel="noreferrer">지원하기</a>
      </div>
    </article>
  `;
}

function renderSources() {
  const healthByName = new Map(state.sourceHealth.map((item) => [item.name, item]));

  els.sourceList.innerHTML = state.sourceHealth
    .map((health) => {
      const name = health.name;
      const url = health.url;
      const count = state.jobs.filter((job) => job.source === name).length;
      const status = health?.ok
        ? `${count.toLocaleString("ko-KR")}개 수집됨`
        : count
          ? `${count}개 수집, 일부 확인 필요`
          : "직접 확인 필요";

      return `
        <article class="source-card">
          <div>
            <span class="source-status">${escapeHtml(status)}</span>
            <h3>${escapeHtml(name)}</h3>
            <p>${escapeHtml(health.message || sourceDescription(name))}</p>
          </div>
          <a class="source-link" href="${escapeAttribute(url)}" target="_blank" rel="noreferrer">원문 검색</a>
        </article>
      `;
    })
    .join("");

  els.discoveryList.innerHTML = state.discoverySources
    .map((source) => `
      <article class="source-card discovery-card">
        <div>
          <span class="source-status">탐색 링크</span>
          <h3>${escapeHtml(source.name)}</h3>
          <p>${escapeHtml(source.description)}</p>
        </div>
        <a class="source-link" href="${escapeAttribute(source.url)}" target="_blank" rel="noreferrer">열기</a>
      </article>
    `)
    .join("");
}

function renderCareerPortals() {
  els.portalCount.textContent = `${state.careerPortals.length.toLocaleString("ko-KR")}개 채널`;
  els.careerPortalList.innerHTML = state.careerPortals
    .map((portal) => `
      <a class="portal-link" href="${escapeAttribute(portal.url)}" target="_blank" rel="noreferrer">
        <span>${escapeHtml(portal.name)}</span>
        <small>AI / ML / Data 검색</small>
      </a>
    `)
    .join("");
}

function sourceDescription(name) {
  return {
    잡코리아: "AI, ML, 데이터 직무 검색 결과에서 공개 공고를 읽습니다.",
    사람인: "AI 머신러닝 검색 결과를 기준으로 회사와 자격요건을 확인합니다.",
    자소설닷컴: "대기업, 공채, 채용 캘린더 기반 공고 확인에 사용합니다.",
    직행: "AI·데이터 전용 채용 페이지와 개별 공고 링크를 참고합니다.",
  }[name];
}

function metaBox(label, value) {
  return `
    <div class="meta-box">
      <span class="meta-label">${label}</span>
      <span class="meta-value">${escapeHtml(value || "확인 필요")}</span>
    </div>
  `;
}

function option(value, label) {
  return `<option value="${escapeAttribute(value)}">${escapeHtml(label)}</option>`;
}

function deadlineLabel(deadline) {
  if (!deadline) return "마감 확인";
  if (deadline === "상시채용" || deadline === "채용시마감") return deadline;
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return deadline;

  const days = Math.ceil((date - Date.now()) / 86400000);
  if (days < 0) return "마감 가능";
  if (days === 0) return "오늘 마감";
  if (days <= 7) return `D-${days}`;
  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function isClosingSoon(job) {
  const time = safeDeadline(job.deadline);
  if (!Number.isFinite(time)) return false;
  const days = Math.ceil((time - Date.now()) / 86400000);
  return days >= 0 && days <= 7;
}

function safeDeadline(value) {
  if (!value) return Number.POSITIVE_INFINITY;
  if (value === "상시채용" || value === "채용시마감") return Number.POSITIVE_INFINITY - 1;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

function safeDate(value) {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function safe(value) {
  return value || "";
}

function unique(items) {
  return [...new Set(items)].sort((a, b) => a.localeCompare(b, "ko"));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

init().catch((error) => {
  els.updatedAt.textContent = "데이터를 불러오지 못했습니다.";
  els.emptyState.hidden = false;
  els.emptyState.textContent = error.message;
});
