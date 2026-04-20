export const GREETINGS = {
  morning: [
    "早上好，一日之计，始于清晰的判断。",
    "早上好，先预演棋局，再走进战场。",
    "早上好，繁杂的一天，从理清思路开始。",
    "早上好，在混乱涌来之前，先建立内心的秩序。",
    "早上好，今天的战略定力，决定今晚的战果。",
    "早上好，别让紧急的事，挤掉了重要的事。",
    "早上好，你的情绪是团队的风向标，今天准备传递什么信号？",
    "早上好，在所有会议开始前，先想清楚那件‘必须做’的事。",
    "早上好，一流的决策者，从不让日程表控制自己。",
    "早上好，与其关注昨天没做完的，不如聚焦今天能改变的。"
  ],
  noon: [
    "中午好，短暂的抽离，是为了更好地冲锋。",
    "中午好，给大脑一个空隙，让直觉归位。",
    "中午好，半场休息，正是调整战术的时机。",
    "中午好，在喧嚣的间隙，找回自己的节奏。",
    "中午好，哪怕只有十分钟，试着只关注当下。",
    "中午好，跳出战壕看一眼，方向往往比速度更重要。",
    "中午好，在这个噪杂的中场，在该沉默的时候保持沉默。",
    "中午好，战略不仅是决定做什么，更是决定不做什么。",
    "中午好，如果感觉不对劲，相信你的直觉，现在就停下来检查。",
    "中午好，最高效的午休，是让大脑彻底‘离线’十分钟。"
  ],
  afternoon: [
    "下午好，在喧嚣之外，找回决策的定力。",
    "下午好，把焦虑留在这里，把决策带回会场。",
    "下午好，越是复杂的局势，越需要简单的逻辑。",
    "下午好，与其在脑海中纠结，不如在这里推演。",
    "下午好，在这个安全空间，卸下防备说真话。",
    "下午好，疲惫时刻的决策，最考验一把手的定力。",
    "下午好，这就是你要面对的真相，无论它多难看。",
    "下午好，不要用战术上的勤奋，掩盖战略上的懒惰。",
    "下午好，现在的每一个妥协，都可能在未来付出代价。"
  ],
  evening: [
    "晚上好，卸下角色的面具，回到真实的思考。",
    "晚上好，不管得失如何，今天已经过去了。",
    "晚上好，这一刻的宁静，只属于你自己。",
    "晚上好，复盘这一天，是为了明天不再重复。",
    "晚上好，关上办公室的门，做回你自己。",
    "晚上好，最好的战略定力，是知道何时该彻底停下来。",
    "晚上好，把身份留在办公室，把生活还给自己。",
    "晚上好，今天你已经做了足够多的决定，现在允许自己不做决定。",
    "晚上好，无论胜负，这局棋今天已经下完了。",
    "晚上好，哪怕你是超人，也需要回到地面。"
  ],
  night: [
    "夜深了，孤独是决策者的宿命，但我在这里。",
    "夜深了，万籁俱寂，正是复盘的好时候。",
    "夜深了，甚至连对手都睡了，这是你的时间。",
    "夜深了，别太苛求自己，你已经做得很好。",
    "夜深了，把担忧写下来，然后安心去睡。",
    "夜深了，伟大的决策往往诞生于孤独，但你无需独自承受。",
    "夜深了，在这个没人看见的角落，诚实地面对你的野心。",
    "夜深了，焦虑是能力的伴生品，试着与它和平共处。",
    "夜深了，如果不考虑任何人的期待，你真正想要的是什么？",
    "夜深了，星星在看着你，世界并没有你想象的那么严苛。"
  ]
};

export function getGreeting(): { title: string; content: string } {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = hours * 60 + minutes;

  let timeSlot: keyof typeof GREETINGS;

  // 05:00 - 11:30 (300 - 690)
  if (currentTime >= 300 && currentTime < 690) {
    timeSlot = "morning";
  }
  // 11:30 - 13:30 (690 - 810)
  else if (currentTime >= 690 && currentTime < 810) {
    timeSlot = "noon";
  }
  // 13:30 - 18:00 (810 - 1080)
  else if (currentTime >= 810 && currentTime < 1080) {
    timeSlot = "afternoon";
  }
  // 18:00 - 23:00 (1080 - 1380)
  else if (currentTime >= 1080 && currentTime < 1380) {
    timeSlot = "evening";
  }
  // 23:00 - 05:00 (1380 - 1440 OR 0 - 300)
  else {
    timeSlot = "night";
  }

  const messages = GREETINGS[timeSlot];
  const randomIndex = Math.floor(Math.random() * messages.length);
  const fullMessage = messages[randomIndex];
  
  // Split by the first comma
  const firstCommaIndex = fullMessage.indexOf("，");
  if (firstCommaIndex !== -1) {
    return {
      title: fullMessage.substring(0, firstCommaIndex),
      content: fullMessage.substring(firstCommaIndex + 1) // +1 to skip the comma
    };
  }
  
  return { title: "", content: fullMessage };
}
