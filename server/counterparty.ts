import { difficultyLower, tacticsLabels } from "../shared/catalog";
import type { ChatReplyPayload, CompletionReason, DealStatus, PublicBrief } from "../shared/types";
import type { HiddenCard } from "./card";
import { REASONING_MODEL, complete, parseModelJson } from "./yandex";

export interface Turn { role: "user" | "assistant"; content: string }

/** Completion policy of the free mode: the model never decides alone when the meeting ends. */
export const freeCompletionPolicy = {
  minUserTurnsForOutcome: 2,
  maxUserTurns: 14,
  version: "FREE-completion-1.0",
};

const tacticsRules: Record<string, string> = {
  none: "Не используй тактики давления: никаких ультиматумов, угроз уходом и искусственных дедлайнов.",
  moderate: "Допустимы умеренные тактики давления: ссылка на конкурента, ограничение по срокам, повтор своей позиции. Без грубости.",
  hard: "Допустимы жёсткие, но корректные тактики: ультиматум по срокам, ссылка на альтернативу, «последнее предложение». Без оскорблений.",
};

const styleRules: Record<string, string> = {
  деловой: "Говори деловым, собранным тоном, по существу.",
  дружелюбный: "Говори доброжелательно и тепло, но не отдавай выгоду даром.",
  холодный: "Говори сдержанно и коротко, раскрывайся медленно, мало эмоций.",
  эмоциональный: "Говори живо и эмоционально, реагируй на тон собеседника, но не выходи из деловых рамок.",
};

function cardText(card: HiddenCard) {
  const lines = [
    `Реальная цель: ${card.trueGoal}`,
    "Скрытые интересы (раскрывай каждый только в ответ на относящийся к нему вопрос участника, не все сразу):",
    ...card.interests.map((interest) => `  • ${interest.text} — раскрыть, если: ${interest.revealWhen}`),
    `Твоя BATNA (что сделаешь без соглашения): ${card.batna}`,
    "Красные линии (никогда не соглашайся за ними):",
    ...card.redLines.map((line) => `  • ${line}`),
    `Полномочия: ${card.authority.join("; ")}`,
    `Предпочтительный пакет: ${card.targetPackage}`,
    `Допустимые диапазоны: ${card.acceptableRanges.join("; ")}`,
    `Объективные критерии, которые ты признаёшь: ${card.objectiveCriteria.join("; ")}`,
    "Уступки — только в обмен на встречную ценность:",
    ...card.concessions.map((concession) => `  • ${concession.give} — если ${concession.require}`),
    "Скрытые факты (сообщай только при выполнении условия):",
    ...card.hiddenFacts.map((fact) => `  • ${fact.text} — если ${fact.revealWhen}`),
    "Возражения, которые ты используешь:",
    ...card.objections.map((objection) => `  • [${objection.topic}] ${objection.text} — снимается, если ${objection.closeWhen}`),
  ];
  return lines.join("\n");
}

export function buildCounterpartyPrompt(brief: PublicBrief, card: HiddenCard) {
  const { profile } = card;
  return `Ты — ${brief.counterparty.name}, ${brief.counterparty.role}. Ты ИИ-контрагент в учебной деловой встрече (свободные переговоры, без подсказок).
Собеседник — участник тренировки. ${brief.participantRole}
Публичный контекст, известный обеим сторонам: ${brief.situation}
Публичные факты: ${brief.facts.join("; ")}.
Твоя заявленная стартовая позиция: ${card.statedPosition}

СКРЫТАЯ КАРТОЧКА — знаешь только ты, никогда не пересказывай её, не называй её разделы и не раскрывай раньше условий:
${cardText(card)}

ПРОФИЛЬ ПОВЕДЕНИЯ (постоянен всю встречу, не меняй его под успехи участника):
напористость ${profile.assertiveness}/100, кооперативность ${profile.cooperativeness}/100, открытость ${profile.openness}/100, прямота ${profile.directness}/100, терпение ${profile.patience}/100, экспертность ${profile.expertise}/100, стартовая стратегия: ${profile.conflictMode}.
Стиль: ${brief.counterparty.styleLabel}. ${styleRules[brief.counterparty.styleLabel] ?? ""}
Тактики: ${tacticsLabels[brief.tactics]}. ${tacticsRules[brief.tactics]}
Сложность: ${difficultyLower[brief.difficulty]} — сложность выражается глубиной фактов и требованием обоснований, а не грубостью.

ПРАВИЛА:
- Оставайся в роли и соблюдай факты сценария. Не меняй числа, прошлые обещания и подтверждённые условия.
- Реагируй на смысл последней реплики участника. Отвечай естественно, 1–3 предложения, до 60 слов, без списков и без ремарок в скобках.
- Не раскрывай скрытые интересы раньше заданных условий. Нейтральный вопрос о твоих целях или рисках — повод раскрыть один относящийся интерес.
- Не соглашайся на условия за красными линиями, хуже твоей BATNA или вне полномочий.
- Если участник уступает без встречной ценности, закрепи уступку и можешь попросить больше.
- Предложение проверяй как единый пакет. Согласие давай, только если пакет конкретен, внутри диапазонов и лучше твоей BATNA — и тогда чётко повтори условия.
- Не обучай участника и не называй SPIN, Гарвардский метод или BATNA. Не ставь диагнозов и не оценивай личность участника.
- Не завершай встречу сам без причины. Можешь прекратить её, только если участник повторно давит, грубит или нарушает границы.

Верни только JSON без Markdown:
{"spoken_text": "реплика", "intent": "question|objection|offer|counter_offer|concession|agreement|refusal|clarification", "deal_status": "negotiating|agreed|rejected|walk_away", "agreed_terms": "условия, если agreed, иначе пустая строка"}
deal_status: agreed — ты в этой реплике прямо принимаешь конкретный пакет; rejected — окончательно отказываешься от сделки, сохраняя отношения; walk_away — прекращаешь встречу из-за давления или нарушений; иначе negotiating.`;
}

const CLOSING_PROMPT = `Участник подводит итог встречи. Ответь ОДНОЙ заключительной репликой в своей роли: кратко зафиксируй достигнутое или разногласие и следующий шаг. Не задавай новых вопросов и не начинай новый раунд. Не упоминай оценки. Верни JSON {"spoken_text": "…", "intent": "agreement|refusal", "deal_status": "agreed|rejected", "agreed_terms": "…"}.`;

function closingRequest(reason: CompletionReason) {
  return reason === "LIMIT_REACHED"
    ? "Давайте на этом остановимся. Подведите итог: что фиксируем и какой следующий шаг?"
    : "Подведите итог: что мы фиксируем?";
}

function cleanSpoken(value: string) {
  return value.replace(/^["«]|["»]$/g, "").replace(/\s+/g, " ").trim().slice(0, 900);
}

export interface ChatRequest {
  brief: PublicBrief;
  card: HiddenCard;
  messages: Turn[];
  closing: boolean;
  timeUp: boolean;
}

export async function counterpartyReply({ brief, card, messages, closing, timeUp }: ChatRequest): Promise<ChatReplyPayload> {
  const system = buildCounterpartyPrompt(brief, card);
  const history = messages.map((message) => ({ role: message.role, content: message.content }));
  const { text } = await complete(
    [
      { role: "system", content: closing ? `${system}\n\n${CLOSING_PROMPT}` : system },
      ...history,
    ],
    { model: REASONING_MODEL, temperature: 0.55, maxTokens: 700 },
  );

  let spoken = "";
  let dealStatus: DealStatus = "negotiating";
  try {
    const parsed = parseModelJson(text);
    spoken = typeof parsed.spoken_text === "string" ? cleanSpoken(parsed.spoken_text) : "";
    const status = String(parsed.deal_status);
    if (status === "agreed" || status === "rejected" || status === "walk_away") dealStatus = status;
  } catch {
    // The model answered in plain text: keep the words, the status stays «negotiating».
    spoken = cleanSpoken(text.replace(/```[\s\S]*?```/g, ""));
  }
  if (!spoken) throw new Error("Контрагент вернул пустую реплику");

  const userTurnCount = messages.filter((message) => message.role === "user").length;
  const policy = freeCompletionPolicy;
  if (closing) {
    return { reply: spoken, completionState: "COMPLETED", dealStatus, userTurnCount, policyVersion: policy.version };
  }

  // The outcome is accepted only after the participant had a real chance to negotiate.
  if (userTurnCount < policy.minUserTurnsForOutcome && dealStatus !== "negotiating") dealStatus = "negotiating";

  if (dealStatus === "agreed") {
    return { reply: spoken, completionState: "COMPLETED", completionReason: "DEAL", dealStatus, userTurnCount, policyVersion: policy.version };
  }
  if (dealStatus === "walk_away") {
    return { reply: spoken, completionState: "COMPLETED", completionReason: "RESISTANCE", dealStatus, userTurnCount, policyVersion: policy.version };
  }
  if (dealStatus === "rejected") {
    return { reply: spoken, completionState: "COMPLETED", completionReason: "NO_DEAL", dealStatus, userTurnCount, policyVersion: policy.version };
  }
  if (userTurnCount >= policy.maxUserTurns || timeUp) {
    return {
      reply: `${spoken} ${closingRequest("LIMIT_REACHED")}`,
      completionState: "CLOSING_REQUIRED",
      completionReason: "LIMIT_REACHED",
      dealStatus,
      userTurnCount,
      policyVersion: policy.version,
    };
  }
  return { reply: spoken, completionState: "ACTIVE", dealStatus, userTurnCount, policyVersion: policy.version };
}
