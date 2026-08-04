import { writeFile } from "node:fs/promises";

const OUT_FILE = new URL("../public/jobs.json", import.meta.url);
const KEYWORDS = [
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
];

const NEGATIVE_KEYWORDS = [
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
];

const SOURCES = [
  {
    name: "잡코리아",
    url: "https://www.jobkorea.co.kr/Search/?stext=AI%20%EB%A8%B8%EC%8B%A0%EB%9F%AC%EB%8B%9D",
    parse: parseJobKorea,
  },
  {
    name: "사람인",
    url: "https://www.saramin.co.kr/zf_user/search/recruit?searchword=AI%20%EB%A8%B8%EC%8B%A0%EB%9F%AC%EB%8B%9D",
    parse: parseSaramin,
  },
  {
    name: "직행",
    url: "https://zighang.com/ai",
    parse: parseZighang,
  },
  {
    name: "자소설닷컴",
    url: "https://jasoseol.com/recruit",
    parse: parseJasoseol,
  },
];

const collectedAt = new Date().toISOString();
const sourceHealth = [];
const jobs = [];

for (const source of SOURCES) {
  try {
    const html = await fetchText(source.url);
    const parsed = await source.parse(html, source);
    const aiJobs = parsed.filter(isAiRole).slice(0, 30);

    jobs.push(...aiJobs);
    sourceHealth.push({
      name: source.name,
      ok: aiJobs.length > 0,
      count: aiJobs.length,
      message: aiJobs.length ? "수집 완료" : "AI 공고를 찾지 못했습니다.",
      url: source.url,
    });
  } catch (error) {
    sourceHealth.push({
      name: source.name,
      ok: false,
      count: 0,
      message: error.message,
      url: source.url,
    });
  }
}

const payload = {
  generatedAt: collectedAt,
  sourceHealth,
  jobs: dedupe(jobs).sort((a, b) => safeDeadline(a.deadline) - safeDeadline(b.deadline)),
};

await writeFile(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Wrote ${payload.jobs.length} jobs to public/jobs.json`);

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; AIJobRadar/0.1; +https://github.com/)",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "ko-KR,ko;q=0.9,en;q=0.8",
    },
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

function parseJobKorea(html, source) {
  const jobs = [];
  const seen = new Set();
  const normalizedHtml = html.replaceAll('\\"', '"').replaceAll("\\u0026", "&");
  const objectPattern =
    /"id":"(?<id>\d+)","legacyJobNo":"(?<legacy>\d+)","section":"[^"]*","contentType":"JOB_POSTING"[\s\S]{0,9000}?"title":"(?<title>[^"]*)"[\s\S]{0,500}?"companyName":"(?<company>[^"]*)"[\s\S]{0,1800}?"careerType":"(?<careerType>[^"]*)"[\s\S]{0,120}?"careerRange":(?<careerRange>\d+)[\s\S]{0,500}?"employmentTypeCodeList":\[(?<employment>[^\]]*)\][\s\S]{0,220}?"educationCode":"(?<education>[^"]*)"[\s\S]{0,1800}?"applicationPeriod":\{"start":"(?<start>[^"]+)","end":"(?<end>[^"]+)"/g;

  for (const match of normalizedHtml.matchAll(objectPattern)) {
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

  const titlePattern = /"title":"(?<title>[^"]*(?:AI|ML|머신러닝|딥러닝|Computer Vision|HyperCLOVA|Research Engineer)[^"]*)","companyName":"(?<company>[^"]*)"/gi;
  for (const match of normalizedHtml.matchAll(titlePattern)) {
    const title = clean(match.groups.title);
    const company = clean(match.groups.company);
    const before = normalizedHtml.slice(Math.max(0, match.index - 2200), match.index);
    const after = normalizedHtml.slice(match.index, match.index + 4200);
    const legacyMatches = [...before.matchAll(/"legacyJobNo":"(?<legacy>\d+)"/g)];
    const legacy = legacyMatches.at(-1)?.groups.legacy || hash(`${company}-${title}`);
    if (seen.has(legacy)) continue;
    seen.add(legacy);

    jobs.push(normalizeJob({
      id: `${source.name}-${legacy}`,
      source: source.name,
      company,
      title,
      url: /^\d+$/.test(legacy)
        ? `https://www.jobkorea.co.kr/Recruit/GI_Read/${legacy}`
        : source.url,
      career:
        firstMatch(after, /"careerType":"(?<type>[^"]*)"[\s\S]{0,80}?"careerRange":(?<range>\d+)/)
          ? careerLabel(
              after.match(/"careerType":"(?<type>[^"]*)"[\s\S]{0,80}?"careerRange":(?<range>\d+)/).groups.type,
              after.match(/"careerType":"(?<type>[^"]*)"[\s\S]{0,80}?"careerRange":(?<range>\d+)/).groups.range,
            )
          : "확인 필요",
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

  const mainListPattern =
    /"id":"(?<id>\d+)","legacyJobNo":"(?<legacy>\d+)","title":"(?<title>[^"]*)"[\s\S]{0,900}?"employmentTypeCodeList":\[(?<employment>[^\]]*)\][\s\S]{0,220}?"careerType":"(?<careerType>[^"]*)"[\s\S]{0,80}?"careerRange":(?<careerRange>\d+)[\s\S]{0,120}?"educationCode":"(?<education>[^"]*)"[\s\S]{0,600}?"companyName":"(?<company>[^"]*)"[\s\S]{0,900}?"applicationPeriod":\{"start":"(?<start>[^"]+)","end":"(?<end>[^"]+)"/g;

  for (const match of normalizedHtml.matchAll(mainListPattern)) {
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

  return jobs;
}

function parseSaramin(html, source) {
  const jobs = [];
  const blocks = html.split(/<div[^>]+class="[^"]*item_recruit[^"]*"[^>]*>/).slice(1);

  for (const block of blocks.slice(0, 60)) {
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

function parseZighang(html, source) {
  const jobs = [];
  const title = clean(firstMatch(html, /<title>(.*?)<\/title>/)) || "AI·데이터 채용공고";
  const recruitmentLinks = unique(
    [...html.matchAll(/href="(?<href>\/recruitment\/[a-f0-9-]+)"/g)].map((item) =>
      absoluteUrl(item.groups.href, "https://zighang.com"),
    ),
  );

  for (const url of recruitmentLinks.slice(0, 20)) {
    jobs.push(normalizeJob({
      id: `${source.name}-${hash(url)}`,
      source: source.name,
      company: "직행 수집 공고",
      title,
      url,
      career: "확인 필요",
      careerGroup: "experienced",
      education: "확인 필요",
      location: "확인 필요",
      employmentType: "확인 필요",
      deadline: "마감 확인",
      fields: ["AI·데이터"],
      skills: [],
      collectedAt,
    }));
  }

  return jobs;
}

function parseJasoseol(html, source) {
  const text = clean(stripTags(html));
  const title = clean(firstMatch(html, /<title>(.*?)<\/title>/)) || "채용 공고";
  if (!/AI|인공지능|머신러닝|데이터/.test(text)) return [];

  return [
    normalizeJob({
      id: `${source.name}-${hash(source.url)}`,
      source: source.name,
      company: "자소설닷컴",
      title,
      url: source.url,
      career: "공채/신입 중심",
      careerGroup: "junior",
      education: "공고별 확인",
      location: "공고별 확인",
      employmentType: "공고별 확인",
      deadline: "마감 확인",
      fields: ["AI·데이터"],
      skills: [],
      collectedAt,
    }),
  ];
}

function normalizeJob(job) {
  return {
    ...job,
    fields: unique(job.fields || []),
    skills: unique(job.skills || []),
  };
}

function isAiRole(job) {
  const inferredFields = (job.fields || []).filter((field) => field !== "AI·데이터");
  const text = `${job.title} ${inferredFields.join(" ")} ${job.skills?.join(" ")}`;
  const hasAi = KEYWORDS.some((keyword) => text.toLowerCase().includes(keyword.toLowerCase()));
  const onlyNegative = NEGATIVE_KEYWORDS.some((keyword) => text.includes(keyword)) && !/AI|ML|LLM|데이터|비전/.test(text);
  return hasAi && !onlyNegative;
}

function inferFields(text) {
  const fields = [];
  if (/LLM|생성형|Foundation|RAG|NLP|자연어/i.test(text)) fields.push("LLM/NLP");
  if (/Computer Vision|컴퓨터비전|Vision|영상|이미지|3D|Object Detection/i.test(text)) fields.push("Computer Vision");
  if (/MLOps|ML\s?Ops|플랫폼|Serving|서빙/i.test(text)) fields.push("MLOps");
  if (/Data Scientist|데이터\s?사이언|분석|통계/i.test(text)) fields.push("Data Science");
  if (/Data Engineer|데이터\s?엔지니어|ETL|SQL|Pipeline/i.test(text)) fields.push("Data Engineering");
  if (/Machine Learning|머신러닝|ML|Deep Learning|딥러닝/i.test(text)) fields.push("머신러닝");
  if (/(AI|ML|머신러닝|딥러닝|LLM|NLP|Computer Vision|컴퓨터비전).{0,20}(Research|리서치|연구)|(?:Research|리서치|연구).{0,20}(AI|ML|머신러닝|딥러닝|LLM|NLP|Computer Vision|컴퓨터비전)/i.test(text)) {
    fields.push("AI Research");
  }
  return fields.length ? fields : ["AI·데이터"];
}

function inferSkills(text) {
  return ["Python", "SQL", "PyTorch", "TensorFlow", "AWS", "Kubernetes", "Spark", "RAG"]
    .filter((skill) => new RegExp(skill, "i").test(text));
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
  if (/인턴|intern/i.test(value)) return "intern";
  if (/신입|경력무관|주니어|junior/i.test(value)) return "junior";
  return "experienced";
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
    firstMatch(text, /(서울|경기|인천|대전|대구|부산|광주|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주)[^\s,·]{0,8}/) ||
    "확인 필요"
  );
}

function deadlineFromIso(value) {
  if (!value) return "마감 확인";
  if (value.startsWith("2070")) return "상시채용";
  return value.slice(0, 10);
}

function safeDeadline(value) {
  if (!value || value === "상시채용" || value === "채용시마감" || value === "마감 확인") {
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
  const decoded = value
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
  return value.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ");
}

function hash(value) {
  let output = 0;
  for (let index = 0; index < value.length; index += 1) {
    output = (output * 31 + value.charCodeAt(index)) >>> 0;
  }
  return output.toString(36);
}
