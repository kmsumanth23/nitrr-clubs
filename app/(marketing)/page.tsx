import { Hero } from "@/components/sections/hero";
import { ExploreClubs } from "@/components/sections/explore-clubs";
import { HowItWorks } from "@/components/sections/how-it-works";
import { Events } from "@/components/sections/events";
import { GalleryMarquee } from "@/components/sections/gallery-marquee";
import { Socials } from "@/components/sections/socials";
import { Faqs } from "@/components/sections/faq";
import { FinalCta } from "@/components/sections/final-cta";
import {
  getPopularClubs,
  getUpcomingEvents,
  getFaqs,
  getGalleryImages,
  getSiteStats,
} from "@/lib/queries/home";

// ISR: rebuild at most once a minute.
export const revalidate = 60;

export default async function HomePage() {
  const [clubs, events, faqs, gallery, stats] = await Promise.all([
    getPopularClubs(5),
    getUpcomingEvents(5),
    getFaqs(),
    getGalleryImages(16),
    getSiteStats(),
  ]);

  return (
    <>
      {/* Section 1: hero + stats together as one full screen */}
      <Hero images={gallery} stats={stats} />
      {/* Section 2: clubs (full screen) */}
      <ExploreClubs clubs={clubs} />
      {/* Section 3: how it works */}
      <HowItWorks />
      {/* Section 4: events (full screen) */}
      <Events events={events} />
      {/* Section 5: gallery film strips (full screen) */}
      <GalleryMarquee images={gallery} />
      {/* Section 6: socials */}
      <Socials />
      {/* Section 7: FAQ */}
      <Faqs faqs={faqs} />
      {/* Section 8: final CTA */}
      <FinalCta clubCount={stats.clubs} />
    </>
  );
}