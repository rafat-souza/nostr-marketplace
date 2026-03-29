import { useState } from "react";
import geohash from "ngeohash";
import { NDKEvent } from "@nostr-dev-kit/ndk";

import { useNDK } from "../providers/NDKProvider";

export default function Home() {
  const { ndk } = useNDK();
  const [region, setRegion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [listings, setListings] = useState<NDKEvent[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const searchRegion = async () => {
    if (!region || !ndk) return;
    setIsLoading(true);
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
        alert("Region not found");
        setIsLoading(false);
        return;
      }

      const { lat, lon } = geoData[0];

      const regionHash = geohash.encode(parseFloat(lat), parseFloat(lon), 4); // 39km x 19km
      console.log("Geohash:", regionHash);
      const filter = {
        kinds: [30402],
        "#g": [regionHash],
      };

      const events = await ndk.fetchEvents(filter);
      setListings(Array.from(events));
    } catch (error) {
      console.error("Failed on searching for ads: ", error);
    } finally {
      setIsLoading(false);
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
            disabled={isLoading || !region}
            className="rounded bg-primary px-6 py-2 text-primary-foreground hover:bg-primary/90
            disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? "Searching..." : "Search"}
          </button>
        </div>
      </section>

      {hasSearched && (
        <section>
          <h3 className="text-lg font-semibold mb-4">
            Advertisements in the region
          </h3>
          {listings.length === 0 && !isLoading && (
            <p className="text-muted-foreground">
              No products found in this area.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((event) => {
              const title =
                event.tags.find((t) => t[0] === "title")?.[1] || "Untitled";
              const price =
                event.tags.find((t) => t[0] === "price")?.[1] ||
                "Price upon request";
              const currency =
                event.tags.find((t) => t[0] === "price")?.[2] || "";

              return (
                <div
                  key={event.id}
                  className="p-4 rounded-lg border border-border bg-card"
                >
                  <h4 className="font-bold truncate">{title}</h4>
                  <p className="text-lg mt-2 text-primary">
                    {price} {currency}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 truncate">
                    ID: {event.id}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
