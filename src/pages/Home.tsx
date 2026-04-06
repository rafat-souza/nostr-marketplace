import { useState, useEffect } from "react";
import geohash from "ngeohash";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import toast from "react-hot-toast";

import { useNDK } from "../providers/NDKProvider";
import { ListingCard } from "../components/ListingCard";

export default function Home() {
  const { ndk } = useNDK();
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

  const searchRegion = async () => {
    if (!region || !ndk) return;
    setIsLoadingSearch(true);
    setListings([]);
    setHasSearched(true);

    try {
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
      console.log("Geohash:", regionHash);
      const filter = {
        kinds: [30402],
        "#g": [regionHash],
      };

      const fetchPromise = ndk.fetchEvents(filter);
      const timeoutPromise = new Promise<Set<NDKEvent>>((resolve) =>
        setTimeout(() => resolve(new Set()), 4000),
      );

      const events = await Promise.race([fetchPromise, timeoutPromise]);
      setListings(Array.from(events));
    } catch (error) {
      console.error("Failed on searching for listings: ", error);
    } finally {
      setIsLoadingSearch(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-card p-6 rounded-lg shadow-sm border border-border">
        <h2 className="text-xl font-bold mb-4">
          Where do you want to find products?
        </h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="Type the city or the neighborhood..."
            className="flex-grow p-2 rounded bg-background border border-input text-foreground
            focus:outline-none focus:ring-2 focus:ring-ring"
            onKeyDown={(e) => e.key === "Enter" && searchRegion()}
          />
          <button
            onClick={searchRegion}
            disabled={isLoadingSearch || !region}
            className="rounded bg-primary px-6 py-2 text-primary-foreground hover:bg-primary/90
            disabled:opacity-50 cursor-pointer"
          >
            {isLoadingSearch ? "Searching..." : "Search"}
          </button>
        </div>
      </section>

      {hasSearched ? (
        <section>
          <h3 className="text-lg font-semibold mb-4">Products in the region</h3>
          {listings.length === 0 && !isLoadingSearch && (
            <p className="text-muted-foreground">
              No products found in this area.
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
