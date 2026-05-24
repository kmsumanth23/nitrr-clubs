import { Hero } from "@/components/sections/hero";
import { Stats } from "@/components/sections/stats";
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

// ISR: rebuild at most once a minute. New clubs/events appear without redeploy,
// while the page stays static-fast and SEO-friendly.
export const revalidate = 60;

export default async function HomePage() {
  // Fetch everything in parallel on the server.
  const [clubs, events, faqs, gallery, stats] = await Promise.all([
    getPopularClubs(6),
    getUpcomingEvents(5),
    getFaqs(),
    getGalleryImages(16),
    getSiteStats(),
  ]);

  return (
    <>
      <Hero images={gallery} />
      <Stats stats={stats} />
      <ExploreClubs clubs={clubs} />
      <HowItWorks />
      <Events events={events} />
      <GalleryMarquee images={gallery} />
      <Socials />
      <Faqs faqs={faqs} />
      <FinalCta clubCount={stats.clubs} />
    </>
  );
}
