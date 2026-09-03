import type { DimensionDefinition, DimensionId } from "./types";

export const DIMENSION_MODEL_VERSION = "2.0";
export const DIMENSION_ORDER: readonly DimensionId[] = ["R", "S", "B", "D", "G", "I"];

export const DIMENSIONS: Record<DimensionId, DimensionDefinition> = {
  R: {
    id: "R",
    internalName: "关系卷入度",
    displayName: "关系占内存",
    description: "一段关系的变化会在多大程度上持续影响你。",
    lowLabel: "关系归关系，生活继续",
    highLabel: "后台进程持续运行",
  },
  S: {
    id: "S",
    internalName: "潜台词读取倾向",
    displayName: "读空气灵敏度",
    description: "你会不会自动读取言外之意、关系变化和未说出口的信息。",
    lowLabel: "按字面理解",
    highLabel: "花学雷达满格",
  },
  B: {
    id: "B",
    internalName: "人际边界",
    displayName: "边界感",
    description: "别人的需求、情绪和问题会在多大程度上进入你的责任范围。",
    lowLabel: "容易责任融合",
    highLabel: "边界主权清晰",
  },
  D: {
    id: "D",
    internalName: "表达直接性",
    displayName: "直球浓度",
    description: "有需求、不满或判断时，你有多倾向于直接表达。",
    lowLabel: "场面管理型",
    highLabel: "当场开麦型",
  },
  G: {
    id: "G",
    internalName: "群体修复倾向",
    displayName: "收拾残局欲",
    description: "群体失灵、关系卡住或事情混乱时，你有多想主动介入并让它重新运转。",
    lowLabel: "不是我的系统",
    highLabel: "公共维修工程师",
  },
  I: {
    id: "I",
    internalName: "责任内归倾向",
    displayName: "自动背锅率",
    description: "问题出现后，你有多快开始检查“是不是我哪里没做好”。",
    lowLabel: "先分清责任",
    highLabel: "系统自动自检",
  },
};
