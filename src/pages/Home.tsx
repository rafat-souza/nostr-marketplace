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
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(region)}`,
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

      const filter = {
        kinds: [30403],
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
