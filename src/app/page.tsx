import { Metadata } from 'next';
import { SearchContainer } from '@/components/search';
import { FeatureHighlights } from '@/components/home/FeatureHighlights';
import { PlatformSection } from '@/components/home/PlatformSection';
import { HeroAnimations } from '@/components/home/HeroAnimations';

export const metadata: Metadata = {
  title: 'QuickCompare | One Search. Every Grocery App.',
  description: 'Compare prices across Zepto, Blinkit, BigBasket, and Swiggy Instamart in seconds. Find the best quick-commerce deals instantly.',
  openGraph: {
    title: 'QuickCompare | One Search. Every Grocery App.',
    description: 'Compare prices across Zepto, Blinkit, BigBasket, and Swiggy Instamart in seconds.',
    url: 'https://quickcompare.app',
    siteName: 'QuickCompare',
    images: [
      {
        url: 'https://quickcompare.app/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'QuickCompare - Grocery Price Comparison',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'QuickCompare | One Search. Every Grocery App.',
    description: 'Compare prices across Zepto, Blinkit, BigBasket, and Swiggy Instamart in seconds.',
    images: ['https://quickcompare.app/twitter-image.jpg'],
  },
  manifest: '/manifest.json',
};

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center pt-24 pb-32 px-4 overflow-hidden min-h-[85vh]">
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-muted/20 -z-10" />
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] opacity-30 bg-primary/20 blur-[120px] rounded-full -z-10" />
        
        <HeroAnimations>
          <div className="max-w-4xl mx-auto text-center space-y-6 z-10 relative">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground">
              One Search. <br className="md:hidden" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-500">
                Every Grocery App.
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Compare prices across Zepto, Blinkit, BigBasket, and Swiggy Instamart in seconds. Stop overpaying for your daily needs.
            </p>

            <div className="pt-8 w-full max-w-2xl mx-auto">
              {/* Search Container acts as the Hero Component */}
              <SearchContainer />
            </div>
          </div>
        </HeroAnimations>
      </section>

      {/* Feature Highlights Section */}
      <FeatureHighlights />

      {/* Supported Platforms Section */}
      <PlatformSection />
    </div>
  );
}
