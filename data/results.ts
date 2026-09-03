import type { ArchetypeId } from "./archetypes";

export const RESULT_CONTENT_VERSION = "1.2";

export const RESULT_DISCLAIMER =
  "本结果是《花少2》节目呈现与互联网花学共同塑造的娱乐人格原型，不等同于对现实真人的心理诊断，也不代表完整、客观的真人性格。";

export type ResultVisualSymbol =
  | "map"
  | "truth"
  | "boundary"
  | "error-log"
  | "exit"
  | "repair"
  | "tourist";

export interface PersonalityResultContent {
  id: ArchetypeId;
  punchline: string;
  coreAlgorithmTitle: string;
  coreAnalysis: string;
  brightTitle: string;
  brightSide: string;
  bugTitle: string;
  shadowSide: string;
  misunderstoodAs: string;
  memeScore: {
    label: string;
    description: string;
  };
  archiveQuote: string;
  shareCopy: string;
  visualSymbol: ResultVisualSymbol;
}

export const RESULT_CONTENT: Record<ArchetypeId, PersonalityResultContent> = {
  mao: {
    id: "mao",
    punchline: "你很早就能察觉关系的变化，也不急着把所有人分成两边。",
    coreAlgorithmTitle: "先看清情况，再决定怎么做",
    coreAnalysis:
      "你会注意到别人没有说出口的情绪，也会留意谁在靠近、谁在疏远、什么话适合现在说。你未必想主导整个场面，但不喜欢最后才知道发生了什么。",
    brightTitle: "复杂场面里，你通常能保持清醒",
    brightSide:
      "你能同时理解不同人的立场，也知道关系可以有不同程度。别人急着分清谁和谁一边时，你往往先想清楚接下来怎么相处最合适。",
    bugTitle: "太会调整，也可能让人不确定你的态度",
    shadowSide:
      "你会根据场合调整相处方式，但重视关系确定感的人可能会觉得你态度不够明确。你觉得自己是在适应情况，对方想知道的却是：你到底怎么看我？",
    misunderstoodAs: "容易被说成心思多，但很多时候你只是比别人更早注意到变化。",
    memeScore: {
      label: "观察派",
      description: "你会先看清楚情况，再决定要不要参与。",
    },
    archiveQuote: "老娘我今天拼了。",
    shareCopy:
      "我不会急着站哪边，但别让我最后一个知道发生了什么。",
    visualSymbol: "map",
  },
  xu: {
    id: "xu",
    punchline:
      "你能接受关系变差，但不能接受大家明明变了还装作没变。",
    coreAlgorithmTitle: "关系变了，最好把原因说清楚",
    coreAnalysis:
      "你很在意亲近关系是否真诚。如果昨天还很亲近，今天却明显变了，你不会只把它当成一次普通的小摩擦，而是希望知道你们之间到底发生了什么。",
    brightTitle: "重要的人，你会认真对待",
    brightSide:
      "你会认真投入，也愿意表达真实情绪。你相信有些关系就是比普通关系更亲近，因此不会轻易把重要的人当成普通朋友。",
    bugTitle: "你对关系的期待有时太高",
    shadowSide:
      "别人可能只是在不同场合和不同的人正常相处，你却容易因为一件不舒服的小事重新确认整段关系。你重视真诚，这也会让你更容易受伤。",
    misunderstoodAs:
      "容易被说成敏感，但你的重点通常是：我不想假装这件事不存在。",
    memeScore: {
      label: "真诚派",
      description: "你有自己的判断，也很在意对方是不是同样认真。",
    },
    archiveQuote: "因为第一季的人都正常。",
    shareCopy: "关系可以复杂，但别一边说我们很好，一边让我猜我们到底算什么。",
    visualSymbol: "truth",
  },
  ning: {
    id: "ning",
    punchline:
      "你会照顾别人，但不会把所有人的情绪都算在自己头上。",
    coreAlgorithmTitle: "先说清楚各自的需要",
    coreAnalysis:
      "你比较容易分清自己的需要、对方的需要，以及自己能做到什么程度。你不喜欢靠猜、忍耐和等别人发现来相处，有需要时更愿意直接说出来。",
    brightTitle: "你的边界通常很清楚",
    brightSide:
      "你不容易因为别人不高兴就立刻怀疑自己，也不会因为大家都有一个默认期待，就放弃自己的需要。你能在意别人，也能保留自己。",
    bugTitle: "你说得直接，别人可能会有压力",
    shadowSide:
      "你觉得自己只是在说明事实和需要，但比较敏感的人可能会感到压力。直接能减少猜测，也需要留意表达时的语气。",
    misunderstoodAs:
      "容易被理解成只顾自己，但不替别人负责，不等于你不在乎别人。",
    memeScore: {
      label: "直说派",
      description: "有话就说清楚，少让大家互相猜。",
    },
    archiveQuote: "我们又不是小朋友，不是军训。",
    shareCopy: "我可以理解你为什么不开心。理解不等于我要按照你的情绪重新做人。",
    visualSymbol: "boundary",
  },
  zheng: {
    id: "zheng",
    punchline:
      "别人还没说和你有关，你已经先想自己是不是哪里做得不好。",
    coreAlgorithmTitle: "先看看是不是自己的问题",
    coreAnalysis:
      "你很容易关注自己的行为给别人带来的影响。聚会不顺利、朋友突然冷淡、事情没有按计划推进时，你会先检查自己是不是哪里没做好。",
    brightTitle: "你会认真面对自己的责任",
    brightSide:
      "对于承诺、安排以及自己对别人的影响，你通常很认真。遇到问题时，你愿意先看看自己能做什么。",
    bugTitle: "不是所有问题都需要你负责",
    shadowSide:
      "一件事和你有关，和一件事全部是你的问题，中间差得很远。别人可能只是今天心情不好，你却会反复回想自己是不是做错了什么。",
    misunderstoodAs:
      "容易被简单归类成想太多，但你确实认真、敏感，也愿意承担自己的部分。",
    memeScore: {
      label: "先自查",
      description: "遇到问题时，你通常先看看自己有没有需要改进的地方。",
    },
    archiveQuote: "特别死倔，特别轴。",
    shareCopy: "别人只是情绪不好，你已经开始回想自己是不是漏做了什么。",
    visualSymbol: "error-log",
  },
  chen: {
    id: "chen",
    punchline: "你看得懂气氛，但不一定愿意把时间都花在一场争执上。",
    coreAlgorithmTitle: "先判断这件事值不值得谈",
    coreAnalysis:
      "你能感觉到气氛和变化，但会继续判断：这件事值得我投入多少时间？如果继续争论也不能改善什么，你更愿意先把注意力放回自己的生活。",
    brightTitle: "你不容易被一场争执带走",
    brightSide:
      "关系出问题，不等于其他事情也要一起停下来。你比较能保住自己的体验和节奏。",
    bugTitle: "有些问题不能只靠不理会过去",
    shadowSide:
      "有些问题确实不值得争，但有些问题需要认真谈一次。如果你总是选择不处理，别人可能一直等不到你的明确回应，关系也会慢慢变淡。",
    misunderstoodAs: "容易被理解成什么都不在乎，但不参与争执和没有感受是两回事。",
    memeScore: {
      label: "先过好自己的",
      description: "你会看见问题，但不一定要把每个问题都变成自己的任务。",
    },
    archiveQuote: "我不想让大家知道我一直很受伤。",
    shareCopy: "不是所有问题都值得争到底。先把自己的生活过好，也是一种选择。",
    visualSymbol: "exit",
  },
  jing: {
    id: "jing",
    punchline: "别人还在犹豫，你已经开始想下一步怎么安排。",
    coreAlgorithmTitle: "看到问题，就想把事情安排好",
    coreAnalysis:
      "你不只是能察觉大家的状态，还会继续想：现在应该怎么办？气氛不对时，你会考虑怎么确认需要、重新安排事情，让大家还能继续行动。",
    brightTitle: "你能把想法变成行动",
    brightSide:
      "你不只是会说“气氛有点不对”，还会主动提出办法，让事情继续往下走。很多时候，有你在，大家更容易重新找到节奏。",
    bugTitle: "别人的问题不一定需要你来解决",
    shadowSide:
      "两个朋友不说话，你想帮忙；没人决定，你来组织；大家说随便，你继续追问。时间久了，也要问自己：这件事本来就是我负责的吗？",
    misunderstoodAs: "容易被夸成很会照顾人，但总是主动解决别人的问题，也可能让自己太累。",
    memeScore: {
      label: "行动派",
      description: "你会先想办法让事情继续，而不是只等别人来处理。",
    },
    archiveQuote: "实在不懂女人。",
    shareCopy: "一个群体超过三个人，你就很容易主动安排下一步，而且没人正式请你负责。",
    visualSymbol: "repair",
  },
  yang: {
    id: "yang",
    punchline: "别人还在猜，你更愿意按对方说的话理解。",
    coreAlgorithmTitle: "先按事实和明确信息判断",
    coreAnalysis:
      "你不会自动把每个行为都理解成人际关系信号。别人说想独处，你会尊重这句话；别人说都可以，你也会先按字面理解。你的注意力更多放在眼前的事情上。",
    brightTitle: "你不容易过度猜测",
    brightSide:
      "你不容易过度联想，也更容易尊重明确表达。别人还在猜测细节时，你能把注意力放回真正要做的事情。",
    bugTitle: "有时别人不会把话说得很明白",
    shadowSide:
      "当别人已经表现出很多暗示，你仍然可能只相信对方说出口的那句话。少猜一点会轻松，但在复杂关系里也可能晚一步发现变化。",
    misunderstoodAs: "容易被说成迟钝，但不过度猜测本身也是一种相处方式。",
    memeScore: {
      label: "拉完了",
      description: "这不是没感觉，只是你不太参加互相猜测的比赛。",
    },
    archiveQuote: "会来的吧！",
    shareCopy: "你更愿意把话当成话来听。恭喜，你可能只是认真来旅行，顺便遇到了复杂关系。",
    visualSymbol: "tourist",
  },
};
