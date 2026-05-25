export interface FestivalTheme {
  name: string;
  emoji: string;
  gradient: string;
  accent: string;
  cardBg: string;
  textColor: string;
}

interface FestivalDef {
  name: string;
  emoji: string;
  gradient: string;
  accent: string;
  cardBg: string;
  textColor: string;
  check: (month: number, day: number) => boolean;
}

const festivals: FestivalDef[] = [
  {
    name: "春节",
    emoji: "🧧",
    gradient: "from-red-700 via-red-600 to-yellow-500",
    accent: "#fbbf24",
    cardBg: "bg-red-900/80",
    textColor: "text-yellow-300",
    check: (m, d) => (m === 1 && d <= 20) || (m === 2 && d <= 10),
  },
  {
    name: "元宵节",
    emoji: "🏮",
    gradient: "from-red-600 via-orange-500 to-yellow-400",
    accent: "#fb923c",
    cardBg: "bg-orange-900/80",
    textColor: "text-yellow-200",
    check: (m, d) => m === 2 && d >= 11 && d <= 20,
  },
  {
    name: "清明节",
    emoji: "🌿",
    gradient: "from-green-800 via-green-600 to-emerald-400",
    accent: "#34d399",
    cardBg: "bg-green-900/80",
    textColor: "text-emerald-200",
    check: (m, d) => m === 4 && d >= 4 && d <= 6,
  },
  {
    name: "端午节",
    emoji: "🐉",
    gradient: "from-green-700 via-teal-600 to-cyan-500",
    accent: "#22d3ee",
    cardBg: "bg-teal-900/80",
    textColor: "text-cyan-200",
    check: (m, d) => m === 6 && d >= 5 && d <= 9,
  },
  {
    name: "七夕",
    emoji: "💫",
    gradient: "from-purple-800 via-pink-700 to-rose-500",
    accent: "#f472b6",
    cardBg: "bg-purple-900/80",
    textColor: "text-pink-200",
    check: (m, d) => m === 8 && d >= 10 && d <= 15,
  },
  {
    name: "中秋节",
    emoji: "🌕",
    gradient: "from-indigo-900 via-purple-800 to-amber-600",
    accent: "#fbbf24",
    cardBg: "bg-indigo-900/80",
    textColor: "text-amber-200",
    check: (m, d) => (m === 9 && d >= 15) || (m === 10 && d <= 5),
  },
  {
    name: "国庆节",
    emoji: "🎆",
    gradient: "from-red-800 via-red-600 to-orange-500",
    accent: "#f97316",
    cardBg: "bg-red-900/80",
    textColor: "text-orange-200",
    check: (m, d) => m === 10 && d >= 1 && d <= 7,
  },
  {
    name: "小满",
    emoji: "🌾",
    gradient: "from-yellow-700 via-amber-500 to-lime-400",
    accent: "#a3e635",
    cardBg: "bg-amber-900/80",
    textColor: "text-lime-200",
    check: (m, d) => m === 5 && d >= 20 && d <= 25,
  },
  {
    name: "圣诞节",
    emoji: "🎄",
    gradient: "from-green-800 via-red-700 to-green-600",
    accent: "#ef4444",
    cardBg: "bg-green-900/80",
    textColor: "text-red-200",
    check: (m, d) => m === 12 && d >= 24 && d <= 26,
  },
  {
    name: "元旦",
    emoji: "🎊",
    gradient: "from-blue-800 via-indigo-700 to-purple-600",
    accent: "#818cf8",
    cardBg: "bg-blue-900/80",
    textColor: "text-indigo-200",
    check: (m, d) => m === 1 && d === 1,
  },
];

const defaultTheme: FestivalTheme = {
  name: "默认",
  emoji: "🀄",
  gradient: "from-slate-900 via-slate-800 to-slate-700",
  accent: "#38bdf8",
  cardBg: "bg-slate-800/80",
  textColor: "text-sky-300",
};

export function getFestivalTheme(dateStr?: string): FestivalTheme {
  const d = dateStr ? new Date(dateStr) : new Date();
  const month = d.getMonth() + 1;
  const day = d.getDate();

  for (const f of festivals) {
    if (f.check(month, day)) {
      return {
        name: f.name,
        emoji: f.emoji,
        gradient: f.gradient,
        accent: f.accent,
        cardBg: f.cardBg,
        textColor: f.textColor,
      };
    }
  }

  return defaultTheme;
}
