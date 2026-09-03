import type { QuestionScoring } from "./types";

// v3.1 修订（2026-09-03 批准合入，见 docs/decisions/QuestionSet-v3.1-评分矩阵提案.md）：
// 5 处选项数值修正文本↔矩阵错配并消可辩护孪生：
//   Q05C I4→3（zheng→mao）、Q07C I2→1（chen→ning，连带 Q07B 归 jing）、
//   Q12C S4→5/R5→4（zheng→xu）、Q17A B2→5（zheng→xu）、Q20D D1→3（yang→chen）。
// 题目 ID、顺序、正文、选项文本与测量维度归属未变。
export const QUESTION_SCORING_V3: Record<string, QuestionScoring> = {
  Q01: { questionId: "Q01", dimensions: ["D", "S"], options: { A: { D: 5, S: 2 }, B: { D: 4, S: 3 }, C: { D: 3, S: 1 }, D: { D: 2, S: 5 } } },
  Q02: { questionId: "Q02", dimensions: ["S", "G"], options: { A: { S: 3, G: 5 }, B: { S: 3, G: 3 }, C: { S: 1, G: 1 }, D: { S: 5, G: 4 } } },
  Q03: { questionId: "Q03", dimensions: ["B", "S"], options: { A: { B: 5, S: 1 }, B: { B: 4, S: 3 }, C: { B: 2, S: 4 }, D: { B: 1, S: 5 } } },
  Q04: { questionId: "Q04", dimensions: ["I", "B"], options: { A: { I: 5, B: 2 }, B: { I: 3, B: 4 }, C: { I: 4, B: 4 }, D: { I: 1, B: 5 } } },
  Q05: { questionId: "Q05", dimensions: ["D", "I"], options: { A: { D: 5, I: 1 }, B: { D: 3, I: 2 }, C: { D: 2, I: 3 }, D: { D: 1, I: 5 } } },
  Q06: { questionId: "Q06", dimensions: ["R", "S"], options: { A: { R: 5, S: 2 }, B: { R: 2, S: 2 }, C: { R: 3, S: 4 }, D: { R: 3, S: 5 } } },
  Q07: { questionId: "Q07", dimensions: ["S", "I"], options: { A: { S: 1, I: 1 }, B: { S: 4, I: 2 }, C: { S: 4, I: 1 }, D: { S: 5, I: 5 } } },
  Q08: { questionId: "Q08", dimensions: ["R", "I"], options: { A: { R: 5, I: 2 }, B: { R: 3, I: 1 }, C: { R: 5, I: 5 }, D: { R: 1, I: 1 } } },
  Q09: { questionId: "Q09", dimensions: ["G", "D"], options: { A: { G: 2, D: 2 }, B: { G: 2, D: 5 }, C: { G: 5, D: 3 }, D: { G: 1, D: 5 } } },
  Q10: { questionId: "Q10", dimensions: ["D", "B"], options: { A: { D: 5, B: 5 }, B: { D: 3, B: 3 }, C: { D: 1, B: 4 }, D: { D: 1, B: 1 } } },
  Q11: { questionId: "Q11", dimensions: ["R", "I"], options: { A: { R: 2, I: 1 }, B: { R: 3, I: 2 }, C: { R: 5, I: 2 }, D: { R: 5, I: 5 } } },
  Q12: { questionId: "Q12", dimensions: ["S", "R"], options: { A: { S: 1, R: 1 }, B: { S: 5, R: 3 }, C: { S: 5, R: 4 }, D: { S: 2, R: 2 } } },
  Q13: { questionId: "Q13", dimensions: ["B", "G"], options: { A: { B: 5, G: 3 }, B: { B: 5, G: 1 }, C: { B: 3, G: 5 }, D: { B: 2, G: 2 } } },
  Q14: { questionId: "Q14", dimensions: ["I", "G"], options: { A: { I: 5, G: 2 }, B: { I: 2, G: 5 }, C: { I: 2, G: 3 }, D: { I: 1, G: 1 } } },
  Q15: { questionId: "Q15", dimensions: ["B", "I"], options: { A: { B: 5, I: 1 }, B: { B: 4, I: 3 }, C: { B: 3, I: 4 }, D: { B: 1, I: 5 } } },
  Q16: { questionId: "Q16", dimensions: ["S", "G"], options: { A: { S: 1, G: 2 }, B: { S: 3, G: 5 }, C: { S: 5, G: 4 }, D: { S: 1, G: 1 } } },
  Q17: { questionId: "Q17", dimensions: ["R", "B"], options: { A: { R: 5, B: 5 }, B: { R: 4, B: 4 }, C: { R: 4, B: 5 }, D: { R: 1, B: 5 } } },
  Q18: { questionId: "Q18", dimensions: ["G", "D"], options: { A: { G: 5, D: 2 }, B: { G: 3, D: 3 }, C: { G: 1, D: 5 }, D: { G: 1, D: 4 } } },
  Q19: { questionId: "Q19", dimensions: ["R", "D"], options: { A: { R: 5, D: 5 }, B: { R: 4, D: 3 }, C: { R: 2, D: 3 }, D: { R: 1, D: 1 } } },
  Q20: { questionId: "Q20", dimensions: ["R", "D"], options: { A: { R: 5, D: 5 }, B: { R: 3, D: 2 }, C: { R: 1, D: 1 }, D: { R: 2, D: 3 } } },
  Q21: { questionId: "Q21", dimensions: ["R", "I"], options: { A: { R: 5, I: 2 }, B: { R: 2, I: 1 }, C: { R: 5, I: 5 }, D: { R: 1, I: 1 } } },
  Q22: { questionId: "Q22", dimensions: ["G", "R"], options: { A: { G: 5, R: 4 }, B: { G: 1, R: 1 }, C: { G: 2, R: 5 }, D: { G: 3, R: 1 } } },
  Q23: { questionId: "Q23", dimensions: ["D", "S"], options: { A: { D: 5, S: 2 }, B: { D: 3, S: 2 }, C: { D: 1, S: 5 }, D: { D: 1, S: 1 } } },
  Q24: { questionId: "Q24", dimensions: ["R", "B"], options: { A: { R: 5, B: 2 }, B: { R: 3, B: 4 }, C: { R: 1, B: 5 }, D: { R: 2, B: 4 } } },
};
