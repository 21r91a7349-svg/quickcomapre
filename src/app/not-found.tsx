import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
        <Search className="w-10 h-10 text-muted-foreground" />
      </div>
      <h1 className="text-4xl font-extrabold tracking-tight mb-2">404 - Not Found</h1>
      <p className="text-xl text-muted-foreground mb-8 max-w-md">
        We couldn&apos;t find the page or product you were looking for.
      </p>
      <Link href="/" className={buttonVariants({ size: 'lg' })}>
        Return Home
      </Link>
    </div>
  );
}
