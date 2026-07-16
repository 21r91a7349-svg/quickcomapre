import Link from "next/link";
import { BrandLogo } from "@/components/icons/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NavbarBackground } from "./navbar-background";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { auth } from "@/auth";

export async function Navbar() {
  const session = await auth();
  return (
    <header className="fixed top-0 left-0 right-0 z-[var(--z-index-sticky)] w-full transition-transform">
      <NavbarBackground />
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 relative z-10">
        
        {/* Left: Branding */}
        <div className="flex flex-1 items-center justify-start">
          <Link 
            href="/" 
            className="flex items-center gap-2 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md p-1 -ml-1"
            aria-label="QuickCompare Home"
          >
            <BrandLogo className="h-6 w-6 text-primary" />
            <span className="font-bold tracking-tight text-lg hidden sm:inline-block">
              QuickCompare
            </span>
          </Link>
        </div>

        {/* Center: Search Context (Empty for now, will be populated on /search) */}
        <div className="flex flex-1 items-center justify-center">
          {/* Future SearchBar component will slot here */}
        </div>

        {/* Right: Actions */}
        <div className="flex flex-1 items-center justify-end gap-3 sm:gap-4">
          <a 
            href="https://github.com" 
            target="_blank" 
            rel="noreferrer" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm px-1"
          >
            GitHub
          </a>
          
          <ThemeToggle />
          
          <AccountMenu user={session?.user} />
        </div>

      </div>
    </header>
  );
}
