"use client";

import { useState } from "react";
import Image, { ImageProps } from "next/image";
import { cn } from "@/lib/utils";
import { TurfField } from "./turf-field";

interface SafeImageProps extends Omit<ImageProps, "onError"> {
  fallbackClassName?: string;
  fallbackContent?: React.ReactNode;
}

/**
 * Image component that gracefully falls back to a green turf-field
 * mockup when:
 *   - the `src` is empty / missing
 *   - the image fails to load (404, network error, blocked hostname, etc.)
 *
 * Pass a custom `fallbackContent` to override the default field design.
 */
export function SafeImage({
  src,
  alt,
  className,
  fallbackClassName,
  fallbackContent,
  ...rest
}: SafeImageProps) {
  const [errored, setErrored] = useState(false);
  const hasSrc = Boolean(src && src !== "");

  if (!hasSrc || errored) {
    // Render fallback directly — caller controls the positioning.
    // The default <TurfField /> uses `relative w-full h-full` so the parent
    // should have defined dimensions.
    return fallbackContent ?? <TurfField className={fallbackClassName} />;
  }

  return (
    <Image
      src={src as string}
      alt={alt}
      className={className}
      onError={() => setErrored(true)}
      {...rest}
    />
  );
}
