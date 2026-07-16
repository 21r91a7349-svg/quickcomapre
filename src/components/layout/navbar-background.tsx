"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function NavbarBackground() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  
  // Home page starts transparent. Other pages are always solid/glass.
  const isHome = pathname === "/";

  useEffect(() => {
    if (!isHome) return;

    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    // Initial check
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHome]);

  const isActive = !isHome || scrolled;

  return (
    <div 
      className={`absolute inset-0 transition-colors duration-300 ${
        isActive 
          ? "bg-background/80 backdrop-blur-md border-b border-border/40 shadow-sm" 
          : "bg-transparent border-b-transparent"
      }`} 
      aria-hidden="true"
    />
  );
}
