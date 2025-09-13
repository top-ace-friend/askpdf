"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/app-store";

/**
 * StoreInitializer component that runs on app startup to initialize the store
 * This ensures API keys and other settings are loaded from localStorage
 */
const StoreInitializer = () => {
  const { initializeStore } = useAppStore();

  useEffect(() => {
    // Initialize the store when the app loads
    initializeStore();
  }, [initializeStore]);

  // This component doesn't render anything
  return null;
};

export default StoreInitializer;
