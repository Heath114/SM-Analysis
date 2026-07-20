import type { Platform } from "../lib/types";
import { PLATFORMS, PLATFORM_FILL } from "../lib/platforms";

/** Small coloured brand tile with the platform glyph. */
export default function PlatformTile({ platform, size = 18 }: { platform: Platform; size?: number }) {
  return (
    <span className="pf" style={{ width: size, height: size, background: PLATFORM_FILL[platform] }}>
      {PLATFORMS[platform].icon}
    </span>
  );
}

export function PlatformBadge({ platform }: { platform: Platform }) {
  return (
    <span className="pbadge">
      <PlatformTile platform={platform} />
      {PLATFORMS[platform].name}
    </span>
  );
}
