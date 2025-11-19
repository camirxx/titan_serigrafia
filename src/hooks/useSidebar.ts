"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const COLLAPSED_WIDTH = 70;
const EXPANDED_WIDTH = 260;
const MOBILE_OVERLAY_WIDTH = 280;
const HEADER_HEIGHT = 64;
const MOBILE_BREAKPOINT = 768;

export type SidebarState = {
  isCollapsed: boolean;
  isMobile: boolean;
  isMobileOpen: boolean;
  sidebarWidth: number;
  headerHeight: number;
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
};

export function useSidebar(): SidebarState {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);
  const [isHovering, setIsHovering] = useState<boolean>(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("app-sidebar-collapsed") : null;
    if (stored !== null) {
      setIsCollapsed(stored === "true");
    }

    const handleResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (mobile) {
        setIsCollapsed(false);
      }
      if (!mobile) {
        setIsMobileOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("app-sidebar-collapsed", String(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isMobile && isMobileOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
    document.body.style.overflow = "";
  }, [isMobile, isMobileOpen]);

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setIsMobileOpen((prev) => !prev);
    } else {
      setIsCollapsed((prev) => !prev);
    }
  }, [isMobile]);

  const openSidebar = useCallback(() => {
    if (isMobile) {
      setIsMobileOpen(true);
    } else {
      setIsCollapsed(false);
    }
  }, [isMobile]);

  const closeSidebar = useCallback(() => {
    if (isMobile) {
      setIsMobileOpen(false);
    } else {
      setIsCollapsed(true);
    }
  }, [isMobile]);

  const handleMouseEnter = useCallback(() => {
    if (!isMobile && isCollapsed) {
      setIsHovering(true);
    }
  }, [isCollapsed, isMobile]);

  const handleMouseLeave = useCallback(() => {
    if (!isMobile) {
      setIsHovering(false);
    }
  }, [isMobile]);

  const sidebarWidth = useMemo(() => {
    if (isMobile) {
      return isMobileOpen ? MOBILE_OVERLAY_WIDTH : 0;
    }
    if (isCollapsed && !isHovering) {
      return COLLAPSED_WIDTH;
    }
    return EXPANDED_WIDTH;
  }, [isCollapsed, isHovering, isMobile, isMobileOpen]);

  return {
    isCollapsed,
    isMobile,
    isMobileOpen,
    sidebarWidth,
    headerHeight: HEADER_HEIGHT,
    toggleSidebar,
    openSidebar,
    closeSidebar,
    handleMouseEnter,
    handleMouseLeave,
  };
}
