import type { ArchetypeId, DimensionId, VisualSymbol } from "./types";

export const ARCHETYPE_VERSION = "2.0";

export interface Archetype {
  id: ArchetypeId;
  name: string;
  personName: string;
  englishName: string;
  title: string;
  strategy: string;
  visualSymbol: VisualSymbol;
  coordinates: Record<DimensionId, number>;
}

export const ARCHETYPES: Record<ArchetypeId, Archetype> = {
  mao: {
    id: "mao",
    name: "毛阿敏",
    personName: "毛阿敏型",
    englishName: "MAO TYPE",
    title: "人际关系导航仪",
    strategy: "先读局，再适配关系",
    visualSymbol: "map",
    coordinates: { R: 3.5, S: 4.8, B: 3.7, D: 2.3, G: 3.2, I: 2.4 },
  },
  xu: {
    id: "xu",
    name: "许晴",
    personName: "许晴型",
    englishName: "XU TYPE",
    title: "关系纯度检测仪",
    strategy: "关系变了，我需要知道为什么",
    visualSymbol: "truth",
    coordinates: { R: 4.8, S: 4.2, B: 2.4, D: 4.7, G: 2.1, I: 2.8 },
  },
  ning: {
    id: "ning",
    name: "宁静",
    personName: "宁静型",
    englishName: "NING TYPE",
    title: "边界主权持有人",
    strategy: "你的情绪不是自动等于我的责任",
    visualSymbol: "boundary",
    coordinates: { R: 3.0, S: 3.7, B: 4.8, D: 4.8, G: 2.4, I: 1.5 },
  },
  zheng: {
    id: "zheng",
    name: "郑爽",
    personName: "郑爽型",
    englishName: "ZHENG TYPE",
    title: "关系责任自检员",
    strategy: "问题一出现，先检查自己",
    visualSymbol: "error-log",
    coordinates: { R: 4.5, S: 3.2, B: 1.7, D: 2.5, G: 3.2, I: 4.8 },
  },
  chen: {
    id: "chen",
    name: "陈意涵",
    personName: "陈意涵型",
    englishName: "CHEN TYPE",
    title: "幸福者退让",
    strategy: "看见复杂性，再决定值不值得卷",
    visualSymbol: "exit",
    coordinates: { R: 2.4, S: 3.4, B: 4.5, D: 2.8, G: 1.6, I: 2.0 },
  },
  jing: {
    id: "jing",
    name: "井柏然",
    personName: "井柏然型",
    englishName: "JING TYPE",
    title: "公共关系维修工",
    strategy: "系统坏了，总得有人修",
    visualSymbol: "repair",
    coordinates: { R: 3.3, S: 4.2, B: 3.5, D: 3.4, G: 4.8, I: 2.7 },
  },
  yang: {
    id: "yang",
    name: "杨洋",
    personName: "杨洋型",
    englishName: "YANG TYPE",
    title: "真的来旅游的人",
    strategy: "先相信说出口的信息，不默认宫斗",
    visualSymbol: "tourist",
    coordinates: { R: 1.5, S: 1.2, B: 4.0, D: 3.0, G: 2.2, I: 2.0 },
  },
};
