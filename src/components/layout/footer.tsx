import Link from "next/link";
import { BrandLogo } from "@/components/icons/logo";

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background mt-auto">
      <div className="container mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-6">
          
          {/* Left: Branding */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <Link 
              href="/" 
              className="flex items-center gap-2 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md p-1 -ml-1"
            >
              <BrandLogo className="h-5 w-5 text-primary" />
              <span className="font-semibold tracking-tight text-foreground">
                QuickCompare
              </span>
            </Link>
            <p className="text-sm text-muted-foreground text-center md:text-left">
              Find the best quick-commerce prices, instantly.
            </p>
          </div>

          {/* Right: Links */}
          <div className="flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/about" className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
              About
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
              Terms
            </Link>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
              GitHub
            </a>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 flex flex-col md:flex-row items-center justify-between border-t border-border/40 pt-6 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} QuickCompare. All rights reserved.</p>
          <p className="mt-2 md:mt-0 font-mono tracking-tighter">v1.0.0-beta</p>
        </div>
      </div>
    </footer>
  );
}
