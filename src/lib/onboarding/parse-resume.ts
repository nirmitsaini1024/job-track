export type ParsedResumeProfile = {
  /** Full, cleaned document we persist as the source of truth. */
  resumeData: string;
  bestProjects: string | null;
  proudProject: string | null;
  projectLinks: string | null;
  hardestProject: string | null;
  programmingInspiration: string | null;
  rejectionPitch: string | null;
};

type SectionKey = keyof Omit<ParsedResumeProfile, "resumeData"> | "resumeBody";

const SECTION_PATTERNS: Array<{ key: SectionKey; pattern: RegExp }> = [
  {
    key: "bestProjects",
    pattern:
      /^(?:#{1,3}\s*)?best projects?(?:\s+you\s+have\s+built)?\s*:?\s*$/i,
  },
  {
    key: "proudProject",
    pattern:
      /^(?:#{1,3}\s*)?(?:project\s+(?:i'?m|you\s+are)\s+(?:most\s+)?proud\s+of|proud\s+project)\s*:?\s*$/i,
  },
  {
    key: "projectLinks",
    pattern: /^(?:#{1,3}\s*)?project\s+links?\s*:?\s*$/i,
  },
  {
    key: "hardestProject",
    pattern:
      /^(?:#{1,3}\s*)?(?:hardest\s+engineering\s+project|what\s+is\s+the\s+hardest\s+engineering\s+project[\s\S]*?)\??\s*\*?\s*$/i,
  },
  {
    key: "programmingInspiration",
    pattern:
      /^(?:#{1,3}\s*)?(?:programming\s+inspiration|(?:\[?\s*optional\s*\]?\s*-?\s*)?whose\s+work\s+do\s+you\s+look\s+upto[\s\S]*?)\??\s*$/i,
  },
  {
    key: "rejectionPitch",
    pattern:
      /^(?:#{1,3}\s*)?(?:closing\s+pitch|(?:\[?\s*optional\s*\]?\s*-?\s*)?if\s+after\s+reading\s+all\s+the\s+other\s+answers[\s\S]*?)\??\s*\*?\s*$/i,
  },
  {
    key: "resumeBody",
    pattern: /^(?:#{1,3}\s*)?(?:complete\s+)?resume(?:\s+data)?\s*:?\s*$/i,
  },
];

const PLACEHOLDER_LINES = new Set(
  [
    "your answer",
    "paste your resume summary, experience, skills, education...",
    "describe your strongest projects and what you shipped...",
    "what makes this project special?",
    "github repos, live demos, portfolio urls (one per line)",
  ].map((line) => line.toLowerCase()),
);

function cleanBlock(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => {
      const trimmed = line.trim().toLowerCase();
      if (!trimmed) return true;
      return !PLACEHOLDER_LINES.has(trimmed);
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function matchSection(line: string): SectionKey | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  for (const section of SECTION_PATTERNS) {
    if (section.pattern.test(trimmed)) return section.key;
  }
  return null;
}

/**
 * Accepts a freeform paste (structured Q&A, raw resume, or mix) and returns
 * normalized structured fields plus the full original document.
 */
export function parseCompleteResumeData(raw: string): ParsedResumeProfile {
  const text = raw.replace(/\r\n/g, "\n").trim();
  const empty: Record<SectionKey, string> = {
    resumeBody: "",
    bestProjects: "",
    proudProject: "",
    projectLinks: "",
    hardestProject: "",
    programmingInspiration: "",
    rejectionPitch: "",
  };

  if (!text) {
    return {
      resumeData: "",
      bestProjects: null,
      proudProject: null,
      projectLinks: null,
      hardestProject: null,
      programmingInspiration: null,
      rejectionPitch: null,
    };
  }

  const lines = text.split("\n");
  let current: SectionKey = "resumeBody";
  const buckets: Record<SectionKey, string[]> = {
    resumeBody: [],
    bestProjects: [],
    proudProject: [],
    projectLinks: [],
    hardestProject: [],
    programmingInspiration: [],
    rejectionPitch: [],
  };

  let foundNamedSection = false;

  for (const line of lines) {
    const section = matchSection(line);
    if (section) {
      foundNamedSection = true;
      current = section;
      continue;
    }
    buckets[current].push(line);
  }

  // If no headings were found, treat the entire paste as resume body.
  if (!foundNamedSection) {
    buckets.resumeBody = lines;
  }

  const cleaned: Record<SectionKey, string> = { ...empty };
  for (const key of Object.keys(buckets) as SectionKey[]) {
    cleaned[key] = cleanBlock(buckets[key].join("\n"));
  }

  // Always preserve the full user paste. Section parsing only fills helper fields.
  const resumeData = cleanBlock(text);

  return {
    resumeData,
    bestProjects: cleaned.bestProjects || null,
    proudProject: cleaned.proudProject || null,
    projectLinks: cleaned.projectLinks || null,
    hardestProject: cleaned.hardestProject || null,
    programmingInspiration: cleaned.programmingInspiration || null,
    rejectionPitch: cleaned.rejectionPitch || null,
  };
}
