"use client";

import { createContext, useContext } from "react";
import { DEFAULT_APP_NAME, DEFAULT_LOGO_URL, DEFAULT_MARK_URL } from "@/lib/brand";

type Brand = {
  appName: string;
  logoUrl: string;
};

type BrandValue = Brand & {
  /** Small-size mark: the crest-only image for the default logo, else the admin's own logo. */
  markUrl: string;
};

const BrandContext = createContext<BrandValue>({
  appName: DEFAULT_APP_NAME,
  logoUrl: DEFAULT_LOGO_URL,
  markUrl: DEFAULT_MARK_URL,
});

export function BrandProvider({
  appName,
  logoUrl,
  children,
}: Brand & { children: React.ReactNode }) {
  return (
    <BrandContext.Provider
      value={{
        appName,
        logoUrl,
        markUrl: logoUrl === DEFAULT_LOGO_URL ? DEFAULT_MARK_URL : logoUrl,
      }}
    >
      {children}
    </BrandContext.Provider>
  );
}

/** Admin-configured app name and logo. Falls back to defaults outside the provider. */
export function useBrand(): BrandValue {
  return useContext(BrandContext);
}
