"use client";

import { createContext, useContext } from "react";
import { DEFAULT_APP_NAME, DEFAULT_LOGO_URL } from "@/lib/brand";

type Brand = {
  appName: string;
  logoUrl: string;
};

const BrandContext = createContext<Brand>({
  appName: DEFAULT_APP_NAME,
  logoUrl: DEFAULT_LOGO_URL,
});

export function BrandProvider({
  appName,
  logoUrl,
  children,
}: Brand & { children: React.ReactNode }) {
  return (
    <BrandContext.Provider value={{ appName, logoUrl }}>
      {children}
    </BrandContext.Provider>
  );
}

/** Admin-configured app name and logo. Falls back to defaults outside the provider. */
export function useBrand(): Brand {
  return useContext(BrandContext);
}
