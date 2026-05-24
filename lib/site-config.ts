/** Single source of truth for nav + footer links. Edit here, not in components. */

export const siteConfig = {
  name: "NITRR Clubs",
  kicker: "National Institute of Technology · Raipur",
  tagline: "It's the clubs, the people, and the moments.",

  nav: [
    { label: "Home", href: "/" },
    { label: "Clubs", href: "/clubs" },
    { label: "Events", href: "/events" },
    { label: "Gallery", href: "/gallery" },
    { label: "About", href: "/about" },
  ],

  socials: [
    { label: "Instagram", href: "#", icon: "instagram" },
    { label: "LinkedIn", href: "#", icon: "linkedin" },
    { label: "YouTube", href: "#", icon: "youtube" },
  ],

  legal: [
    { label: "Privacy", href: "#" },
    { label: "Terms & Conditions", href: "#" },
    { label: "Contact", href: "/contact" },
  ],
} as const;
