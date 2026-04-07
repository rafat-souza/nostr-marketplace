import { useState, useEffect } from "react";
import geohash from "ngeohash";
import { NDKEvent, type NDKFilter } from "@nostr-dev-kit/ndk";
import toast from "react-hot-toast";

import { useNDK } from "../providers/NDKProvider";
import { ListingCard } from "../components/ListingCard";

export default function Home() {
  const { ndk } = useNDK();
  const [productSearch, setProductSearch] = useState("");
  const [region, setRegion] = useState("");
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);
  const [recentListings, setRecentListings] = useState<NDKEvent[]>([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [listings, setListings] = useState<NDKEvent[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!ndk) return;

    const fetchRecentListings = async () => {
      setIsLoadingRecent(true);
      try {
        const filter = {
          kinds: [30402],
          limit: 20,
        };

        const fetchPromise = ndk.fetchEvents(filter);
        const timeoutPromise = new Promise<Set<NDKEvent>>((resolve) =>
          setTimeout(() => resolve(new Set()), 4000),
        );

        const events = await Promise.race([fetchPromise, timeoutPromise]);
        const sortedAndLimitedEvents = Array.from(events)
          .sort((a, b) => (b.created_at || 0) - (a.created_at || 0))
          .slice(0, 20);

        setRecentListings(sortedAndLimitedEvents);
      } catch (error) {
        console.error("Failed on fetching recent listings: ", error);
      } finally {
        setIsLoadingRecent(false);
      }
    };

    fetchRecentListings();
  }, [ndk]);

  const handleSearch = async () => {
    if ((!region && !productSearch) || !ndk) return;
    setIsLoadingSearch(true);
    setListings([]);
    setHasSearched(true);

    try {
      const filter: NDKFilter = {
        kinds: [30402],
        limit: 300,
      };

      if (region) {
        const geoResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(region)}&email=${import.meta.env.VITE_NOMINATIM_EMAIL}`,
          {
            headers: { Accept: "application/json" },
          },
        );
        const geoData = await geoResponse.json();

        if (!geoData || geoData.length === 0) {
          toast.error("Region not found");
          setIsLoadingSearch(false);
          return;
        }

        const { lat, lon } = geoData[0];
        const regionHash = geohash.encode(parseFloat(lat), parseFloat(lon), 4); // 39km x 19km
        filter["#g"] = [regionHash];
      }

      const fetchPromise = ndk.fetchEvents(filter);
      const timeoutPromise = new Promise<Set<NDKEvent>>((resolve) =>
        setTimeout(() => resolve(new Set()), 4000),
      );

      const events = await Promise.race([fetchPromise, timeoutPromise]);
      let fetchedListings = Array.from(events);

      if (productSearch) {
        const normalizeStr = (str: string) =>
          str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();

        const searchNormalized = normalizeStr(productSearch);

        fetchedListings = fetchedListings.filter((event) => {
          const title = event.tags.find((t) => t[0] === "title")?.[1] || "";
          const content = event.content || "";

          return (
            normalizeStr(title).includes(searchNormalized) ||
            normalizeStr(content).includes(searchNormalized)
          );
        });

        fetchedListings.sort((a, b) => {
          const titleA = normalizeStr(
            a.tags.find((t) => t[0] === "title")?.[1] || "",
          );
          const titleB = normalizeStr(
            b.tags.find((t) => t[0] === "title")?.[1] || "",
          );

          const aHasTitleMatch = titleA.includes(searchNormalized);
          const bHasTitleMatch = titleB.includes(searchNormalized);

          if (aHasTitleMatch && !bHasTitleMatch) return -1;
          if (!aHasTitleMatch && bHasTitleMatch) return 1;

          return (b.created_at || 0) - (a.created_at || 0);
        });
      } else {
        fetchedListings.sort(
          (a, b) => (b.created_at || 0) - (a.created_at || 0),
        );
      }

      setListings(fetchedListings);
    } catch (error) {
      console.error("Failed on searching for listings: ", error);
      toast.error("Error performing search");
    } finally {
      setIsLoadingSearch(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-card p-6 rounded-lg shadow-sm border border-border">
        <h2 className="text-xl font-bold mb-4">
          What and where are you looking for?
        </h2>
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Search for a product (e.g. smartphone, bicycle...)"
            className="flex-[2] p-2 rounded bg-background border border-input text-foreground
           focus:outline-none focus:ring-2 focus:ring-ring"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <input
            type="text"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="City or neighborhood..."
            className="flex-[1] p-2 rounded bg-background border border-input text-foreground
            focus:outline-none focus:ring-2 focus:ring-ring"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={isLoadingSearch || (!region && !productSearch)}
            className="rounded bg-primary px-6 py-2 text-primary-foreground hover:bg-primary/90
            disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            {isLoadingSearch ? "Searching..." : "Search"}
          </button>
        </div>
      </section>

      {hasSearched ? (
        <section>
          <h3 className="text-lg font-semibold mb-4">Search results</h3>
          {listings.length === 0 && !isLoadingSearch && (
            <p className="text-muted-foreground">
              No products found matching your search.
            </p>
          )}

          <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {listings.map((event) => (
              <ListingCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      ) : (
        <section>
          <h3 className="text-lg font-semibold mb-4">Recent Products</h3>
          {isLoadingRecent ? (
            <p className="text-muted-foreground animate-pulse">
              Loading latest products...
            </p>
          ) : recentListings.length === 0 ? (
            <p className="text-muted-foreground">No recent products found.</p>
          ) : (
            <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {recentListings.map((event) => (
                <ListingCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
