"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface FadeInProps extends React.HTMLAttributes<HTMLDivElement> {
  delay?: 1 | 2 | 3 | 4 | 5 | 6;
  direction?: "up" | "down" | "left" | "right" | "none" | "scale";
  duration?: "fast" | "base" | "slow";
}

export function FadeIn({
  delay,
  direction = "up",
  duration = "slow",
  className,
  children,
  ...props
}: FadeInProps) {
  const directionClass =
    direction === "up"
      ? "animate-fade-in-up"
      : direction === "none"
        ? "animate-fade-in"
        : direction === "scale"
          ? "animate-scale-in"
          : direction === "down"
            ? "animate-fade-in-up"
            : direction === "right"
              ? "animate-slide-in-right"
              : "animate-slide-in-right";

  const durationClass =
    duration === "fast" ? "duration-150" : duration === "base" ? "duration-200" : "duration-300";

  return (
    <div
      className={cn(
        directionClass,
        delay && `stagger-${delay}`,
        durationClass,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface StaggerContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  staggerDelay?: number;
}

export function StaggerContainer({
  className,
  children,
  ...props
}: StaggerContainerProps) {
  return (
    <div className={cn("contents", className)} {...props}>
      {children}
    </div>
  );
}

export function AnimatedCard({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-sm card-lift animate-fade-in-up",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface AnimatedListItemProps extends React.HTMLAttributes<HTMLDivElement> {
  index?: number;
}

export function AnimatedListItem({
  index = 0,
  className,
  children,
  ...props
}: AnimatedListItemProps) {
  const delay = Math.min((index % 6) + 1, 6) as 1 | 2 | 3 | 4 | 5 | 6;
  return (
    <div
      className={cn("animate-fade-in-up", `stagger-${delay}`, className)}
      {...props}
    >
      {children}
    </div>
  );
}
