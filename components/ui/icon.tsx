import {
  IconCompass,
  IconEye,
  IconSend,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandYoutube,
  IconArrowRight,
  IconCode,
  IconTrophy,
  IconPalette,
  IconHeart,
  IconBriefcase,
  IconMusic,
  type IconProps,
} from "@tabler/icons-react";

/** Map a string name (from DB `categories.icon`, etc.) to a Tabler icon. */
const map = {
  "ti-compass": IconCompass,
  "ti-eye": IconEye,
  "ti-send": IconSend,
  "ti-code": IconCode,
  "ti-trophy": IconTrophy,
  "ti-palette": IconPalette,
  "ti-heart": IconHeart,
  "ti-briefcase": IconBriefcase,
  "ti-music": IconMusic,
  instagram: IconBrandInstagram,
  linkedin: IconBrandLinkedin,
  youtube: IconBrandYoutube,
  arrow: IconArrowRight,
} as const;

export type IconName = keyof typeof map;

export function Icon({ name, ...props }: { name: string } & IconProps) {
  const Cmp = map[name as IconName] ?? IconCode;
  return <Cmp {...props} />;
}

/**
 * Deterministic warm gradient placeholder, keyed off any id string.
 * Used until real images are uploaded. Returns an inline-style object.
 */
const GRADIENTS = [
  "linear-gradient(135deg,#8a6d5a,#3f4a52)",
  "linear-gradient(135deg,#4a5a3f,#79865c)",
  "linear-gradient(135deg,#52465a,#7a5a6d)",
  "linear-gradient(135deg,#3f4a5a,#5f7d8a)",
  "linear-gradient(135deg,#7a5a4a,#a87a5a)",
  "linear-gradient(135deg,#4a6a6a,#6f9090)",
  "linear-gradient(135deg,#6a4a5a,#8f6f7f)",
  "linear-gradient(135deg,#5a5a4a,#8f8f6a)",
  "linear-gradient(135deg,#3a4a4a,#5f7070)",
  "linear-gradient(135deg,#6a5a3a,#9f8f5a)",
];

export function placeholderBg(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}
