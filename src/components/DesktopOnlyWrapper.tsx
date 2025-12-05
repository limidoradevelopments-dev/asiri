
'use client';

import { useIsMobile } from '@/hooks/use-mobile';

export function DesktopOnlyWrapper({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold mb-4">Desktop Application</h1>
          <p className="text-muted-foreground">
            This application is designed for desktop use only. For the best experience, please switch to a larger screen.
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            For more details, please contact the developer.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
