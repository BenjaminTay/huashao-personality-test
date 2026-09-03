import type { DimensionDefinition, DimensionId } from "./types";

// v2.1（2026-09-03，产品负责人批准）：六维 ID、语义与 internalName 均未变，
// 仅展示文案（displayName / description / 两端标签）从"档案仪器腔"改为网络玩梗腔，
// 见 docs/decisions/ResultSystem-v2-梗感改版与QuestionSet-v3.2勘误.md。
export const DIMENSION_MODEL_VERSION = "2.1";
export const DIMENSION_ORDER: readonly DimensionId[] = ["R", "S", "B", "D", "G", "I"];

export const DIMENSIONS: Record<DimensionId, DimensionDefinition> = {
  R: {
    id: "R",
    internalName: "关系卷入度",
    displayName: "走心浓度",
    description: "散场之后，那些没说开的话，还会在你脑子里自动重播几遍？",
    lowLabel: "吵完就翻篇",
    highLabel: "那句“没事”我记到现在",
  },
  S: {
    id: "S",
    internalName: "潜台词读取倾向",
    displayName: "阅读理解力",
    description: "别人一句“没事”，你能听出几层意思？",
    lowLabel: "说啥信啥",
    highLabel: "每个标点都在说话",
  },
  B: {
    id: "B",
    internalName: "人际边界",
    displayName: "边界感",
    description: "别人的情绪和麻烦，会自动变成你的待办事项吗？",
    lowLabel: "很难说不",
    highLabel: "别来沾边",
  },
  D: {
    id: "D",
    internalName: "表达直接性",
    displayName: "直球浓度",
    description: "有话想说的时候，你会当场说，还是先等一下时机？",
    lowLabel: "嗯嗯，好的",
    highLabel: "这话我必须现在说",
  },
  G: {
    id: "G",
    internalName: "群体修复倾向",
    displayName: "修局欲",
    description: "一个局开始变冷、变乱、快要散的时候，你会条件反射地伸手去修吗？",
    lowLabel: "雨我无瓜",
    highLabel: "这个局我来修",
  },
  I: {
    id: "I",
    internalName: "责任内归倾向",
    displayName: "自动背锅率",
    description: "出了状况之后，你心里的第一句话通常是哪句？",
    lowLabel: "这锅不归我",
    highLabel: "先查我，先查我",
  },
};
