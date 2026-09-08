import type { UserProfile } from "@/db/schema";

export type ExtractedResumeContacts = {
  name: string | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  github: string | null;
  portfolio: string | null;
  urls: string[];
};

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(?:\+?\d[\d\s().-]{8,}\d)/;
const URL_RE = /https?:\/\/[^\s)>\]]+/gi;

function cleanUrl(url: string) {
  return url.replace(/[),.;]+$/g, "");
}

export function buildResumeProfileText(
  profile: Pick<
    UserProfile,
    | "resumeData"
    | "bestProjects"
    | "proudProject"
    | "projectLinks"
    | "hardestProject"
    | "programmingInspiration"
    | "rejectionPitch"
    | "questionnaireContext"
  > | null,
): string {
  if (!profile) return "";

  const questionnaireBlock =
    profile.questionnaireContext?.length > 0
      ? profile.questionnaireContext
          .map((item) => `Q: ${item.question}\nA: ${item.answer}`)
          .join("\n\n")
      : null;

  const sections = [
    ["Complete resume", profile.resumeData],
    ["Best projects", profile.bestProjects],
    ["Proud project", profile.proudProject],
    ["Project links", profile.projectLinks],
    ["Hardest project", profile.hardestProject],
    ["Programming inspiration", profile.programmingInspiration],
    ["Closing pitch", profile.rejectionPitch],
    ["Questionnaire answers", questionnaireBlock],
  ] as const;

  return sections
    .filter(([, value]) => value?.trim())
    .map(([title, value]) => `### ${title}\n${value!.trim()}`)
    .join("\n\n")
    .trim();
}

export function extractResumeContacts(resumeText: string): ExtractedResumeContacts {
  const text = resumeText.replace(/\r\n/g, "\n");
  const urls = [...new Set((text.match(URL_RE) ?? []).map(cleanUrl))];

  const linkedin =
    urls.find((url) => /linkedin\.com\/in\//i.test(url)) ??
    urls.find((url) => /linkedin\.com/i.test(url)) ??
    null;
  const github = urls.find((url) => /github\.com\//i.test(url)) ?? null;
  const portfolio =
    urls.find(
      (url) => !/linkedin\.com/i.test(url) && !/github\.com/i.test(url),
    ) ?? null;

  const email = text.match(EMAIL_RE)?.[0] ?? null;
  const phone = text.match(PHONE_RE)?.[0]?.replace(/\s+/g, " ").trim() ?? null;

  const headingLike =
    /^(resume|best projects|proud project|project links|hardest project|programming inspiration|closing pitch|complete resume)$/i;

  const firstLine = text
    .split("\n")
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .find(
      (line) =>
        line &&
        !headingLike.test(line) &&
        !EMAIL_RE.test(line) &&
        !URL_RE.test(line) &&
        !PHONE_RE.test(line),
    );

  return {
    name: firstLine && firstLine.length <= 80 ? firstLine : null,
    email,
    phone,
    linkedin,
    github,
    portfolio,
    urls,
  };
}

function isMissingAnswer(answer: string) {
  const normalized = answer.trim().toLowerCase();
  if (!normalized) return true;
  return (
    normalized.includes("not specified") ||
    normalized.includes("does not indicate") ||
    normalized.includes("does not contain") ||
    normalized.includes("does not mention") ||
    normalized.includes("not cover") ||
    normalized.includes("resume does not") ||
    normalized.includes("no indication") ||
    normalized.includes("missing") ||
    normalized === "n/a" ||
    normalized === "none"
  );
}

function isPriorEmploymentQuestion(question: string) {
  return (
    /(employed by|worked (at|for|with)|prior employment|previously (worked|employed)|ever (worked|employed)|former employee|employee of)/i.test(
      question,
    ) ||
    /(have you been employed|were you ever employed|are you a (current|former) employee)/i.test(
      question,
    )
  );
}

function companyMentionedInResume(question: string, resumeText: string) {
  const resume = resumeText.toLowerCase();
  const candidates = question
    .replace(/[^\p{L}\p{N}\s&.'-]/gu, " ")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3);

  const stop = new Set(
    [
      "have",
      "been",
      "employed",
      "by",
      "any",
      "subsidiary",
      "affiliate",
      "business",
      "unit",
      "the",
      "past",
      "whether",
      "full",
      "time",
      "part",
      "basis",
      "company",
      "worked",
      "for",
      "with",
      "previously",
      "ever",
      "current",
      "former",
      "employee",
      "employment",
      "please",
      "share",
      "your",
      "this",
      "that",
      "from",
      "and",
      "or",
      "of",
      "in",
      "on",
      "a",
      "an",
      "to",
      "are",
      "you",
      "was",
      "were",
    ].map((w) => w.toLowerCase()),
  );

  const companies = candidates.filter((part) => !stop.has(part.toLowerCase()));

  return companies.some((company) => {
    const escaped = company.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(resume);
  });
}

function normalizeYesNoAnswer(answer: string) {
  const normalized = answer.trim().toLowerCase();
  if (/^(yes|y)\b/.test(normalized)) return "Yes";
  if (/^(no|n)\b/.test(normalized)) return "No";
  return null;
}

function fillFromProfileSections(
  question: string,
  resumeText: string,
): string | null {
  const q = question.toLowerCase();

  const section = (heading: RegExp) => {
    const match = resumeText.match(
      new RegExp(`${heading.source}[\\s\\S]*?(?=\\n##\\s|\\n###\\s|$)`, "i"),
    );
    return (
      match?.[0]
        ?.replace(heading, "")
        .replace(/^[\s:#*-]+/, "")
        .trim() || null
    );
  };

  if (/hardest/.test(q) && /project|engineering/.test(q)) {
    return (
      section(/##\s*hardest engineering project/i) ||
      section(/###\s*hardest project/i)
    );
  }

  if (/look up ?to|inspiration|whose work/.test(q)) {
    return (
      section(/##\s*programming inspiration/i) ||
      section(/###\s*programming inspiration/i)
    );
  }

  if (/change our mind|reject|pitch/.test(q)) {
    return section(/##\s*closing pitch/i) || section(/###\s*closing pitch/i);
  }

  if (/proud/.test(q) && /project/.test(q)) {
    return (
      section(/##\s*project i'?m proud of/i) ||
      section(/###\s*proud project/i)
    );
  }

  return null;
}

/**
 * Improve answers using resume profile. Does not drop any questions.
 */
export function enrichQuestionAnswers(
  questions: Array<{ question: string; answer: string }>,
  resumeText: string,
): Array<{ question: string; answer: string }> {
  const contacts = extractResumeContacts(resumeText);

  return questions.map((item) => {
    const q = item.question.toLowerCase();

    if (isPriorEmploymentQuestion(item.question)) {
      const direct = normalizeYesNoAnswer(item.answer);
      if (direct) return { ...item, answer: direct };

      if (
        isMissingAnswer(item.answer) ||
        /not (previously )?employed|no prior|never worked/i.test(item.answer)
      ) {
        const workedThere = companyMentionedInResume(item.question, resumeText);
        return { ...item, answer: workedThere ? "Yes" : "No" };
      }
    }

    if (!isMissingAnswer(item.answer)) return item;

    const fromProfile = fillFromProfileSections(item.question, resumeText);
    if (fromProfile) {
      return { ...item, answer: fromProfile };
    }

    if (/linkedin/.test(q) && contacts.linkedin) {
      return { ...item, answer: contacts.linkedin };
    }
    if (/github|git hub/.test(q) && contacts.github) {
      return { ...item, answer: contacts.github };
    }
    if (
      /(portfolio|personal website|website url|personal site)/.test(q) &&
      contacts.portfolio
    ) {
      return { ...item, answer: contacts.portfolio };
    }
    if (/e-?mail/.test(q) && contacts.email) {
      return { ...item, answer: contacts.email };
    }
    if (/(phone|mobile|contact number)/.test(q) && contacts.phone) {
      return { ...item, answer: contacts.phone };
    }
    if (
      /(full name|legal name|^name$|candidate name)/.test(q.trim()) &&
      contacts.name
    ) {
      return { ...item, answer: contacts.name };
    }

    return item;
  });
}
