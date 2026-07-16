'use client';

import { useEffect } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
        <AlertTriangle className="w-10 h-10 text-destructive" />
      </div>
      <h1 className="text-4xl font-extrabold tracking-tight mb-2">Something went wrong!</h1>
      <p className="text-xl text-muted-foreground mb-8 max-w-md">
        An unexpected error occurred while processing your request.
      </p>
      <button
        onClick={() => reset()}
        className={buttonVariants({ size: 'lg', variant: 'default' })}
      >
        Try again
      </button>
    </div>
  );
}
