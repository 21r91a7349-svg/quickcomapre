"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch
  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div 
        className="w-9 h-9 rounded-md border border-border bg-background flex items-center justify-center opacity-50" 
        aria-hidden="true"
      >
         <div className="h-[1.2rem] w-[1.2rem] rounded-full bg-muted-foreground/20 animate-pulse" />
      </div>
    );
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <button
      onClick={toggleTheme}
      className="relative flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background hover:bg-muted text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`Toggle theme, current is ${resolvedTheme}`}
      title="Toggle theme"
    >
      <span className="sr-only">Toggle theme</span>
      <AnimatePresence mode="wait" initial={false}>
        {resolvedTheme === "light" ? (
          <motion.div
            key="sun"
            initial={{ opacity: 0, rotate: -45, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 45, scale: 0.5 }}
            transition={{ duration: 0.15 }}
          >
            <Sun className="h-[1.2rem] w-[1.2rem] text-foreground" />
          </motion.div>
        ) : (
          <motion.div
            key="moon"
            initial={{ opacity: 0, rotate: 45, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: -45, scale: 0.5 }}
            transition={{ duration: 0.15 }}
          >
            <Moon className="h-[1.2rem] w-[1.2rem] text-foreground" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
