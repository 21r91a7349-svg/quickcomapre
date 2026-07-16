'use client';

import React from 'react';
import { motion } from 'framer-motion';

const platforms = [
  { name: 'Zepto', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { name: 'Blinkit', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { name: 'BigBasket', color: 'text-green-600', bg: 'bg-green-600/10' },
  { name: 'Swiggy Instamart', color: 'text-orange-500', bg: 'bg-orange-500/10' },
];

export function PlatformSection() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 max-w-6xl text-center">
        <h2 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase mb-10">
          Supported Platforms
        </h2>
        
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
          {platforms.map((platform, index) => (
            <motion.div
              key={platform.name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="flex items-center justify-center grayscale hover:grayscale-0 transition-all duration-300"
            >
              <div className={`px-6 py-3 rounded-full ${platform.bg} border border-border/50 font-bold text-xl ${platform.color}`}>
                {platform.name}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
