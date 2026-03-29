import { useState } from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import * as geohash from "ngeohash";

import { useNDK } from "../providers/NDKProvider";
import { useAuth } from "../hooks/useAuth";

export function NewListing() {
  const { ndk } = useNDK();
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    summary: "",
    price: "",
    currency: "",
    locationName: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ndk || !currentUser) {
      alert("You have to log in to publish");
      return;
    }

    setIsLoading(true);

    try {
      const geoResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.locationName)}&email=${import.meta.env.VITE_NOMINATIM_EMAIL}`,
        { headers: { Accept: "application/json" } },
      );

      if (!geoResponse.ok) throw new Error("Error in nominatim API");
      const geoData = await geoResponse.json();

      if (!geoData || geoData.length === 0) {
        alert("Local not found. Type a valid region");
        setIsLoading(false);
        return;
      }

      const { lat, lon } = geoData[0];

      const encodeGeohash = geohash.encode || (geohash as any).default?.encode;
      const regionHash = encodeGeohash(parseFloat(lat), parseFloat(lon), 4);

      const event = new NDKEvent(ndk);
      event.kind = 30402;
      event.content = formData.summary;

      event.tags = [
        ["d", crypto.randomUUID()],
        ["title", formData.title],
        ["summary", formData.summary],
        ["price", formData.price, formData.currency],
        ["location", formData.locationName],
        ["g", regionHash],
      ];

      await event.publish();
      alert("Product posted succesfully!");

      setFormData({
        title: "",
        summary: "",
        price: "",
        currency: "USD",
        locationName: "",
      });
    } catch (error) {
      console.error("Failed to post: ", error);
      alert("Error posting the product");
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <p className="text-center mt-10 text-muted-foreground">
        Log in to post a product.
      </p>
    );
  }

  return (
    <div className="max-w-xl mx-auto bg-card p-6 rounded-lg shadow-sm border border-border">
      <h2 className="text-2xl font-bold mb-6">Post new product</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm mb-1">Title</label>
          <input
            required
            type="text"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            className="w-full p-2 rounded bg-background border border-input focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Description</label>
          <textarea
            required
            rows={3}
            value={formData.summary}
            onChange={(e) =>
              setFormData({ ...formData, summary: e.target.value })
            }
            className="w-full p-2 rounded bg-background border border-input focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm mb-1">Price</label>
            <input
              required
              type="number"
              value={formData.price}
              onChange={(e) =>
                setFormData({ ...formData, price: e.target.value })
              }
              className="w-full p-2 rounded bg-background border border-input focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="w-1/3">
            <label className="block text-sm mb-1">Currency</label>
            <select
              value={formData.currency}
              onChange={(e) =>
                setFormData({ ...formData, currency: e.target.value })
              }
              className="w-full p-2 rounded bg-background border border-input focus:ring-2 focus:ring-ring"
            >
              <option value="BRL">BRL</option>
              <option value="USD">USD</option>
              <option value="BTC">BTC</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">
            City / Region (for geohash search)
          </label>
          <input
            required
            type="text"
            placeholder="Ex: São Paulo"
            value={formData.locationName}
            onChange={(e) =>
              setFormData({ ...formData, locationName: e.target.value })
            }
            className="w-full p-2 rounded bg-background border border-input focus:ring-2 focus:ring-ring"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="mt-4 rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isLoading ? "Publishing..." : "Publish product"}
        </button>
      </form>
    </div>
  );
}
