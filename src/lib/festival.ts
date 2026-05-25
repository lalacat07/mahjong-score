export interface FestivalTheme {
  name: string;
  emoji: string;
  gradient: string;     // Tailwind gradient classes (for card header)
  cssGradient: string;  // CSS gradient string (for page header inline)
  pageBg: string;       // CSS light bg for whole page
  accent: string;
  cardBg: string;
  textColor: string;
}

interface FestivalDef extends FestivalTheme {
  check: (month: number, day: number) => boolean;
}

const festivals: FestivalDef[] = [
  {
    name: "春节",
    emoji: "🧧",
    gradient: "from-red-700 via-red-600 to-yellow-500",
    cssGradient: "linear-gradient(to right, #b91c1c, #dc2626, #eab308)",
    pageBg: "linear-gradient(135deg, #fff5f5 0%, #fffbeb 100%)",
    accent: "#fbbf24",
    cardBg: "bg-red-900/80",
    textColor: "text-yellow-300",
    check: (m, d) => (m === 1 && d <= 20) || (m === 2 && d <= 10),
  },
  {
    name: "元宵节",
    emoji: "🏮",
    gradient: "from-red-600 via-orange-500 to-yellow-400",
    cssGradient: "linear-gradient(to right, #dc2626, #f97316, #facc15)",
    pageBg: "linear-gradient(135deg, #fff8f0 0%, #fffde7 100%)",
    accent: "#fb923c",
    cardBg: "bg-orange-900/80",
    textColor: "text-yellow-200",
    check: (m, d) => m === 2 && d >= 11 && d <= 20,
  },
  {
    name: "清明节",
    emoji: "🌿",
    gradient: "from-green-800 via-green-600 to-emerald-400",
    cssGradient: "linear-gradient(to right, #166534, #16a34a, #34d399)",
    pageBg: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
    accent: "#34d399",
    cardBg: "bg-green-900/80",
    textColor: "text-emerald-200",
    check: (m, d) => m === 4 && d >= 4 && d <= 6,
  },
  {
    name: "端午节",
    emoji: "🐉",
    gradient: "from-green-700 via-teal-600 to-cyan-500",
    cssGradient: "linear-gradient(to right, #15803d, #0d9488, #06b6d4)",
    pageBg: "linear-gradient(135deg, #ecfdf5 0%, #ecfeff 100%)",
    accent: "#22d3ee",
    cardBg: "bg-teal-900/80",
    textColor: "text-cyan-200",
    check: (m, d) => m === 6 && d >= 5 && d <= 9,
  },
  {
    name: "七夕",
    emoji: "💫",
    gradient: "from-purple-800 via-pink-700 to-rose-500",
    cssGradient: "linear-gradient(to right, #6b21a8, #be185d, #f43f5e)",
    pageBg: "linear-gradient(135deg, #fdf4ff 0%, #fff1f2 100%)",
    accent: "#f472b6",
    cardBg: "bg-purple-900/80",
    textColor: "text-pink-200",
    check: (m, d) => m === 8 && d >= 10 && d <= 15,
  },
  {
    name: "中秋节",
    emoji: "🌕",
    gradient: "from-indigo-900 via-purple-800 to-amber-600",
    cssGradient: "linear-gradient(to right, #1e1b4b, #581c87, #d97706)",
    pageBg: "linear-gradient(135deg, #eef2ff 0%, #fffbeb 100%)",
    accent: "#fbbf24",
    cardBg: "bg-indigo-900/80",
    textColor: "text-amber-200",
    check: (m, d) => (m === 9 && d >= 15) || (m === 10 && d <= 5),
  },
  {
    name: "国庆节",
    emoji: "🎆",
    gradient: "from-red-800 via-red-600 to-orange-500",
    cssGradient: "linear-gradient(to right, #991b1b, #dc2626, #f97316)",
    pageBg: "linear-gradient(135deg, #fff1f2 0%, #fff7ed 100%)",
    accent: "#f97316",
    cardBg: "bg-red-900/80",
    textColor: "text-orange-200",
    check: (m, d) => m === 10 && d >= 1 && d <= 7,
  },
  {
    name: "小满",
    emoji: "🌾",
    gradient: "from-yellow-700 via-amber-500 to-lime-400",
    cssGradient: "linear-gradient(to right, #a16207, #d97706, #84cc16)",
    pageBg: "linear-gradient(135deg, #fefce8 0%, #f7fee7 100%)",
    accent: "#a3e635",
    cardBg: "bg-amber-900/80",
    textColor: "text-lime-200",
    check: (m, d) => m === 5 && d >= 20 && d <= 25,
  },
  {
    name: "圣诞节",
    emoji: "🎄",
    gradient: "from-green-800 via-red-700 to-green-600",
    cssGradient: "linear-gradient(to right, #166534, #b91c1c, #15803d)",
    pageBg: "linear-gradient(135deg, #f0fdf4 0%, #fff1f2 100%)",
    accent: "#ef4444",
    cardBg: "bg-green-900/80",
    textColor: "text-red-200",
    check: (m, d) => m === 12 && d >= 24 && d <= 26,
  },
  {
    name: "元旦",
    emoji: "🎊",
    gradient: "from-blue-800 via-indigo-700 to-purple-600",
    cssGradient: "linear-gradient(to right, #1e40af, #4338ca, #7c3aed)",
    pageBg: "linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%)",
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
  cssGradient: "linear-gradient(to right, #0f172a, #1e293b, #334155)",
  pageBg: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
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
        cssGradient: f.cssGradient,
        pageBg: f.pageBg,
        accent: f.accent,
        cardBg: f.cardBg,
        textColor: f.textColor,
      };
    }
  }

  return defaultTheme;
}
