'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDownToLine, Clock, Search, TrendingDown } from 'lucide-react';

const features = [
  {
    title: 'Fast Search',
    description: 'Find products instantly across multiple apps without switching contexts.',
    icon: <Search className="w-6 h-6 text-primary" />,
  },
  {
    title: 'Compare Prices',
    description: 'See side-by-side comparisons of the exact same product.',
    icon: <ArrowDownToLine className="w-6 h-6 text-primary" />,
  },
  {
    title: 'Track Price Drops',
    description: 'Get notified when your favorite groceries hit their lowest price.',
    icon: <TrendingDown className="w-6 h-6 text-primary" />,
  },
  {
    title: 'Price History',
    description: 'View historical price charts to know if you are getting a real deal.',
    icon: <Clock className="w-6 h-6 text-primary" />,
  },
];

export function FeatureHighlights() {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Why use QuickCompare?</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Stop overpaying and start saving time. We bring all your favorite quick-commerce platforms into one seamless experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              whileHover={{ y: -5 }}
              className="bg-background border border-border/50 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
