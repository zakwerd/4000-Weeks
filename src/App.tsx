import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'motion/react';
import { Calendar, Mail, ArrowRight, RefreshCcw, Info, User, X, Save, Sun, Moon, Download, Soup, Bed, Bath } from 'lucide-react';
import { calculateWeeksLived, TOTAL_WEEKS, getWeekDate, getYearFromWeek, getCurrentFormattedDate } from './utils/dateUtils';
import { storageService, UserData } from './services/storageService';
import { QUOTES } from './constants/quotes';

const Digit: React.FC<{ value: number }> = ({ value }) => {
  return (
    <div className="relative w-[80px] h-[80px] overflow-hidden tabular-nums flex-shrink-0">
      <motion.div
        animate={{ y: -value * 80 }}
        transition={{ duration: 0.1, ease: "easeOut" }}
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

function AnimatedCounter({ target }: { target: number }) {
  const count = useMotionValue(4000);
  const [displayValue, setDisplayValue] = useState(4000);

  useEffect(() => {
    const controls = animate(count, target, {
      duration: 3,
      ease: [0.76, 0, 0.24, 1],
      onUpdate: (latest) => setDisplayValue(Math.round(latest)),
    });
    return () => controls.stop();
  }, [target, count]);

  const digits = displayValue.toString().padStart(4, '0').split('').map(Number);

  return (
    <div className="flex items-center justify-center h-24 gap-6">
      {digits.map((digit, i) => (
        <Digit key={i} value={digit} />
      ))}
    </div>
  );
}

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
  const [activeStat, setActiveStat] = useState<'eat' | 'sleep' | 'hygiene' | null>(null);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const lived = useMemo(() => {
    if (!userData?.birthday) return 0;
    return calculateWeeksLived(userData.birthday);
  }, [userData?.birthday]);

  const highlightedRange = useMemo(() => {
    if (highlightedYear === null || !userData?.birthday) return null;
    
    let start = -1;
    let end = -1;
    
    for (let i = 0; i < TOTAL_WEEKS; i++) {
      if (getYearFromWeek(userData.birthday, i) === highlightedYear) {
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
  }, [highlightedYear, userData?.birthday, lived]);

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

  const resetData = async () => {
    if (confirm('Are you sure you want to reset your data?')) {
      await storageService.removeUserData();
      setUserData(null);
    }
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

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '4000-weeks-journal.md';
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

  if (!isLoaded) return null;

  return (
    <div 
      onMouseMove={handleMouseMove}
      className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col items-center justify-center p-4 md:p-8 transition-colors duration-300"
    >
      <AnimatePresence mode="wait">
        {!userData || isEditing ? (
          <motion.div
            key="onboarding"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
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
            className="w-full max-w-5xl flex flex-col items-center gap-16"
          >
            <div className="w-full flex flex-col items-center gap-2 relative">
              <div className="text-center">
                <AnimatedCounter target={TOTAL_WEEKS - calculateWeeksLived(userData.birthday)} />
                <div className="flex flex-col items-center gap-1.5">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                    {((calculateWeeksLived(userData.birthday) / TOTAL_WEEKS) * 100).toFixed(1)}% complete
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-400 font-bold">
                    WEEK {lived + 1} — {getCurrentFormattedDate()}
                  </p>
                  
                  <div className="flex gap-6 mt-4">
                    <button 
                      onClick={() => setActiveStat(activeStat === 'eat' ? null : 'eat')}
                      className={`transition-all duration-300 ${activeStat === 'eat' ? 'text-white scale-125' : activeStat ? 'text-zinc-800 opacity-40' : 'text-zinc-400 hover:text-zinc-200'}`}
                      title="Time spent eating so far (~6.3%)"
                    >
                      <Soup className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setActiveStat(activeStat === 'hygiene' ? null : 'hygiene')}
                      className={`transition-all duration-300 ${activeStat === 'hygiene' ? 'text-white scale-125' : activeStat ? 'text-zinc-800 opacity-40' : 'text-zinc-400 hover:text-zinc-200'}`}
                      title="Time spent on hygiene so far (~3.1%)"
                    >
                      <Bath className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setActiveStat(activeStat === 'sleep' ? null : 'sleep')}
                      className={`transition-all duration-300 ${activeStat === 'sleep' ? 'text-white scale-125' : activeStat ? 'text-zinc-800 opacity-40' : 'text-zinc-400 hover:text-zinc-200'}`}
                      title="Time spent sleeping so far (~33.3%)"
                    >
                      <Bed className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="h-4 mt-2">
                    <AnimatePresence mode="wait">
                      {hoveredWeek !== null && (
                        <motion.p 
                          key="hover-date"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="text-[9px] uppercase tracking-[0.2em] text-accent font-bold"
                        >
                          Week {hoveredWeek + 1} • {getWeekDate(userData.birthday, hoveredWeek)}
                        </motion.p>
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
                <button 
                  onClick={resetData}
                  className="p-2 text-zinc-700 hover:text-white transition-colors"
                >
                  <RefreshCcw className="w-3 h-3" />
                </button>
              </div>
            </div>            <div className="relative flex flex-col items-center">
              <AnimatePresence mode="wait">
                {showInfo ? (
                  <motion.div 
                    key="info-text"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute -top-14 left-1/2 -translate-x-1/2 w-full max-w-md text-center text-zinc-500 text-[10px] leading-relaxed space-y-1 pointer-events-none"
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
                    className="absolute -top-14 left-1/2 -translate-x-1/2 w-full max-w-md text-center text-zinc-500 text-[10px] leading-relaxed space-y-1 pointer-events-none"
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

              <div className="grid-container p-4 bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] shadow-2xl">
                {Array.from({ length: TOTAL_WEEKS }).map((_, i) => {
                  const isCurrent = i === lived;
                  const isLived = i < lived;
                  const hasJournal = userData.journals?.[i];
                  const year = getYearFromWeek(userData.birthday, i);
                  const isHighlighted = highlightedRange && i >= highlightedRange.start && i <= highlightedRange.end;
                  
                  const statWeeks = {
                    sleep: Math.round(lived * 0.333),
                    eat: Math.round(lived * 0.0625),
                    hygiene: Math.round(lived * 0.03125)
                  };
                  const isStatWeek = activeStat && i < statWeeks[activeStat];

                  return (
                    <motion.div
                      key={i}
                      onMouseEnter={() => {
                        setHoveredWeek(i);
                        if (selectedWeek !== null && isLived) {
                          setSelectedWeek(i);
                        }
                      }}
                      onMouseLeave={() => setHoveredWeek(null)}
                      onDoubleClick={() => {
                        if (clickTimeoutRef.current) {
                          clearTimeout(clickTimeoutRef.current);
                          clickTimeoutRef.current = null;
                        }
                        if (highlightedYear === year) {
                          setHighlightedYear(null);
                        } else {
                          setHighlightedYear(year);
                        }
                      }}
                      onClick={() => {
                        if (clickTimeoutRef.current) {
                          clearTimeout(clickTimeoutRef.current);
                        }
                        clickTimeoutRef.current = setTimeout(() => {
                          if (isLived) {
                            setSelectedWeek(i);
                          } else {
                            setUnlivedFeedback(i + 1);
                          }
                          clickTimeoutRef.current = null;
                        }, 250);
                      }}
                      animate={isCurrent ? {
                        scale: [1, 1.5, 1, 1.5, 1, 1.5, 1, 1.5, 1, 1.5, 1],
                        opacity: [1, 0.7, 1, 0.7, 1, 0.7, 1, 0.7, 1, 0.7, 1]
                      } : {}}
                      transition={isCurrent ? {
                        duration: 5,
                        times: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                        repeat: Infinity,
                        ease: "easeInOut"
                      } : {}}
                      className={`dot cursor-pointer ${
                        isCurrent ? 'dot-current' : isLived ? 'dot-filled' : 'dot-empty'
                      } ${hoveredWeek === i ? 'scale-150 z-10' : ''} ${
                        hasJournal ? 'dot-has-journal' : ''
                      } ${selectedWeek === i ? 'ring-1 ring-white ring-offset-1 ring-offset-black' : ''} ${
                        isStatWeek ? 'dot-stat' : ''
                      } ${isHighlighted ? 'dot-highlighted' : ''}`}
                    />
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedWeek !== null && (
          <>
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
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
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center">
        <AnimatePresence>
          {unlivedFeedback !== null && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2 font-medium"
            >
              Week {unlivedFeedback} has not yet been lived.
            </motion.p>
          )}
        </AnimatePresence>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          className="text-sm font-light italic tracking-[0.5em] uppercase serif"
        >
          Momento Vivere
        </motion.p>
      </div>

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
