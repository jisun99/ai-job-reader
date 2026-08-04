const state = {
  jobs: [],
  sourceHealth: [],
  query: "",
  source: "all",
  field: "all",
  career: "all",
  sort: "deadline",
};

const els = {
  totalJobs: document.querySelector("#totalJobs"),
  juniorJobs: document.querySelector("#juniorJobs"),
  soonJobs: document.querySelector("#soonJobs"),
  updatedAt: document.querySelector("#updatedAt"),
  resultCount: document.querySelector("#resultCount"),
  sourceFilter: document.querySelector("#sourceFilter"),
  fieldFilter: document.querySelector("#fieldFilter"),
  sortSelect: document.querySelector("#sortSelect"),
  searchInput: document.querySelector("#searchInput"),
  jobList: document.querySelector("#jobList"),
  emptyState: document.querySelector("#emptyState"),
  sourceList: document.querySelector("#sourceList"),
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

  populateFilters();
  bindEvents();
  render(data.generatedAt);
}

function populateFilters() {
  const sources = unique(state.jobs.map((job) => job.source).filter(Boolean));
  const fields = unique(state.jobs.flatMap((job) => job.fields || []));

  els.sourceFilter.innerHTML = [
    option("all", "전체 출처"),
    ...sources.map((source) => option(source, source)),
  ].join("");

  els.fieldFilter.innerHTML = [
    option("all", "전체 분야"),
    ...fields.map((field) => option(field, field)),
  ].join("");
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

  if (generatedAt) {
    els.updatedAt.textContent = `마지막 갱신: ${formatDate.format(new Date(generatedAt))}`;
  }

  els.resultCount.textContent = `${filtered.length.toLocaleString("ko-KR")}개 표시`;
  els.jobList.innerHTML = filtered.map(renderJobCard).join("");
  els.emptyState.hidden = filtered.length > 0;
  renderSources();
}

function applyFilters(jobs) {
  return jobs
    .filter((job) => {
      if (state.source !== "all" && job.source !== state.source) return false;
      if (state.field !== "all" && !(job.fields || []).includes(state.field)) return false;
      if (state.career !== "all" && job.careerGroup !== state.career) return false;
      if (!state.query) return true;

      const haystack = [
        job.title,
        job.company,
        job.location,
        job.career,
        job.education,
        job.employmentType,
        ...(job.fields || []),
        ...(job.skills || []),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(state.query);
    })
    .sort(sortJobs);
}

function sortJobs(a, b) {
  if (state.sort === "company") return safe(a.company).localeCompare(safe(b.company), "ko");
  if (state.sort === "recent") return safeDate(b.collectedAt) - safeDate(a.collectedAt);
  return safeDeadline(a.deadline) - safeDeadline(b.deadline);
}

function renderJobCard(job) {
  const fields = (job.fields || []).slice(0, 4);
  const skills = (job.skills || []).slice(0, 5);

  return `
    <article class="job-card">
      <div class="job-main">
        <div class="job-topline">
          <span class="source-badge">${escapeHtml(job.source)}</span>
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
  const defaults = [
    ["잡코리아", "https://www.jobkorea.co.kr/Search/?stext=AI%20%EB%A8%B8%EC%8B%A0%EB%9F%AC%EB%8B%9D"],
    ["사람인", "https://www.saramin.co.kr/zf_user/search/recruit?searchword=AI%20%EB%A8%B8%EC%8B%A0%EB%9F%AC%EB%8B%9D"],
    ["자소설닷컴", "https://jasoseol.com/recruit"],
    ["직행", "https://zighang.com/ai"],
  ];

  els.sourceList.innerHTML = defaults
    .map(([name, url]) => {
      const health = healthByName.get(name);
      const count = state.jobs.filter((job) => job.source === name).length;
      const status = health?.ok
        ? `${count}개 수집됨`
        : count
          ? `${count}개 수집, 일부 확인 필요`
          : "검색 페이지 연결";

      return `
        <article class="source-card">
          <div>
            <span class="source-status">${escapeHtml(status)}</span>
            <h3>${escapeHtml(name)}</h3>
            <p>${escapeHtml(sourceDescription(name))}</p>
          </div>
          <a class="source-link" href="${escapeAttribute(url)}" target="_blank" rel="noreferrer">원문 검색</a>
        </article>
      `;
    })
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
