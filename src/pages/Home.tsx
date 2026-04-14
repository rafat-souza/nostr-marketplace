import { useState, useEffect } from "react";
import geohash from "ngeohash";
import { NDKEvent, type NDKFilter } from "@nostr-dev-kit/ndk";
import toast from "react-hot-toast";

import { useNDK } from "../providers/NDKProvider";
import { ListingCard } from "../components/ListingCard";

const CATEGORIES = [
  "Electronics",
  "Vehicles",
  "Furniture",
  "Services",
  "Food",
  "Fashion",
  "Others",
];

export default function Home() {
  const { ndk } = useNDK();
  const [productSearch, setProductSearch] = useState("");
  const [region, setRegion] = useState("");
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);
  const [recentListings, setRecentListings] = useState<NDKEvent[]>([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [listings, setListings] = useState<NDKEvent[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: "",
    currency: "",
    minPrice: "",
    maxPrice: "",
  });

  useEffect(() => {
    if (!ndk) return;

    const fetchRecentListings = async () => {
      setIsLoadingRecent(true);
      try {
        const filter = {
          kinds: [30402],
          limit: 500,
        };

        const fetchPromise = ndk.fetchEvents(filter);
        const timeoutPromise = new Promise<Set<NDKEvent>>((resolve) =>
          setTimeout(() => resolve(new Set()), 4000),
        );

        const events = await Promise.race([fetchPromise, timeoutPromise]);

        let fetchedListings = Array.from(events);
        fetchedListings = fetchedListings.filter((event) =>
          event.tags.some((t) => t[0] === "g"),
        );

        const sortedAndLimitedEvents = fetchedListings
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
    if ((!region && !productSearch && !filters.category) || !ndk) return;
    setIsLoadingSearch(true);
    setListings([]);
    setHasSearched(true);

    try {
      const filter: NDKFilter = {
        kinds: [30402],
        limit: 500,
      };

      if (filters.category) {
        filter["#t"] = [
          filters.category
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase(),
        ];
      }

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
        const parsedLat = parseFloat(lat);
        const parsedLon = parseFloat(lon);

        const baseHash = geohash.encode(parsedLat, parsedLon, 8);

        const hashPrecisions = [4, 5, 6, 7, 8].map((len) =>
          baseHash.substring(0, len),
        );

        const level4Hash = baseHash.substring(0, 4);
        const neighbors = geohash.neighbors(level4Hash);

        const finalHashes = Array.from(
          new Set([...hashPrecisions, ...neighbors]),
        );

        filter["#g"] = finalHashes;
      }

      const fetchPromise = ndk.fetchEvents(filter);
      const timeoutPromise = new Promise<Set<NDKEvent>>((resolve) =>
        setTimeout(() => resolve(new Set()), 4000),
      );

      const events = await Promise.race([fetchPromise, timeoutPromise]);
      let fetchedListings = Array.from(events);

      fetchedListings = fetchedListings.filter((event) =>
        event.tags.some((t) => t[0] === "g"),
      );

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

      if (filters.minPrice || filters.maxPrice || filters.currency) {
        fetchedListings = fetchedListings.filter((event) => {
          const priceTag = event.tags.find((t) => t[0] === "price");
          if (!priceTag || !priceTag[1]) return false;

          if (filters.currency && priceTag[2] !== filters.currency) {
            return false;
          }

          const itemPrice = parseFloat(priceTag[1]);
          if (isNaN(itemPrice)) return false;

          const min = filters.minPrice ? parseFloat(filters.minPrice) : 0;
          const max = filters.maxPrice
            ? parseFloat(filters.maxPrice)
            : Infinity;

          return itemPrice >= min && itemPrice <= max;
        });
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
            className="flex-[2] p-2 rounded bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <input
            type="text"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="City or neighborhood..."
            className="flex-[1] p-2 rounded bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />

          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`rounded px-4 py-2 border transition-colors flex items-center justify-center gap-2 cursor-pointer
                ${
                  showFilters
                    ? "bg-accent border-accent text-accent-foreground"
                    : "bg-background border-input text-foreground hover:bg-accent"
                }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                />
              </svg>
            </button>
            <button
              onClick={handleSearch}
              disabled={
                isLoadingSearch ||
                (!region && !productSearch && !filters.category)
              }
              className="rounded bg-primary px-6 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer whitespace-nowrap font-medium"
            >
              {isLoadingSearch ? "Searching..." : "Search"}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-2 fade-in duration-200">
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() =>
                      setFilters({
                        ...filters,
                        category: filters.category === cat ? "" : cat,
                      })
                    }
                    className={`px-3 py-1 text-sm rounded-full border transition-colors cursor-pointer
                      ${
                        filters.category === cat
                          ? "bg-primary border-primary text-primary-foreground"
                          : "bg-background border-input text-foreground hover:bg-accent"
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                Price Range
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={(e) =>
                    setFilters({ ...filters, minPrice: e.target.value })
                  }
                  className="w-full p-2 rounded bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                />
                <span className="text-muted-foreground">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChange={(e) =>
                    setFilters({ ...filters, maxPrice: e.target.value })
                  }
                  className="w-full p-2 rounded bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                Currency
              </label>
              <select
                value={filters.currency}
                onChange={(e) =>
                  setFilters({ ...filters, currency: e.target.value })
                }
                className="w-full p-2 rounded bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm cursor-pointer"
              >
                <option value="">All Currencies</option>
                <option value="USD">USD ($)</option>
                <option value="BRL">BRL (R$)</option>
                <option value="EUR">EUR (€)</option>
                <option value="BTC">BTC (₿)</option>
                <option value="SATS">SATS</option>
              </select>
            </div>
          </div>
        )}
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
