export const GREETINGS = {
  morning: [
    "早上好，一日之计，始于清晰的判断。",
    "早上好，先预演棋局，再走进战场。",
    "早上好，繁杂的一天，从理清思路开始。",
    "早上好，在混乱涌来之前，先建立内心的秩序。",
    "早上好，今天的战略定力，决定今晚的战果。"
  ],
  noon: [
    "中午好，短暂的抽离，是为了更好地冲锋。",
    "中午好，给大脑一个空隙，让直觉归位。",
    "中午好，半场休息，正是调整战术的时机。",
    "中午好，在喧嚣的间隙，找回自己的节奏。",
    "中午好，哪怕只有十分钟，试着只关注当下。"
  ],
  afternoon: [
    "下午好，在喧嚣之外，找回决策的定力。",
    "下午好，把焦虑留在这里，把决策带回会场。",
    "下午好，越是复杂的局势，越需要简单的逻辑。",
    "下午好，与其在脑海中纠结，不如在这里推演。",
    "下午好，在这个安全空间，卸下防备说真话。"
  ],
  evening: [
    "晚上好，卸下角色的面具，回到真实的思考。",
    "晚上好，不管得失如何，今天已经过去了。",
    "晚上好，这一刻的宁静，只属于你自己。",
    "晚上好，复盘这一天，是为了明天不再重复。",
    "晚上好，关上办公室的门，做回你自己。"
  ],
  night: [
    "夜深了，孤独是决策者的宿命，但我在这里。",
    "夜深了，万籁俱寂，正是复盘的好时候。",
    "夜深了，甚至连对手都睡了，这是你的时间。",
    "夜深了，别太苛求自己，你已经做得很好。",
    "夜深了，把担忧写下来，然后安心去睡。"
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
