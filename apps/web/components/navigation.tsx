"use client";

import { House } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const pageLabels: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/wishlist": "Wunschliste",
  "/bonsai-fm": "Bonsai FM",
  "/settings": "Einstellungen",
};

export function Navigation() {
  const currentPath = usePathname();

  return (
    <Breadcrumb className="shrink-0">
      <BreadcrumbList className="flex-nowrap whitespace-nowrap">
        <BreadcrumbItem>
          <BreadcrumbLink
            aria-label="Dashboard"
            className="-m-1 inline-block p-1"
            render={<Link href="/dashboard" />}
          >
            {currentPath === "/dashboard" ? (
              <House className="size-4" />
            ) : (
              "Dashboard"
            )}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>
            {pageLabels[currentPath] ?? currentPath}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
