// Detects things in the public context that look like real company or person names,
// so the participant can anonymise them before the scenario is generated.

const QUOTED = /«[^«»]{2,40}»|"[^"]{2,40}"/g;
// JavaScript's \b only knows ASCII letters, so Unicode-aware lookarounds are used for Cyrillic.
const LEGAL = /(?<![\p{L}\p{N}])(?:ООО|ОАО|ЗАО|ПАО|АО|ИП)\s+[«"]?[А-ЯЁA-Z][^\s,.;:!?»"]*/gu;
const CAMEL = /(?<![\p{L}\p{N}])[А-ЯЁA-Z][а-яёa-z]+[А-ЯЁA-Z][а-яёa-z]+(?![\p{L}\p{N}])/gu;

export interface NameMatch { start: number; end: number; text: string }

export function findRealNames(text: string): NameMatch[] {
  const matches: NameMatch[] = [];
  for (const pattern of [QUOTED, LEGAL, CAMEL]) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const start = match.index ?? 0;
      const value = match[0];
      if (/^[«"](Клиент|Поставщик|Компания)[»"]$/.test(value)) continue;
      matches.push({ start, end: start + value.length, text: value });
    }
  }
  matches.sort((a, b) => a.start - b.start);
  return matches.filter((match, index) => index === 0 || match.start >= matches[index - 1].end);
}

export function anonymise(text: string) {
  const matches = findRealNames(text);
  let result = "";
  let cursor = 0;
  for (const match of matches) {
    result += text.slice(cursor, match.start) + "«Клиент»";
    cursor = match.end;
  }
  return result + text.slice(cursor);
}
