"use client";

// React and Next Imports
import Link, { LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

// Utility Imports
import { cn } from "@/lib/utils";
import { ArrowRightSquare, Menu, X } from "lucide-react";

// Component Imports
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AnimatePresence, motion } from "motion/react";

import { footerMenu, mainMenu, siteConfig } from "@/components/nav/nav.config";

export function MobileNav() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        variant="ghost"
        className="w-10 border px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
        onClick={() => setOpen(true)}
      >
        <Menu />
        <span className="sr-only">Toggle Menu</span>
      </Button>

      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="bg-background fixed inset-y-0 left-0 z-50 h-full w-3/4 border-r p-6 shadow-lg sm:max-w-sm font-lxgw"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
            >
              <div className="flex items-start justify-between">
                <MobileLink
                  href="/"
                  className="flex items-center font-bold"
                  onOpenChange={setOpen}
                >
                  <ArrowRightSquare className="mr-2 h-4 w-4" />
                  <span>{siteConfig.site_name}</span>
                </MobileLink>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close Menu</span>
                </Button>
              </div>
              <ScrollArea className="my-4 h-[calc(100vh-8rem)] pb-10">
                <div className="flex flex-col space-y-3">
                  <h3 className="text-muted-foreground mt-6 text-sm font-medium">
                    Menu
                  </h3>
                  <Separator className="origin-left scale-x-75" />
                  {Object.entries(mainMenu).map(([key, href]) => (
                    <MobileLink key={key} href={href} onOpenChange={setOpen}>
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </MobileLink>
                  ))}
                  <h3 className="text-muted-foreground pt-6 text-sm font-medium">
                    External Links
                  </h3>
                  <Separator className="origin-left scale-x-75" />
                  {Object.entries(footerMenu).map(([key, href]) => (
                    <MobileLink key={key} href={href} onOpenChange={setOpen}>
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </MobileLink>
                  ))}
                </div>
              </ScrollArea>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}

interface MobileLinkProps extends LinkProps {
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

function MobileLink({
  href,
  onOpenChange,
  className,
  children,
  ...props
}: MobileLinkProps) {
  const router = useRouter();
  return (
    <Link
      href={href}
      onClick={() => {
        router.push(href.toString());
        onOpenChange?.(false);
      }}
      className={cn(
        "hover:text-primary text-base font-medium transition-colors font-lxgw",
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
