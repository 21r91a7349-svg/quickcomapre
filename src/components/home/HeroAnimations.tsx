'use client';

import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';

export function HeroAnimations({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="w-full relative z-10"
    >
      {children}
    </motion.div>
  );
}
