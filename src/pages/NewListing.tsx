import { useState } from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import * as geohash from "ngeohash";

import { useNDK } from "../providers/NDKProvider";
import { useAuth } from "../providers/AuthProvider";

export function NewListing() {
  const { ndk } = useNDK();
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    summary: "",
    price: "",
    currency: "USD",
    locationName: "",
    imageUrl: "",
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image too large. Max size is 5MB.");
      return;
    }

    setIsUploadingImage(true);
    try {
      const uploadUrl = "https://nostr.build/api/v2/upload/files";

      const authEvent = new NDKEvent(ndk);
      authEvent.kind = 27235;
      authEvent.content = "";
      authEvent.tags = [
        ["u", uploadUrl],
        ["method", "POST"],
      ];
      await authEvent.sign();

      const authHeader = `Nostr ${btoa(JSON.stringify(authEvent.rawEvent()))}`;

      const uploadData = new FormData();
      uploadData.append("file", file);

      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: authHeader,
        },
        body: uploadData,
      });

      if (!response.ok)
        throw new Error(`Media server error: ${response.status}`);

      const result = await response.json();

      if (result.status === "success" && result.nip94_event?.tags) {
        const urlTag = result.nip94_event.tags.find(
          (t: string[]) => t[0] === "url",
        );
        if (urlTag && urlTag[1]) {
          setFormData((prev) => ({ ...prev, imageUrl: urlTag[1] }));
        } else {
          throw new Error("URL not found in NIP-96 response");
        }
      } else if (result.data && result.data[0] && result.data[0].url) {
        setFormData((prev) => ({ ...prev, imageUrl: result.data[0].url }));
      } else {
        throw new Error("Unexpected response format from the API");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setIsUploadingImage(false);
      e.target.value = "";
    }
  };

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

      console.log("Geohash:", regionHash);

      const tags = [
        ["d", crypto.randomUUID()],
        ["title", formData.title],
        ["summary", formData.summary],
        ["price", formData.price, formData.currency],
        ["location", formData.locationName],
        ["g", regionHash],
      ];

      if (formData.imageUrl) {
        tags.push(["image", formData.imageUrl]);
      }

      event.tags = tags;

      const publishedRelays = await event.publish();
      console.log(
        "Published in the following relays:",
        Array.from(publishedRelays).map((r) => r.url),
      );
      alert("Product posted succesfully!");

      setFormData({
        title: "",
        summary: "",
        price: "",
        currency: "USD",
        locationName: "",
        imageUrl: "",
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
      <h2 className="text-2xl font-bold mb-6">Post New Product</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium mb-1 text-foreground">
            Title
          </label>
          <input
            required
            type="text"
            placeholder="Name of your product"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            className="w-full p-2 rounded bg-background border border-input focus:ring-2 focus:ring-ring focus:border-ring"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-foreground">
            Description
          </label>
          <textarea
            required
            rows={4}
            placeholder="Describe the condition, features, or any details..."
            value={formData.summary}
            onChange={(e) =>
              setFormData({ ...formData, summary: e.target.value })
            }
            className="w-full p-2 rounded bg-background border border-input focus:ring-2 focus:ring-ring focus:border-ring resize-none"
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1 text-foreground">
              Price
            </label>
            <input
              required
              type="number"
              placeholder="0.00"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) =>
                setFormData({ ...formData, price: e.target.value })
              }
              className="w-full p-2 rounded bg-background border border-input focus:ring-2 focus:ring-ring focus:border-ring"
            />
          </div>
          <div className="w-1/3">
            <label className="block text-sm font-medium mb-1 text-foreground">
              Currency
            </label>
            <select
              value={formData.currency}
              onChange={(e) =>
                setFormData({ ...formData, currency: e.target.value })
              }
              className="w-full p-2 rounded bg-background border border-input focus:ring-2 focus:ring-ring focus:border-ring cursor-pointer"
            >
              <option value="BRL">BRL (R$)</option>
              <option value="USD">USD ($)</option>
              <option value="BTC">BTC (₿)</option>
              <option value="SATS">SATS</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-foreground">
            Item Location
          </label>
          <input
            required
            type="text"
            placeholder="City, Neighborhood, or State (e.g. São Paulo, SP)"
            value={formData.locationName}
            onChange={(e) =>
              setFormData({ ...formData, locationName: e.target.value })
            }
            className="w-full p-2 rounded bg-background border border-input focus:ring-2 focus:ring-ring focus:border-ring"
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            Used to generate a geohash for local search.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5 text-foreground">
            Product Image
          </label>

          <div className="flex items-center justify-center w-full">
            <label
              htmlFor="image-upload"
              className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-muted/20 border-input hover:bg-muted/40 hover:border-primary/50 transition-colors overflow-hidden relative
                ${isUploadingImage ? "opacity-60 cursor-not-allowed" : ""}
                ${formData.imageUrl ? "border-primary/50" : ""}
              `}
            >
              {isUploadingImage ? (
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
                  <p className="text-sm text-muted-foreground">
                    Uploading to nostr.build...
                  </p>
                </div>
              ) : formData.imageUrl ? (
                <div className="relative group w-full h-full flex items-center justify-center p-2">
                  <img
                    src={formData.imageUrl}
                    alt="Preview"
                    className="h-full object-contain rounded-md"
                  />
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                    <p className="text-sm text-white font-medium flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                      </svg>
                      Click to change image
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                  <svg
                    className="w-10 h-10 mb-3 text-muted-foreground"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 20 16"
                  >
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                    />
                  </svg>
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold text-primary">
                      Click to upload
                    </span>{" "}
                    product photo
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG or WEBP (Max. 5MB)
                  </p>
                </div>
              )}

              <input
                id="image-upload"
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleImageUpload}
                disabled={isUploadingImage}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || isUploadingImage}
          className="mt-6 w-full rounded-md bg-primary px-5 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
        >
          {isLoading ? "Publishing to Nostr..." : "Publish Product Listing"}
        </button>
      </form>
    </div>
  );
}
