# FLOWER STUDIES ARCHIVE｜花少人格鉴定

这是《花少人格鉴定》的 Next.js + TypeScript 网站，当前内容版本为 `Question Set v3.0 Final Candidate`，人格坐标为 `Archetype Profiles v2.0`，计分版本为 `Calibrated Item-Profile Matching v3.0`。

项目的调研资料、人物模型推导、题库演进、评分决策和待核验事项见 [`docs/README.md`](docs/README.md)。`data/` 与 `lib/` 是当前实现真相源，历史方案仅用于解释决策。

## 一句话说明

一个把现实生活中的人际选择题，包装成“旅行真人秀考古档案”的娱乐测试：24 题、6 个维度、7 种花学人格原型，最后生成一份可以截图分享的个人档案。

## 文件结构

```text
AGENTS.md             开发边界、不可随意修改项和完成检查
DESIGN.md             FLOWER STUDIES ARCHIVE 视觉及页面规范
README.md             项目说明和接入建议
types.ts              共享类型
data/
  dimensions.ts       六维定义与展示标签
  questions.ts        V3 24 题、96 个选项与题目映射
  question-scoring.v3.ts 24×4 选项评分矩阵
  archetypes.ts       七人格 v2 原型坐标
  results.ts          Result System v1 固定结果文案
  types.ts            V3 内容与结果类型
lib/
  scoring.ts          六维分数、校准匹配、证据生成
  scoring.test.ts     推荐的最小单元测试
docs/
  README.md           调研、人物模型、设计决策与历史边界索引
```

## 推荐启动方式

这是一个 Next.js 完整网站仓库，也提供了一组可复用的内容与算法输入。接入其他 React、Vue、Svelte 或 TypeScript 前端时：

1. 将 `data/` 和 `lib/` 复制到前端项目；
2. 用 `QUESTIONS` 渲染单题流程；
3. 用 `calculateSixDimensionProfile(answers)` 生成题内中心化后的六维展示分；
4. 用 `scoreQuiz(answers)` 生成主型、副型、最不像、证据与主副型差值；
5. 用 `RESULT_CONTENT[result.primaryType]` 拼装结果页和分享卡。

正式结果建议统一调用：

```ts
import { calculateResult } from "./lib/scoring";

const result = calculateResult(answers);
```

`answers` 的格式是 `{ [questionId]: optionId }`，例如 `{ Q01: "D", Q02: "A" }`。正式分类必须包含 24 道题的合法答案。

## 页面主链路

```text
首页
  → 答题页 Q1–Q24
  → 四幕过场
  → 鉴定 Loading
  → Result Reveal
  → 完整结果报告
  → 分享人格卡
```

第一版不做好友匹配和复杂后台。答案可以保存在 localStorage；如果记录匿名事件，只保留 `page_view`、`start_test`、`chapter_complete`、`test_complete`、`result_type`、`share_generate`、`share_click`、`retake` 等必要事件。

## 计分口径

每个选项只在本题的两个维度上提供 1–5 的位置分。六维展示分先在题内中心化，再按维度聚合并映射到 0–100；它不是概率。

人格分类使用题目级的 Calibrated Item-Profile Matching v3：对每个候选人格，比较用户每道题的选项位置与该人格在同一题上的距离，以该题四个选项的平均距离为基线，并按题内标准差进行校准后等权累加。这样随机回答不会因为几何空间偏置天然偏向某个人格。

主型取校准分最高者，副型取第二名，最不像取最低者；证据按 `primaryContribution - secondaryContribution` 选出约 3 道用户真实作答题。只报告相对匹配和证据，不报告虚构的统计准确率。

## 结果边界

产品文案必须持续使用以下边界：

> “毛阿敏型、许晴型、宁静型……”是《花少 2》节目呈现与互联网花学共同塑造的娱乐人格原型，不等同于对现实真人的心理诊断，也不代表完整、客观的真人性格。

## 本地验证建议

如果宿主项目已有 TypeScript/Vitest：

```bash
npx tsc --noEmit
npx vitest run lib/scoring.test.ts
```

也可以先在浏览器里自己完整玩几遍，重点看：移动端阅读长度、上一题修改、四幕过场、结果计算是否稳定、分享卡是否好看。除非用户明确授权，不要自动 commit、push、部署或发布。

## 部署建议

这是无需服务端状态的静态前端优先项目。完成本地构建后，可部署到团队已有的静态站点托管、对象存储/CDN 或任意支持单页应用回退的托管环境。部署前确认：

- 直接打开结果链接不会 404；
- 分享卡字体、中文换行和二维码在生产环境一致；
- 埋点不上传原始答案；
- 生产环境没有暴露调试信息、内部 ID 或评分原始结构；
- 自定义域名、图片素材和字体均有相应使用授权。
