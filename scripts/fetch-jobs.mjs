import { writeFile } from "node:fs/promises";

const OUT_FILE = new URL("../public/jobs.json", import.meta.url);
const collectedAt = new Date().toISOString();

const SEARCH_KEYWORDS = [
  "AI 머신러닝",
  "HD현대 AI",
  "HD현대 연구직",
  "Physical AI",
  "Vision AI",
  "LLM",
  "딥러닝",
  "컴퓨터비전",
  "MLOps",
  "Data Scientist",
  "Data Engineer",
  "AI Research",
  "NLP",
  "추천시스템",
  "생성형 AI",
  "Foundation Model",
];

const CURATED_JOBS = [
  {
    id: "curated-hdhyundai-2026-07-research-hdksoe",
    source: "HD현대 공식/캐치",
    company: "HD한국조선해양",
    title: "[HD현대] 2026년 7월 연구직 채용 - AI/Physical AI/제조 AI",
    url: "https://recruit.hd.com/",
    career: "신입·경력",
    careerGroup: "junior",
    education: "석사↑",
    location: "경기 성남시 분당구, 울산",
    employmentType: "정규직",
    deadline: "2026-08-10",
    fields: ["Physical AI", "Vision AI", "제조 AI", "머신러닝", "AI Research"],
    skills: ["Python", "C++"],
    companyType: "대기업",
    focusKeywords: ["Physical AI", "Vision AI", "Manufacturing AI", "Robotics"],
    collectedAt,
  },
  {
    id: "curated-hdhyundai-2026-07-research-hhi",
    source: "HD현대 공식/캐치",
    company: "HD현대중공업",
    title: "[HD현대] 2026년 7월 연구직 채용 - AI/AX 엔지니어·빅데이터·자율제어",
    url: "https://recruit.hd.com/",
    career: "신입·경력",
    careerGroup: "junior",
    education: "석사↑",
    location: "울산 동구, 경기 성남시 분당구",
    employmentType: "정규직",
    deadline: "2026-08-10",
    fields: ["AI/AX", "Data Engineering", "Physical AI", "AI Research"],
    skills: ["Python", "C++", "Java"],
    companyType: "대기업",
    focusKeywords: ["Physical AI", "Industrial AI", "Robotics", "Data Engineering"],
    collectedAt,
  },
];

const AI_KEYWORDS = [
  "AI",
  "인공지능",
  "머신러닝",
  "Machine Learning",
  "ML",
  "딥러닝",
  "Deep Learning",
  "LLM",
  "NLP",
  "Computer Vision",
  "컴퓨터비전",
  "MLOps",
  "데이터 사이언스",
  "Data Scientist",
  "Data Engineer",
  "추천시스템",
  "생성형",
  "Foundation Model",
  "RAG",
];

const NON_AI_WORDS = [
  "마케팅",
  "영업",
  "회계",
  "총무",
  "인사",
  "CS",
  "고객상담",
  "강사",
  "기계설비",
  "이벤트",
  "상품기획",
];

const NON_JOB_TITLE_WORDS = [
  "교육생",
  "교육 과정",
  "국비지원",
  "부트캠프",
  "수강생",
  "훈련생",
];

const PLATFORM_SOURCES = [
  {
    name: "잡코리아",
    homepage: "https://www.jobkorea.co.kr",
    urls: SEARCH_KEYWORDS.map((keyword) =>
      `https://www.jobkorea.co.kr/Search/?stext=${encodeURIComponent(keyword)}`,
    ),
    parse: parseJobKorea,
    maxJobs: 140,
  },
  {
    name: "사람인",
    homepage: "https://www.saramin.co.kr",
    urls: SEARCH_KEYWORDS.map((keyword) =>
      `https://www.saramin.co.kr/zf_user/search/recruit?searchword=${encodeURIComponent(keyword)}`,
    ),
    parse: parseSaramin,
    maxJobs: 160,
  },
];

const OFFICIAL_API_SOURCES = [
  {
    name: "Moloco Careers",
    company: "Moloco",
    url: "https://boards-api.greenhouse.io/v1/boards/moloco/jobs?content=true",
    homepage: "https://www.moloco.com/careers",
    parse: parseGreenhouse,
    maxJobs: 40,
  },
  {
    name: "Sendbird Careers",
    company: "Sendbird",
    url: "https://boards-api.greenhouse.io/v1/boards/sendbird/jobs?content=true",
    homepage: "https://sendbird.com/careers",
    parse: parseGreenhouse,
    maxJobs: 40,
  },
];

const DISCOVERY_SOURCES = [
  {
    name: "HD현대 공식 채용",
    url: "https://recruit.hd.com/",
    description: "HD현대그룹 연구직, AI, Physical AI, 제조 AI 공고를 공식 채용관에서 확인합니다.",
  },
  {
    name: "캐치 HD현대 연구직",
    url: "https://www.catch.co.kr/NCS/RecruitInfoDetails/563682",
    description: "HD한국조선해양 2026년 7월 연구직 채용 상세와 지원 정보를 확인합니다.",
  },
  {
    name: "원티드",
    url: "https://www.wanted.co.kr/search?query=AI&tab=position",
    description: "스타트업과 테크 기업의 AI, 데이터, ML 직무를 검색합니다.",
  },
  {
    name: "점핏",
    url: "https://www.jumpit.co.kr/search?keyword=AI",
    description: "개발자 채용 중심 플랫폼에서 AI 관련 공고를 확인합니다.",
  },
  {
    name: "프로그래머스 커리어",
    url: "https://career.programmers.co.kr/job?keywords=AI",
    description: "개발자 채용 공고와 코딩 테스트 기반 채용을 확인합니다.",
  },
  {
    name: "랠릿",
    url: "https://www.rallit.com/positions?keyword=AI",
    description: "IT 직군 채용 페이지에서 AI 키워드 공고를 탐색합니다.",
  },
  {
    name: "로켓펀치",
    url: "https://www.rocketpunch.com/jobs?keywords=AI",
    description: "스타트업 채용 공고 중 AI, 데이터 직군을 확인합니다.",
  },
  {
    name: "직행",
    url: "https://zighang.com/ai",
    description: "AI·데이터 전용 채용공고 페이지를 바로 엽니다.",
  },
  {
    name: "자소설닷컴",
    url: "https://jasoseol.com/recruit",
    description: "대기업, 공채, 인턴 채용 캘린더를 함께 확인합니다.",
  },
  {
    name: "LinkedIn",
    url: "https://www.linkedin.com/jobs/search/?keywords=AI%20Machine%20Learning&location=South%20Korea",
    description: "국내외 기업의 한국 AI 직무를 함께 탐색합니다.",
  },
  {
    name: "Worknet",
    url: "https://www.work.go.kr/empInfo/empInfoSrch/list/dtlEmpSrchList.do?keyword=AI",
    description: "공공 고용정보 채널의 AI 관련 공고를 확인합니다.",
  },
  {
    name: "인크루트",
    url: "https://search.incruit.com/list/search.asp?col=job&kw=AI",
    description: "전통 채용 포털의 AI, 데이터 검색 결과를 보조로 확인합니다.",
  },
];

const CAREER_PORTALS = [
  ["HD현대 공식 채용", "https://recruit.hd.com/"],
  ["HD한국조선해양", "https://www.hd-ksoe.com/"],
  ["HD현대중공업", "https://www.hhi.co.kr/"],
  ["NAVER Careers", "https://recruit.navercorp.com/"],
  ["Kakao Careers", "https://careers.kakao.com/"],
  ["LINE Careers", "https://careers.linecorp.com/ko/"],
  ["Coupang Careers", "https://www.coupang.jobs/kr/"],
  ["Toss Careers", "https://toss.im/career"],
  ["Upstage Careers", "https://www.upstage.ai/careers"],
  ["Rebellions Careers", "https://rebellions.ai/careers"],
  ["Lunit Careers", "https://www.lunit.io/careers"],
  ["Moloco Careers", "https://www.moloco.com/careers"],
  ["Sendbird Careers", "https://sendbird.com/careers"],
  ["Wrtn Careers", "https://wrtn.career.greetinghr.com/"],
  ["Scatter Lab Careers", "https://scatterlab.co.kr/careers/"],
  ["LG AI Research Careers", "https://www.lgresearch.ai/careers"],
  ["Samsung Research Careers", "https://research.samsung.com/careers"],
  ["Hyundai Motor Careers", "https://talent.hyundai.com/"],
  ["SK telecom Careers", "https://careers.sktelecom.com/"],
  ["KT Careers", "https://recruit.kt.com/"],
  ["NCSOFT Careers", "https://careers.ncsoft.com/"],
  ["Nexon Careers", "https://career.nexon.com/"],
  ["KakaoBank Careers", "https://recruit.kakaobank.com/"],
  ["DeepSearch Careers", "https://deepsearch.com/career"],
  ["ScatterLab / Pingpong", "https://scatterlab.co.kr/careers/"],
  ["OpenAI Careers", "https://openai.com/careers/search/"],
  ["Google Careers", "https://www.google.com/about/careers/applications/jobs/results/?q=AI&location=South%20Korea"],
].map(([name, url]) => ({ name, url }));

const sourceHealth = [];
const jobs = CURATED_JOBS.map(normalizeJob);

sourceHealth.push({
  name: "핵심 공식 공고",
  ok: CURATED_JOBS.length > 0,
  count: CURATED_JOBS.length,
  message: "HD현대 등 공식 채용관에서 확인된 중요 공고를 별도 반영",
  url: "https://recruit.hd.com/",
});

for (const source of PLATFORM_SOURCES) {
  const sourceJobs = [];
  const errors = [];

  for (const url of source.urls) {
    try {
      const html = await fetchText(url);
      sourceJobs.push(...source.parse(html, source, url));
    } catch (error) {
      errors.push(`${url}: ${error.message}`);
    }
  }

  const aiJobs = dedupe(sourceJobs.filter(isAiRole)).slice(0, source.maxJobs);
  jobs.push(...aiJobs);
  sourceHealth.push({
    name: source.name,
    ok: aiJobs.length > 0,
    count: aiJobs.length,
    message: aiJobs.length
      ? `${source.urls.length}개 키워드 검색 완료`
      : errors[0] || "AI 공고를 찾지 못했습니다.",
    url: source.homepage,
  });
}

for (const source of OFFICIAL_API_SOURCES) {
  try {
    const json = await fetchJson(source.url);
    const aiJobs = source.parse(json, source).filter(isAiRole).slice(0, source.maxJobs);
    jobs.push(...aiJobs);
    sourceHealth.push({
      name: source.name,
      ok: aiJobs.length > 0,
      count: aiJobs.length,
      message: aiJobs.length ? "회사 공식 채용 API 수집 완료" : "현재 AI 공고를 찾지 못했습니다.",
      url: source.homepage,
    });
  } catch (error) {
    sourceHealth.push({
      name: source.name,
      ok: false,
      count: 0,
      message: error.message,
      url: source.homepage,
    });
  }
}

const payload = {
  generatedAt: collectedAt,
  sourceHealth,
  discoverySources: DISCOVERY_SOURCES,
  careerPortals: CAREER_PORTALS,
  jobs: dedupe(jobs).sort((a, b) => safeDeadline(a.deadline) - safeDeadline(b.deadline)),
};

await writeFile(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Wrote ${payload.jobs.length} jobs to public/jobs.json`);

async function fetchText(url) {
  const response = await fetch(url, {
    headers: requestHeaders(),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      ...requestHeaders(),
      accept: "application/json,text/plain,*/*",
    },
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function requestHeaders() {
  return {
    "user-agent": "Mozilla/5.0 (compatible; AIJobRadar/0.2; +https://github.com/)",
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "accept-language": "ko-KR,ko;q=0.9,en;q=0.8",
  };
}

function parseJobKorea(html, source, sourceUrl) {
  const jobs = [];
  const seen = new Set();
  const normalizedHtml = html.replaceAll('\\"', '"').replaceAll("\\u0026", "&");

  const patterns = [
    /"id":"(?<id>\d+)","legacyJobNo":"(?<legacy>\d+)","section":"[^"]*","contentType":"JOB_POSTING"[\s\S]{0,9000}?"title":"(?<title>[^"]*)"[\s\S]{0,500}?"companyName":"(?<company>[^"]*)"[\s\S]{0,1800}?"careerType":"(?<careerType>[^"]*)"[\s\S]{0,120}?"careerRange":(?<careerRange>\d+)[\s\S]{0,500}?"employmentTypeCodeList":\[(?<employment>[^\]]*)\][\s\S]{0,220}?"educationCode":"(?<education>[^"]*)"[\s\S]{0,1800}?"applicationPeriod":\{"start":"(?<start>[^"]+)","end":"(?<end>[^"]+)"/g,
    /"id":"(?<id>\d+)","legacyJobNo":"(?<legacy>\d+)","title":"(?<title>[^"]*)"[\s\S]{0,900}?"employmentTypeCodeList":\[(?<employment>[^\]]*)\][\s\S]{0,220}?"careerType":"(?<careerType>[^"]*)"[\s\S]{0,80}?"careerRange":(?<careerRange>\d+)[\s\S]{0,120}?"educationCode":"(?<education>[^"]*)"[\s\S]{0,600}?"companyName":"(?<company>[^"]*)"[\s\S]{0,900}?"applicationPeriod":\{"start":"(?<start>[^"]+)","end":"(?<end>[^"]+)"/g,
  ];

  for (const pattern of patterns) {
    for (const match of normalizedHtml.matchAll(pattern)) {
      const group = match.groups;
      if (seen.has(group.legacy)) continue;
      seen.add(group.legacy);

      const title = clean(group.title);
      const company = clean(group.company);
      const haystack = clean(match[0]);

      jobs.push(normalizeJob({
        id: `${source.name}-${group.legacy}`,
        source: source.name,
        company,
        title,
        url: `https://www.jobkorea.co.kr/Recruit/GI_Read/${group.legacy}`,
        career: careerLabel(group.careerType, group.careerRange),
        careerGroup: careerGroup(careerLabel(group.careerType, group.careerRange), title),
        education: educationLabel(group.education),
        location: inferLocation(haystack),
        employmentType: employmentLabel(group.employment),
        deadline: deadlineFromIso(group.end),
        fields: inferFields(`${title} ${haystack}`),
        skills: inferSkills(`${title} ${haystack}`),
        collectedAt,
      }));
    }
  }

  const titlePattern = /"title":"(?<title>[^"]*(?:AI|ML|머신러닝|딥러닝|Computer Vision|HyperCLOVA|Research Engineer|LLM)[^"]*)","companyName":"(?<company>[^"]*)"/gi;
  for (const match of normalizedHtml.matchAll(titlePattern)) {
    const title = clean(match.groups.title);
    const company = clean(match.groups.company);
    const before = normalizedHtml.slice(Math.max(0, match.index - 2200), match.index);
    const after = normalizedHtml.slice(match.index, match.index + 4200);
    const legacyMatches = [...before.matchAll(/"legacyJobNo":"(?<legacy>\d+)"/g)];
    const legacy = legacyMatches.at(-1)?.groups.legacy || hash(`${company}-${title}`);
    if (seen.has(legacy)) continue;
    seen.add(legacy);

    const careerMatch = after.match(/"careerType":"(?<type>[^"]*)"[\s\S]{0,80}?"careerRange":(?<range>\d+)/);
    jobs.push(normalizeJob({
      id: `${source.name}-${legacy}`,
      source: source.name,
      company,
      title,
      url: /^\d+$/.test(legacy)
        ? `https://www.jobkorea.co.kr/Recruit/GI_Read/${legacy}`
        : sourceUrl,
      career: careerMatch ? careerLabel(careerMatch.groups.type, careerMatch.groups.range) : "확인 필요",
      careerGroup: careerGroup(after, title),
      education: educationLabel(firstMatch(after, /"educationCode":"([^"]*)"/)),
      location: inferLocation(after),
      employmentType: employmentLabel(firstMatch(after, /"employmentTypeCodeList":\[([^\]]*)\]/)),
      deadline: deadlineFromIso(firstMatch(after, /"applicationPeriod":\{"start":"[^"]+","end":"([^"]+)"/)),
      fields: inferFields(`${title} ${after}`),
      skills: inferSkills(`${title} ${after}`),
      collectedAt,
    }));
  }

  return jobs;
}

function parseSaramin(html, source) {
  const jobs = [];
  const blocks = html.split(/<div[^>]+class="[^"]*item_recruit[^"]*"[^>]*>/).slice(1);

  for (const block of blocks.slice(0, 80)) {
    const titleMatch = block.match(/<h2[^>]*class="job_tit"[\s\S]*?<a[^>]+href="(?<href>[^"]+)"[^>]*>(?<title>[\s\S]*?)<\/a>/);
    const companyMatch = block.match(/class="corp_name"[\s\S]*?<a[^>]*>(?<company>[\s\S]*?)<\/a>/);
    if (!titleMatch || !companyMatch) continue;

    const title = clean(stripTags(titleMatch.groups.title));
    const company = clean(stripTags(companyMatch.groups.company));
    const text = clean(stripTags(block));

    jobs.push(normalizeJob({
      id: `${source.name}-${hash(`${company}-${title}`)}`,
      source: source.name,
      company,
      title,
      url: absoluteUrl(titleMatch.groups.href, "https://www.saramin.co.kr"),
      career: firstMatch(text, /(신입·경력|신입|경력\s*\d*년?\s*이상|경력무관|인턴)/) || "확인 필요",
      careerGroup: careerGroup(text, title),
      education: firstMatch(text, /(학력무관|대졸↑|초대졸↑|석사↑|박사↑|고졸↑)/) || "확인 필요",
      location: inferLocation(text),
      employmentType: firstMatch(text, /(정규직|계약직|인턴직|전환형인턴|프리랜서)/) || "확인 필요",
      deadline: firstMatch(text, /(상시채용|채용시마감|~\d{2}\/\d{2})/) || "마감 확인",
      fields: inferFields(`${title} ${text}`),
      skills: inferSkills(`${title} ${text}`),
      collectedAt,
    }));
  }

  return jobs;
}

function parseGreenhouse(json, source) {
  return (json.jobs || []).map((job) => {
    const text = clean(stripTags(`${job.title} ${job.content || ""} ${JSON.stringify(job.departments || [])}`));
    return normalizeJob({
      id: `${source.name}-${job.id}`,
      source: source.name,
      company: source.company,
      title: clean(job.title),
      url: job.absolute_url || source.homepage,
      career: inferCareerFromText(text),
      careerGroup: careerGroup(text, job.title),
      education: inferEducationFromText(text),
      location: job.location?.name || "공고별 확인",
      employmentType: "공고별 확인",
      deadline: "채용시마감",
      fields: inferFields(text),
      skills: inferSkills(text),
      collectedAt,
    });
  });
}

function normalizeJob(job) {
  const fields = unique(job.fields || []);
  const skills = unique(job.skills || []);
  return {
    ...job,
    fields,
    skills,
    companyType: job.companyType || inferCompanyType(job.company, job.source),
    focusKeywords: unique(job.focusKeywords || inferFocusKeywords(`${job.title} ${job.company} ${fields.join(" ")} ${skills.join(" ")}`)),
  };
}

function isAiRole(job) {
  const inferredFields = (job.fields || []).filter((field) => field !== "AI·데이터");
  const titleText = `${job.title} ${job.company} ${job.skills?.join(" ")}`;
  const text = `${titleText} ${inferredFields.join(" ")}`;
  if (NON_JOB_TITLE_WORDS.some((keyword) => job.title.includes(keyword))) return false;

  const lowerTitle = titleText.toLowerCase();
  const hasAi = AI_KEYWORDS.some((keyword) => lowerTitle.includes(keyword.toLowerCase()));
  const hasDataRole = /데이터\s?엔지니어|데이터\s?사이언|Data Engineer|Data Scientist|Data Analyst/i.test(titleText);
  const hasStrongAi = /AI|ML|LLM|NLP|머신러닝|딥러닝|데이터|비전|Vision|MLOps|RAG/i.test(titleText);
  const onlyNegative = NON_AI_WORDS.some((keyword) => text.includes(keyword)) && !hasStrongAi;
  return (hasAi || hasDataRole) && !onlyNegative;
}

function inferFields(text) {
  const fields = [];
  if (/Physical AI|피지컬\s?AI|로봇|Robot|Robotics|자율제어|무인/i.test(text)) fields.push("Physical AI");
  if (/Vision AI|Computer Vision|컴퓨터비전|Vision|영상|이미지|3D|Object Detection|OCR/i.test(text)) fields.push("Vision AI");
  if (/LLM|생성형|Foundation|RAG|NLP|자연어|Large Language/i.test(text)) fields.push("LLM/NLP");
  if (/MLOps|ML\s?Ops|플랫폼|Serving|서빙|Model Ops/i.test(text)) fields.push("MLOps");
  if (/Data Scientist|데이터\s?사이언|분석|통계|Experiment/i.test(text)) fields.push("Data Science");
  if (/Data Engineer|데이터\s?엔지니어|ETL|SQL|Pipeline|Warehouse/i.test(text)) fields.push("Data Engineering");
  if (/제조|Manufacturing|공정|품질|Industrial|설비|PHM|CBM|AIoT/i.test(text)) fields.push("Industrial AI");
  if (/AX|AI\/AX|AI 전환|DT|Digital Transformation/i.test(text)) fields.push("AI/AX");
  if (/Machine Learning|머신러닝|ML|Deep Learning|딥러닝|Recommendation|추천/i.test(text)) fields.push("머신러닝");
  if (/(AI|ML|머신러닝|딥러닝|LLM|NLP|Computer Vision|컴퓨터비전).{0,30}(Research|리서치|연구)|(?:Research|리서치|연구).{0,30}(AI|ML|머신러닝|딥러닝|LLM|NLP|Computer Vision|컴퓨터비전)/i.test(text)) {
    fields.push("AI Research");
  }
  return fields.length ? fields : ["AI·데이터"];
}

function inferFocusKeywords(text) {
  const keywords = [];
  if (/Physical AI|피지컬\s?AI/i.test(text)) keywords.push("Physical AI");
  if (/Vision AI|Computer Vision|컴퓨터비전|Object Detection|OCR|영상|이미지|3D/i.test(text)) keywords.push("Vision AI");
  if (/LLM|RAG|생성형|Foundation|NLP|자연어|Large Language/i.test(text)) keywords.push("LLM");
  if (/Robot|로봇|Robotics|자율제어|무인|Autonomous/i.test(text)) keywords.push("Robotics");
  if (/Manufacturing|제조|공정|품질|Industrial|PHM|CBM|AIoT|설비/i.test(text)) keywords.push("Manufacturing AI");
  if (/MLOps|Serving|서빙|Kubernetes|Docker/i.test(text)) keywords.push("MLOps");
  if (/Data Engineer|Data Engineering|데이터\s?엔지니어|ETL|Pipeline|Warehouse/i.test(text)) keywords.push("Data Engineering");
  if (/Data Scientist|Data Science|데이터\s?사이언|분석|통계/i.test(text)) keywords.push("Data Science");
  if (/Recommendation|추천/i.test(text)) keywords.push("Recommendation");
  if (/AI\/AX|AX|AI 전환|Digital Transformation|DT/i.test(text)) keywords.push("AI/AX");
  return keywords.length ? keywords : ["AI"];
}

function inferCompanyType(company = "", source = "") {
  const text = `${company} ${source}`;
  if (/HD현대|HD한국|에이치디|HD현대중공업|삼성|Samsung|LG|SK|현대|Hyundai|NAVER|네이버|카카오뱅크|카카오|Kakao|LINE|Coupang|쿠팡|KT|NC소프트|NCSOFT|넥슨|Nexon|Moloco|Sendbird/i.test(text)) {
    return "대기업";
  }
  if (/한글과컴퓨터|안랩|더존|솔트룩스|셀바스|코난테크놀로지|마크로젠|NHN|현대오토에버|롯데이노베이트|포스코DX|아이티센/i.test(text)) {
    return "중견기업";
  }
  if (/업스테이지|Upstage|뤼튼|Wrtn|Rebellions|리벨리온|Lunit|루닛|Scatter|스타트업|Startup|벤처/i.test(text)) {
    return "스타트업";
  }
  if (/㈜|주식회사|\(주\)/.test(text)) return "중소기업";
  return "분류 필요";
}

function inferSkills(text) {
  return [
    "Python",
    "SQL",
    "PyTorch",
    "TensorFlow",
    "AWS",
    "Kubernetes",
    "Spark",
    "RAG",
    "LangChain",
    "Docker",
    "GCP",
    "Azure",
    "Java",
    "C++",
    "Go",
  ].filter((skill) => new RegExp(escapeRegExp(skill), "i").test(text));
}

function careerLabel(type, range) {
  if (type === "1") return "신입";
  if (type === "2") return range && Number(range) < 100 ? `경력 ${range}년 이상` : "경력";
  if (type === "3") return "신입·경력";
  if (type === "4") return "인턴";
  return "확인 필요";
}

function careerGroup(text, title = "") {
  const value = `${text} ${title}`;
  if (/인턴|intern|internship/i.test(value)) return "intern";
  if (/신입|경력무관|주니어|junior|entry/i.test(value)) return "junior";
  return "experienced";
}

function inferCareerFromText(text) {
  return firstMatch(text, /(신입·경력|신입|경력\s*\d+\s*년?\s*이상|경력무관|인턴|Internship|Senior|Staff)/i) || "공고별 확인";
}

function inferEducationFromText(text) {
  return firstMatch(text, /(학력무관|대졸↑|초대졸↑|석사↑|박사↑|Bachelor|Master|PhD|Ph\.D\.)/i) || "공고별 확인";
}

function educationLabel(code) {
  return {
    0: "학력무관",
    3: "고졸↑",
    4: "초대졸↑",
    5: "대졸↑",
    6: "석사↑",
    7: "박사↑",
  }[code] || "확인 필요";
}

function employmentLabel(raw) {
  if (/10\/0|3\/1/.test(raw)) return "인턴";
  if (/2\/0/.test(raw)) return "계약직";
  if (/1\/0/.test(raw)) return "정규직";
  return "확인 필요";
}

function inferLocation(text) {
  return (
    firstMatch(text, /(서울|경기|인천|대전|대구|부산|광주|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주|Seoul|Korea)[^\s,·]{0,10}/i) ||
    "확인 필요"
  );
}

function deadlineFromIso(value) {
  if (!value) return "마감 확인";
  if (value.startsWith("2070")) return "상시채용";
  return value.slice(0, 10);
}

function safeDeadline(value) {
  if (!value || value === "상시채용" || value === "채용시마감" || value === "마감 확인" || value === "공고별 확인") {
    return Number.POSITIVE_INFINITY;
  }
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.source}-${item.company}-${item.title}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function firstMatch(text, pattern) {
  return text.match(pattern)?.[1] || "";
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function absoluteUrl(href, base) {
  return new URL(href.replaceAll("&amp;", "&"), base).toString();
}

function clean(value = "") {
  const decoded = String(value)
    .replaceAll("\\u0026", "&")
    .replaceAll('\\"', '"')
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");

  return decoded.replace(/\s+/g, " ").trim();
}

function stripTags(value = "") {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ");
}

function hash(value) {
  let output = 0;
  for (let index = 0; index < value.length; index += 1) {
    output = (output * 31 + value.charCodeAt(index)) >>> 0;
  }
  return output.toString(36);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
