// import type { SiteStats } from "@/lib/queries/home";

// /** Section 3 — stats capsule. Counts come from live Supabase queries. */
// export function Stats({ stats }: { stats: SiteStats }) {
//   const items = [
//     { n: `${stats.clubs}+`, l: "Active clubs" },
//     { n: `${stats.members.toLocaleString()}+`, l: "Members" },
//     { n: `${stats.events}+`, l: "Events / year" },
//     { n: `${stats.categories}`, l: "Categories" },
//   ];

//   return (
//     <div className="relative z-10 -mt-2 px-6">
//       <div className="mx-auto flex max-w-3xl items-center rounded-full border border-line bg-white px-1.5 py-3.5 shadow-soft">
//         {items.map((it, i) => (
//           <div key={it.l} className="flex flex-1 items-center">
//             {i > 0 && <div className="h-6 w-px bg-line" aria-hidden />}
//             <div className="flex-1 text-center">
//               <div className="text-xl font-bold leading-none text-ink">
//                 {it.n}
//               </div>
//               <div className="mt-1 text-[10px] text-ink-soft">{it.l}</div>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }
