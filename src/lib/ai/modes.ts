/** Study modes: how Notified AI is asked to answer. Shared by the page (the pills) and the server (the instruction). */
export const MODES = {
  ask: { label: "Ask", hint: "Answer the question", extra: 0, instruction: "" },
  explain: { label: "Explain", hint: "Plain English, with an example", extra: 0, instruction: "Mode: Explain. Teach the point step by step in plain English for a first-year student, define each term of art, and finish with one short worked example." },
  irac: { label: "IRAC", hint: "Problem question answer", extra: 0, instruction: "Mode: IRAC. Answer as a problem question with the headings Issue, Rule, Application and Conclusion, applying the rule to the facts given." },
  quiz: { label: "Quiz me", hint: "One question at a time", extra: 0, instruction: "Mode: Quiz. Ask the student ONE question at a time on the topic or attached material (alternate short-answer and multiple-choice). Wait for their answer. Then say whether it is right, explain why in two or three sentences, and ask the next question. Keep a running score. If the student has not answered yet, ask question 1 now." },
  exam: { label: "Mock exam", hint: "Exam questions, marks given", extra: 1, instruction: "Mode: Mock exam. Set a mock exam of three questions (one problem question and two essay questions) on the topic or attached material, with the marks for each and a suggested time. Do not give the answers; tell the student to send theirs for marking." },
  flashcards: { label: "Flashcards", hint: "Question and answer cards", extra: 0, instruction: "Mode: Flashcards. Make 8 to 12 flashcards from the material. Write each as '**Q:** question' then a new line '**A:** answer', with a blank line between cards. Keep each answer under 40 words." },
} as const;

export type Mode = keyof typeof MODES;
export const MODE_ORDER: Mode[] = ["ask", "explain", "irac", "quiz", "exam", "flashcards"];
export const isMode = (v: unknown): v is Mode => typeof v === "string" && v in MODES;
