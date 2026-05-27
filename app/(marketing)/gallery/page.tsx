import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { getAllGalleryPhotos } from "@/lib/queries/gallery";

export const revalidate = 60;

export const metadata = {
  title: "Gallery — NITRR Clubs",
  description: "Moments from clubs and events across NIT Raipur.",
};

export default async function GalleryPage() {
  const photos = await getAllGalleryPhotos();

  return (
    <section className="mx-auto max-w-5xl px-6 pb-20 pt-28">
      <div className="mb-10 text-center">
        <h1 className="font-display text-4xl font-extrabold tracking-[0.2em] text-ink">
          MOMENTS
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Snapshots from across our clubs and events
        </p>
      </div>

      <GalleryGrid photos={photos} />
    </section>
  );
}
