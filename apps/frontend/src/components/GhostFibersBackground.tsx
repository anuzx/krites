import { useEffect, useState } from "react";

import GhostFibers from "./GhostFibers";
import type { GhostFibersProps } from "./GhostFibers";
import GhostFibersCanvas from "./GhostFibersCanvas";

/**
 * Returns true only when a WebGL2 context can actually be created. Some
 * environments expose `WebGL2RenderingContext` but still fail to give us a
 * context (blocked GPU, software fallback disabled, headless browsers...).
 */
function detectWebGL2(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export type GhostFibersBackgroundProps = GhostFibersProps;

/**
 * Renders the WebGL2 `GhostFibers` background when the browser supports it and
 * transparently falls back to the Canvas 2D implementation for non-WebGL users.
 */
export function GhostFibersBackground(props: GhostFibersBackgroundProps) {
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    setSupported(detectWebGL2());
  }, []);

  // Before detection resolves we render an empty container to avoid a flash of
  // the wrong renderer.
  if (supported === null) {
    return <div className="ghost-fibers-container" aria-hidden="true" />;
  }

  return supported ? <GhostFibers {...props} /> : <GhostFibersCanvas {...props} />;
}

export default GhostFibersBackground;
