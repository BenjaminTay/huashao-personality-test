export type Dimension = "R" | "S" | "B" | "D" | "G" | "I";

export interface DimensionDefinition {
  id: Dimension;
  internalName: string;
  publicName: string;
  shortName: string;
  description: string;
  lowLabel: string;
  highLabel: string;
}

export const DIMENSION_ORDER: readonly Dimension[] = ["R", "S", "B", "D", "G", "I"];

export const DIMENSIONS: Record<Dimension, DimensionDefinition> = {
  R: {
    id: "R",
    internalName: "关系卷入度",
    publicName: "关系占内存",
    shortName: "关系内存",
    description: "一段关系出了问题以后，它会在你的后台运行多久？",
    lowLabel: "关系归关系，生活继续",
    highLabel: "后台进程持续运行",
  },
  S: {
    id: "S",
    internalName: "潜台词读取倾向",
    publicName: "读空气灵敏度",
    shortName: "读空气",
    description: "别人没明确说出口的信息，你的大脑会自动读取多少？",
    lowLabel: "按字面理解",
    highLabel: "花学雷达满格",
  },
  B: {
    id: "B",
    internalName: "情绪责任边界",
    publicName: "情绪边界",
    shortName: "边界",
    description: "别人的情绪，多大程度会自动变成你的责任？",
    lowLabel: "容易责任融合",
    highLabel: "边界主权清晰",
  },
  D: {
    id: "D",
    internalName: "表达直接性",
    publicName: "直球浓度",
    shortName: "直球",
    description: "有问题时，你有多倾向于把它直接摆到桌面上？",
    lowLabel: "场面管理型",
    highLabel: "当场开麦型",
  },
  G: {
    id: "G",
    internalName: "群体修复倾向",
    publicName: "收拾残局欲",
    shortName: "残局接管",
    description: "一个群体开始失灵以后，你会不会忍不住进去修？",
    lowLabel: "不是我的系统",
    highLabel: "公共维修工程师",
  },
  I: {
    id: "I",
    internalName: "责任内归倾向",
    publicName: "自动背锅率",
    shortName: "背锅率",
    description: "事情出了问题以后，你第一反应有多容易先检查自己？",
    lowLabel: "先分清责任",
    highLabel: "系统自动自检",
  },
};
