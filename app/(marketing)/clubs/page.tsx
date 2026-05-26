import { ClubFilter } from "@/components/clubs/club-filter";
import { getAllClubs, getCategories } from "@/lib/queries/clubs";

export const revalidate = 60; // ISR

export const metadata = {
  title: "All Clubs — NITRR Clubs",
  description:
    "Browse every active club and committee at NIT Raipur. Filter by category or search by name.",
};

export default async function ClubsPage() {
  const [clubs, categories] = await Promise.all([
    getAllClubs(),
    getCategories(),
  ]);

  return (
    <section className="mx-auto max-w-5xl px-6 pb-20 pt-28">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          All clubs &amp; committees
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          {clubs.length} active clubs at NIT Raipur. Filter by category or search
          to find your fit.
        </p>
      </div>

      {/* server data → client filter island */}
      <ClubFilter clubs={clubs} categories={categories} />
    </section>
  );
}
