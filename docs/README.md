# 花学测试｜项目文档索引

根目录 [README.md](../README.md) 是面向 GitHub 访客的项目介绍。本页面向维护者，说明源码、内容、研究和决策文档分别负责什么，以及修改后应该检查哪里。

## 先看哪一份

| 你想了解什么 | 入口 |
| --- | --- |
| 项目是什么、怎么玩、如何运行 | [README.md](../README.md) |
| 页面气质、布局、动效和无障碍 | [design/视觉与页面规范.md](design/视觉与页面规范.md) |
| 为什么题库这样设计 | [decisions/题库从V1到V3的演进.md](decisions/题库从V1到V3的演进.md) |
| 为什么使用当前计分方式 | [decisions/评分模型演进与选择.md](decisions/评分模型演进与选择.md) |
| 结果页、隐私和分享边界 | [decisions/结果系统产品体验与隐私决策.md](decisions/结果系统产品体验与隐私决策.md) |
| 人格分布优化的基线与路线图 | [decisions/人格分布优化-诊断基线原则与路线图.md](decisions/人格分布优化-诊断基线原则与路线图.md) |
| Question Set v3.1 评分矩阵合入记录 | [decisions/QuestionSet-v3.1-评分矩阵提案.md](decisions/QuestionSet-v3.1-评分矩阵提案.md) |
| Archetype Coordinates v2.1 坐标合入记录 | [decisions/ArchetypeCoordinates-v2.1-提案.md](decisions/ArchetypeCoordinates-v2.1-提案.md) |
| Result System v2 梗感改版与 Question Set v3.2 勘误 | [decisions/ResultSystem-v2-梗感改版与QuestionSet-v3.2勘误.md](decisions/ResultSystem-v2-梗感改版与QuestionSet-v3.2勘误.md) |
| 研究材料和来源 | [research/](research/) |
| 已废弃方案 | [archive/README.md](archive/README.md) |

## 源码与文档的职责边界

~~~text
app/                         页面、状态和用户交互
components/                  结果页分享海报（预览 DOM、SVG 生成、PNG 分享）
data/                        当前运行时使用的内容与模型输入
lib/scoring.ts               当前运行时使用的计分实现
lib/scoring.test.ts          计分和数据完整性的回归检查
lib/analytics.ts             匿名事件埋点（GoatCounter，事件清单见隐私决策）
data/population-stats.ts     “测友坐标”快照（由 workflow 自动生成，勿手改）
scripts/sync-population.mjs  快照同步脚本（GoatCounter 事件 → data/）
docs/design/                 视觉和交互规范
docs/research/               事实材料、解释假设和待核验问题
docs/decisions/              已做出的产品与技术选择
docs/archive/                历史路线，不得被运行时代码引用
~~~

### 当前实现真相源

当文档和代码不一致时，以当前运行时代码和测试为准，并补正文档：

- data/questions.ts：24 道题、96 个选项、四幕和题库版本；
- data/question-scoring.v3.ts：24×4 选项评分矩阵；
- data/dimensions.ts：六维定义和展示标签；
- data/archetypes.ts：七个人格原型坐标与 `visualSymbol`；
- data/results.ts：固定结果文案、`recall`（名场面回响金句）、`heartEyeBalance`、彩蛋和免责声明；
- data/population-stats.ts：测友坐标快照，生成方式见 scripts/sync-population.mjs；
- components/share-poster.tsx：分享海报的唯一实现，内容只读 data/；
- lib/scoring.ts：展示分、主型/副型/最不像和证据生成；
- lib/analytics.ts：匿名事件埋点，只携带事件与主型。

研究文档解释材料来源和推导过程，不会自动成为产品事实；归档文档也不应重新进入 data/ 或页面 import。

## 当前内容基线

| 层 | 当前版本 |
| --- | --- |
| 题库 | Question Set v3.2（矩阵数值为 v3.1，v3.2 为两处文案勘误） |
| 六维模型 | Dimension Model v2.1（ID、语义与内部名同 v2.0，展示文案梗感化） |
| 七人格坐标 | Archetype Profiles v2.1 |
| 分类器 | Calibrated Item-Profile Matching v3.0（公式未变，矩阵为 v3.1） |
| 结果文案 | Result System v2.3（v2.3 去分块化 + V2.4 风格文案重写） |

## 目录说明

### design/：视觉与体验

- [视觉与页面规范.md](design/视觉与页面规范.md)：档案视觉、页面结构、动效、移动端和可访问性规范。

### research/：研究与证据

1. [研究范围与证据规则](research/00-研究范围与证据规则.md)
2. [同类测试与传播机制调研](research/01-同类测试与传播机制调研.md)
3. [花学素材来源索引](research/02-花学素材来源索引.md)
4. [节目事件与证据时间线](research/03-节目事件与证据时间线.md)
5. [七人互联网人格档案](research/04-七人互联网人格档案.md)
6. [人物对照与六维模型推导](research/05-人物对照与六维模型推导.md)
7. [待人工核验清单](research/06-待人工核验清单.md)
8. [玩梗金句候选库](research/07-玩梗金句候选库.md)
8. [玩梗金句候选库](research/07-玩梗金句候选库.md)

研究材料必须区分可观察事实、解释和产品抽象；未经核验的台词、数字、剪辑叙事和网友判断不能直接写成节目事实或真人结论。

### decisions/：产品与技术决策

- [题库从 V1 到 V3 的演进](decisions/题库从V1到V3的演进.md)
- [评分模型演进与选择](decisions/评分模型演进与选择.md)
- [结果系统、产品体验与隐私决策](decisions/结果系统产品体验与隐私决策.md)
- [人格分布优化：诊断基线、原则与路线图](decisions/人格分布优化-诊断基线原则与路线图.md)
- [Question Set v3.1 评分矩阵合入记录](decisions/QuestionSet-v3.1-评分矩阵提案.md)
- [Archetype Coordinates v2.1 坐标合入记录](decisions/ArchetypeCoordinates-v2.1-提案.md)
- [Result System v2 梗感改版与 Question Set v3.2 勘误](decisions/ResultSystem-v2-梗感改版与QuestionSet-v3.2勘误.md)

这里记录当前版本为什么这样做，以及旧方案为什么退出。修改冻结的题目 ID、选项 ID、题目顺序、六维、人格坐标或结果边界时，需要同步更新数据版本、测试和相关决策文档。

### archive/：历史资料

只放已废弃但有助于理解决策的材料。归档文件不能被 data/、lib/ 或 UI import；当前实现不从归档目录读取任何内容。

## 按改动类型维护

| 改动 | 需要同步 |
| --- | --- |
| 题目、选项、维度、人格或结果文案 | data/、对应测试、版本说明和相关决策文档 |
| 计分、匹配或证据逻辑 | lib/scoring.ts、lib/scoring.test.ts、评分决策文档 |
| 埋点事件、样本口径或快照流程 | lib/analytics.ts、scripts/sync-population.mjs、.github/workflows/、结果系统隐私决策文档 |
| 分享海报的布局或生成 | components/share-poster.tsx、share-poster.test.ts，内容仍来自 data/ |
| 页面结构、视觉、动效或无障碍 | app/、docs/design/视觉与页面规范.md，必要时补 UI 验证 |
| 新研究材料 | docs/research/，记录来源、日期、层级、支持内容和局限 |
| 已废弃路线 | docs/archive/，并确认运行时代码没有引用 |

## 本地验证

~~~bash
npm run lint
npm run typecheck
npm test
npm run build
~~~

除自动化检查外，涉及页面的改动还应在约 390px 宽度和桌面宽度检查：无横向溢出、选项可触摸、键盘焦点清晰、减少动效后仍可完整完成流程。

本项目的默认工作范围是本地开发、验证和构建；commit、push、部署和外部发布需要单独确认。
