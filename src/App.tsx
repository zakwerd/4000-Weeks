import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, animate } from 'motion/react';
import { Calendar, ArrowRight, Info, User, X, Sun, Moon, Download, Soup, Bed, Bath } from 'lucide-react';
import { addWeeks, parseISO } from 'date-fns';
import { calculateWeeksLived, TOTAL_WEEKS, getWeekDate, getWeekStartDate, getCurrentFormattedDate } from './utils/dateUtils';
import { storageService, UserData } from './services/storageService';
import { QUOTES } from './constants/quotes';

const Digit: React.FC<{ value: number; index: number; isRolling: boolean }> = ({ value, index, isRolling }) => {
  const settleDuration = isRolling ? 0.14 + index * 0.035 : 0.1;
  const settleDelay = isRolling ? index * 0.02 : 0;

  return (
    <div className="relative w-[80px] h-[80px] overflow-hidden tabular-nums flex-shrink-0">
      <motion.div
        animate={{ y: -value * 80 }}
        transition={{ duration: settleDuration, delay: settleDelay, ease: [0.15, 0.85, 0.2, 1] }}
        className="flex flex-col items-center"
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <span key={n} className="text-7xl font-light italic h-[80px] flex items-center justify-center">
            {n}
          </span>
        ))}
      </motion.div>
    </div>
  );
};

const currentDotAnimate = {
  scale: [1, 1.5, 1, 1.5, 1, 1.5, 1, 1.5, 1, 1.5, 1],
  opacity: [1, 0.7, 1, 0.7, 1, 0.7, 1, 0.7, 1, 0.7, 1],
};

const currentDotTransition = {
  duration: 5,
  times: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
  repeat: Infinity,
  ease: 'easeInOut' as const,
};

type WeekDotProps = {
  index: number;
  year: number;
  isCurrent: boolean;
  isLived: boolean;
  hasJournal: boolean;
  isSelected: boolean;
  isStatWeek: boolean;
  isHighlighted: boolean;
  onHover: (week: number) => void;
  onToggleYear: (year: number) => void;
  onClickWeek: (week: number, isLived: boolean) => void;
};

type StatType = 'eat' | 'sleep' | 'hygiene';
const DOT_CLICK_DELAY_MS = 190;
const WEEK_GRID_COLUMNS = 100;

const WeekDot = React.memo(function WeekDot({
  index,
  year,
  isCurrent,
  isLived,
  hasJournal,
  isSelected,
  isStatWeek,
  isHighlighted,
  onHover,
  onToggleYear,
  onClickWeek,
}: WeekDotProps) {
  const className = `dot relative cursor-pointer hover:scale-125 hover:z-10 ${isCurrent ? 'dot-current' : isLived ? 'dot-filled' : 'dot-empty'
    } ${hasJournal ? 'dot-has-journal' : ''} ${isSelected ? 'ring-1 ring-white ring-offset-1 ring-offset-black' : ''
    } ${isStatWeek ? 'dot-stat' : ''} ${isHighlighted ? 'dot-highlighted' : ''}`;

  if (!isCurrent) {
    return (
      <div
        onMouseEnter={() => onHover(index)}
        onDoubleClick={() => onToggleYear(year)}
        onClick={() => onClickWeek(index, isLived)}
        role="button"
        tabIndex={0}
        aria-label={`Week ${index + 1}`}
        data-testid={`week-dot-${index}`}
        className={className}
      />
    );
  }

  return (
    <motion.div
      onMouseEnter={() => onHover(index)}
      onDoubleClick={() => onToggleYear(year)}
      onClick={() => onClickWeek(index, isLived)}
      role="button"
      tabIndex={0}
      aria-label={`Week ${index + 1}`}
      data-testid={`week-dot-${index}`}
      animate={currentDotAnimate}
      transition={currentDotTransition}
      className={className}
    />
  );
});

function AnimatedCounter({ target }: { target: number }) {
  const digits = target.toString().padStart(4, "0").split("").map(Number);

  return (
    <div className="flex items-end justify-center h-28">
      <div className="flex items-center gap-6">
        {digits.map((digit, i) => (
          <MechanicalDigit
            key={i}
            finalDigit={digit}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}

const MechanicalDigit: React.FC<{
  finalDigit: number;
  index: number;
}> = function MechanicalDigit({
  finalDigit,
  index,
}) {
  const digitHeight = 72;

  // Repeat digits multiple times so the scroll feels real.
  const strip = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
  ];

  // Start higher up so the digit visibly rolls.
  const startIndex = 20 - index * 2;
  const finalIndex = 20 + finalDigit;

  const y = useMotionValue(-startIndex * digitHeight);

  useEffect(() => {
    const controls = animate(y, -finalIndex * digitHeight, {
      duration: 1.4 + index * 0.25,
      ease: [0.12, 0.9, 0.18, 1],
    });

    return () => controls.stop();
  }, [finalIndex, digitHeight, index, y]);

  return (
    <div className="relative h-[72px] w-12 overflow-hidden">
      <motion.div style={{ y }} className="absolute left-0 top-0 w-full">
        {strip.map((n, i) => (
          <div
            key={i}
            className="h-[72px] flex items-center justify-center text-6xl font-light"
          >
            {n}
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default function App() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [journalEntries, setJournalEntries] = useState<string[]>(['', '', '']);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [unlivedFeedback, setUnlivedFeedback] = useState<number | null>(null);
  const [highlightedYear, setHighlightedYear] = useState<number | null>(null);
  const [activeStats, setActiveStats] = useState<Set<StatType>>(() => new Set());
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoveredWeekRef = useRef<number | null>(null);
  const journalPanelRef = useRef<HTMLDivElement | null>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const lived = useMemo(() => {
    if (!userData?.birthday) return 0;
    return calculateWeeksLived(userData.birthday);
  }, [userData?.birthday]);

  const weekIndexes = useMemo(() => {
    return Array.from({ length: TOTAL_WEEKS }, (_, i) => i);
  }, []);

  const weekYears = useMemo(() => {
    if (!userData?.birthday) return [] as number[];
    const birthDate = parseISO(userData.birthday);
    return weekIndexes.map((weekIndex) => addWeeks(birthDate, weekIndex).getFullYear());
  }, [userData?.birthday, weekIndexes]);

  const highlightedRange = useMemo(() => {
    if (highlightedYear === null || weekYears.length === 0) return null;

    let start = -1;
    let end = -1;

    for (let i = 0; i < weekYears.length; i++) {
      if (weekYears[i] === highlightedYear) {
        if (start === -1) start = i;
        end = i;
      }
    }

    if (end > lived) {
      const shift = end - lived;
      start = Math.max(0, start - shift);
      end = lived;
    }

    return { start, end };
  }, [highlightedYear, lived, weekYears]);

  const remainingWeeks = useMemo(() => {
    return Math.max(0, TOTAL_WEEKS - lived);
  }, [lived]);

  const completionPercent = useMemo(() => {
    return ((lived / TOTAL_WEEKS) * 100).toFixed(1);
  }, [lived]);

  const statWeeks = useMemo(() => {
    return {
      sleep: Math.round(lived * 0.333),
      eat: Math.round(lived * 0.0625),
      hygiene: Math.round(lived * 0.03125),
    };
  }, [lived]);

  const combinedStatWeeks = useMemo(() => {
    let total = 0;
    activeStats.forEach((stat) => {
      total += statWeeks[stat];
    });
    return Math.min(lived, total);
  }, [activeStats, lived, statWeeks]);

  const isStatActive = useCallback((stat: StatType) => activeStats.has(stat), [activeStats]);

  const handleStatClick = useCallback((stat: StatType) => {
    setActiveStats((prev) => {
      const next = new Set(prev);
      if (next.has(stat)) {
        next.delete(stat);
      } else {
        next.add(stat);
      }
      return next;
    });
  }, []);

  const updateHoveredWeek = useCallback((week: number | null) => {
    if (hoveredWeekRef.current === week) return;
    hoveredWeekRef.current = week;
    setHoveredWeek(week);
  }, []);

  const handleWeekHover = useCallback((week: number) => {
    updateHoveredWeek(week);
  }, [updateHoveredWeek]);

  const handleGridMouseLeave = useCallback(() => {
    updateHoveredWeek(null);
  }, [updateHoveredWeek]);

  const handleWeekToggleYear = useCallback((year: number) => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    setHighlightedYear((prev) => (prev === year ? null : year));
  }, []);

  const handleWeekClick = useCallback((week: number, isLivedWeek: boolean) => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }
    clickTimeoutRef.current = setTimeout(() => {
      if (isLivedWeek) {
        setHighlightedYear(null);
        setSelectedWeek((prev) => (prev === week ? null : week));
      } else {
        setUnlivedFeedback(week + 1);
      }
      clickTimeoutRef.current = null;
    }, DOT_CLICK_DELAY_MS);
  }, []);

  const weekGrid = useMemo(() => {
    if (!userData) return null;

    return (
      <div
        className="grid-container p-4 bg-[var(--card-bg)] border-[0.5px] border-[var(--border)] shadow-2xl"
        onMouseLeave={handleGridMouseLeave}
      >
        {weekIndexes.map((i) => {
          const isCurrent = i === lived;
          const isLived = i <= lived;
          const hasJournal = userData.journals?.[i];
          const year = weekYears[i] ?? 0;
          const isHighlighted = highlightedRange && i >= highlightedRange.start && i <= highlightedRange.end;
          const isStatWeek = i < combinedStatWeeks;

          return (
            <WeekDot
              key={i}
              index={i}
              year={year}
              isCurrent={isCurrent}
              isLived={isLived}
              hasJournal={Boolean(hasJournal)}
              isSelected={selectedWeek === i}
              isStatWeek={Boolean(isStatWeek)}
              isHighlighted={Boolean(isHighlighted)}
              onHover={handleWeekHover}
              onToggleYear={handleWeekToggleYear}
              onClickWeek={handleWeekClick}
            />
          );
        })}
      </div>
    );
  }, [
    combinedStatWeeks,
    handleGridMouseLeave,
    handleWeekClick,
    handleWeekHover,
    handleWeekToggleYear,
    highlightedRange,
    lived,
    selectedWeek,
    userData,
    weekIndexes,
    weekYears,
  ]);

  const dailyQuote = useMemo(() => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    return QUOTES[dayOfYear % QUOTES.length];
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const data = await storageService.getUserData();
      if (data) {
        setUserData(data);
      }

      // Load theme from localStorage (simple preference)
      const savedTheme = localStorage.getItem('4000weeks_theme') as 'dark' | 'light';
      if (savedTheme) {
        setTheme(savedTheme);
      }

      setIsLoaded(true);
    };
    loadData();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('4000weeks_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (selectedWeek !== null && userData?.journals) {
      const entries = userData.journals[selectedWeek];
      setJournalEntries(Array.isArray(entries) && entries.length === 3 ? entries : ['', '', '']);
    } else {
      setJournalEntries(['', '', '']);
    }
  }, [selectedWeek, userData]);

  useEffect(() => {
    if (unlivedFeedback !== null) {
      const timer = setTimeout(() => setUnlivedFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [unlivedFeedback]);

  const handleOnboarding = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: UserData = {
      birthday: formData.get('birthday') as string,
      journals: userData?.journals || {},
    };
    await storageService.saveUserData(data);
    setUserData(data);
    setIsEditing(false);
  };

  const saveJournal = async (index: number, value: string) => {
    if (selectedWeek === null || !userData) return;

    const newEntries = [...journalEntries];
    newEntries[index] = value;
    setJournalEntries(newEntries);

    const newJournals = { ...userData.journals, [selectedWeek]: newEntries };
    const newData = { ...userData, journals: newJournals };

    await storageService.saveUserData(newData);
    setUserData(newData);
  };

  const downloadJournal = () => {
    if (!userData || !userData.journals) return;

    let content = '# 4000 Weeks Journal\n\n';
    const sortedWeeks = Object.keys(userData.journals)
      .map(Number)
      .sort((a, b) => a - b);

    let entriesFound = false;
    for (const weekIndex of sortedWeeks) {
      const entries = userData.journals[weekIndex];
      if (Array.isArray(entries) && entries.some(e => typeof e === 'string' && e.trim() !== '')) {
        entriesFound = true;
        const dateStr = getWeekDate(userData.birthday, weekIndex);
        content += `## Week ${weekIndex + 1} (${dateStr})\n`;
        entries.forEach((entry, i) => {
          if (typeof entry === 'string' && entry.trim() !== '') {
            content += `- Journal ${i + 1}: ${entry.trim()}\n`;
          }
        });
        content += '\n';
      }
    }

    if (!entriesFound) {
      alert('No journal entries found to download.');
      return;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '4000-weeks-journal.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    mouseX.set(e.clientX);
    mouseY.set(e.clientY);
  };

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (selectedWeek === null) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!journalPanelRef.current || !target) return;
      if (!journalPanelRef.current.contains(target)) {
        setSelectedWeek(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [selectedWeek]);

  useEffect(() => {
    if (selectedWeek === null) return;

    const maxSelectableWeek = Math.max(0, lived);
    const handleArrowNavigation = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || target.isContentEditable) return;
      }

      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;

      event.preventDefault();
      if (event.key === 'ArrowLeft') {
        setSelectedWeek((prev) => (prev === null ? prev : Math.max(0, prev - 1)));
      } else if (event.key === 'ArrowRight') {
        setSelectedWeek((prev) => (prev === null ? prev : Math.min(maxSelectableWeek, prev + 1)));
      } else if (event.key === 'ArrowUp') {
        setSelectedWeek((prev) => (prev === null ? prev : Math.max(0, prev - WEEK_GRID_COLUMNS)));
      } else if (event.key === 'ArrowDown') {
        setSelectedWeek((prev) => (prev === null ? prev : Math.min(maxSelectableWeek, prev + WEEK_GRID_COLUMNS)));
      }
    };

    window.addEventListener('keydown', handleArrowNavigation);
    return () => {
      window.removeEventListener('keydown', handleArrowNavigation);
    };
  }, [selectedWeek, lived]);

  if (!isLoaded) return null;

  return (
    <div
      onMouseMove={handleMouseMove}
      className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col items-center justify-center p-4 pb-28 md:p-8 md:pb-32 2xl:px-[2in] transition-colors duration-300"
    >
      <AnimatePresence mode="wait">
        {!userData || isEditing ? (
          <motion.div
            key="onboarding"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            data-testid="onboarding-region"
            className="w-full max-w-md space-y-8"
          >
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-light tracking-tighter italic serif">4000 Weeks</h1>
              <p className="text-zinc-500 text-sm uppercase tracking-widest">
                {isEditing ? 'Update your birthday' : 'Memento Mori'}
              </p>
            </div>

            <form onSubmit={handleOnboarding} className="space-y-6 bg-[var(--card-bg)] p-8 rounded-3xl border border-[var(--border)] backdrop-blur-xl">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold ml-1">Birthday</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    required
                    type="date"
                    name="birthday"
                    aria-label="Birthday"
                    data-testid="birthday-input"
                    defaultValue={userData?.birthday}
                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 bg-zinc-800 text-white font-semibold py-3 rounded-xl hover:bg-zinc-700 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-[2] bg-[var(--ink)] text-[var(--bg)] font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-colors group"
                >
                  {isEditing ? 'Save Changes' : 'Begin Countdown'}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            data-testid="new-tab-content"
            className="w-full max-w-5xl flex flex-col items-center gap-10"
          >
            <div className="w-full flex flex-col items-center gap-2 relative">
              <div className="text-center" data-testid="life-counter-region">
                <AnimatedCounter target={remainingWeeks} />
                <div className="flex flex-col items-center gap-1.25">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                    {completionPercent}% complete
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-400 font-bold">
                    WEEK {lived + 1} — {getCurrentFormattedDate()}
                  </p>

                  <div className="flex gap-6 mt-4" data-testid="interactive-units-region">
                    <button
                      onClick={() => handleStatClick('eat')}
                      className={`transition-all duration-300 ${isStatActive('eat') ? 'text-white scale-125' : activeStats.size > 0 ? 'text-zinc-500 opacity-70' : 'text-zinc-400 hover:text-zinc-200'}`}
                      title="Time spent eating so far (~6.3%)"
                    >
                      <Soup className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleStatClick('hygiene')}
                      className={`transition-all duration-300 ${isStatActive('hygiene') ? 'text-white scale-125' : activeStats.size > 0 ? 'text-zinc-500 opacity-70' : 'text-zinc-400 hover:text-zinc-200'}`}
                      title="Time spent on hygiene so far (~3.1%)"
                    >
                      <Bath className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleStatClick('sleep')}
                      className={`transition-all duration-300 ${isStatActive('sleep') ? 'text-white scale-125' : activeStats.size > 0 ? 'text-zinc-500 opacity-70' : 'text-zinc-400 hover:text-zinc-200'}`}
                      title="Time spent sleeping so far (~33.3%)"
                    >
                      <Bed className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="h-12 mt-2 w-full max-w-md flex items-center justify-center" data-testid="quote-region">
                    <AnimatePresence mode="wait">
                      {showInfo ? (
                        <motion.div
                          key="info-text"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="w-full text-center text-zinc-500 text-[10px] leading-relaxed space-y-1 pointer-events-none"
                        >
                          <p className="italic">
                            "The average human lifespan is absurdly, insultingly brief.
                            If you live to be eighty, you have just over four thousand weeks."
                          </p>
                          <p className="uppercase tracking-widest text-[8px] font-bold">
                            — Oliver Burkeman, 4000 Weeks
                          </p>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="daily-quote"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="w-full text-center text-zinc-500 text-[10px] leading-relaxed space-y-1 pointer-events-none"
                        >
                          <p className="italic font-serif tracking-wide text-zinc-400">
                            "{dailyQuote.text}"
                          </p>
                          <p className="uppercase tracking-[0.3em] text-[7px] font-bold opacity-60">
                            — {dailyQuote.author}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

            <div className="absolute right-0 top-0 flex gap-2">
                <button
                  onClick={downloadJournal}
                  className="p-2 text-zinc-700 hover:text-white transition-colors"
                  title="Download Journal"
                >
                  <Download className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="p-2 text-zinc-700 hover:text-white transition-colors"
                  title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  {theme === 'dark' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-zinc-700 hover:text-white transition-colors"
                  title="Account Settings"
                >
                  <User className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setShowInfo(!showInfo)}
                  className="p-2 text-zinc-700 hover:text-white transition-colors"
                >
                  <Info className="w-3 h-3" />
                </button>
              </div>
            </div>            <div className="relative flex flex-col items-center" data-testid="week-grid-region">
              <AnimatePresence mode="wait">
                {hoveredWeek !== null && (
                  <motion.p
                    key="hover-date"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute -top-9 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-[0.2em] text-accent font-bold whitespace-nowrap leading-none pointer-events-none"
                  >
                    Week {hoveredWeek + 1} • {getWeekStartDate(userData.birthday, hoveredWeek)}
                  </motion.p>
                )}
              </AnimatePresence>

              {weekGrid}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedWeek !== null && (
          <>
            <motion.div
              ref={journalPanelRef}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              data-testid="journal-section"
              className="fixed right-0 top-0 h-full w-full max-w-sm bg-[var(--bg)] border-l border-[var(--border)] shadow-2xl z-50 flex flex-col"
            >
              <div className="p-6 border-b border-[var(--border)] flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-light italic tracking-tight">
                    {getWeekDate(userData!.birthday, selectedWeek)}
                  </h3>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                    Week {selectedWeek + 1}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedWeek(null)}
                  className="p-2 text-zinc-500 hover:text-[var(--ink)] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
                {[149, 109, 79].map((limit, i) => (
                  <div key={i} className="space-y-2">
                    <label className="text-[9px] uppercase tracking-[0.2em] text-zinc-600 font-bold ml-1">
                      Journal 0{i + 1}
                    </label>
                    <div className="relative">
                      <textarea
                        value={journalEntries[i]}
                        onChange={(e) => saveJournal(i, e.target.value)}
                        maxLength={limit}
                        placeholder="What's on your mind?"
                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl p-4 pb-8 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors resize-none leading-relaxed h-32"
                      />
                      <div className="absolute bottom-3 right-4 text-[9px] font-mono text-zinc-500 tabular-nums pointer-events-none">
                        {journalEntries[i].length}/{limit}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 border-t border-[var(--border)] bg-[var(--card-bg)]">
                <p className="text-[9px] text-center text-zinc-600 uppercase tracking-widest">
                  Changes are saved automatically
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Momento Vivere */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center">
        <div className="h-5 mb-2 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {unlivedFeedback !== null && (
              <motion.p
                key="unlived-feedback"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-medium"
              >
                Week {unlivedFeedback} has not yet been lived.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          className="text-sm font-light italic tracking-[0.5em] uppercase serif"
        >
          Momento Vivere
        </motion.p>
      </div>

      <a
        href="https://juicedup.cargo.site/"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed top-4 left-4 text-sm uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-300 transition-colors z-20"
      >
        MORE JUICE
      </a>

      {/* Mouse Tooltip */}
      <AnimatePresence>
        {hoveredWeek !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
              position: 'fixed',
              left: mouseX,
              top: mouseY,
              x: 15,
              y: -15,
              pointerEvents: 'none',
              zIndex: 100,
            }}
            className="bg-[var(--ink)] text-[var(--bg)] px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider shadow-xl"
          >
            {hoveredWeek + 1}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
