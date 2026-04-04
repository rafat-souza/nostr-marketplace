import { useState } from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import * as geohash from "ngeohash";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { useNDK } from "../providers/NDKProvider";
import { useAuth } from "../providers/AuthProvider";

interface ListingFormData {
  title: string;
  summary: string;
  price: string;
  currency: string;
  locationName: string;
  imageUrls: string[];
}

interface NominatimResponse {
  lat: string;
  lon: string;
}

interface NostrBuildResponse {
  status?: string;
  data?: Array<{ url: string }>;
  nip94_event?: {
    tags: Array<string[]>;
  };
}

export function NewListing() {
  const { ndk } = useNDK();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [formData, setFormData] = useState<ListingFormData>({
    title: "",
    summary: "",
    price: "",
    currency: "USD",
    locationName: "",
    imageUrls: [],
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const oversized = files.filter((f) => f.size > 5 * 1024 * 1024);
    if (oversized.length > 0) {
      toast.error("Some images are too large. Max size is 5MB per image.");
      return;
    }

    setIsUploadingImage(true);
    try {
      const uploadUrl = "https://nostr.build/api/v2/upload/files";

      const authEvent = new NDKEvent(ndk!);
      authEvent.kind = 27235;
      authEvent.content = "";
      authEvent.tags = [
        ["u", uploadUrl],
        ["method", "POST"],
      ];
      await authEvent.sign();

      const authHeader = `Nostr ${btoa(JSON.stringify(authEvent.rawEvent()))}`;
      const newUrls: string[] = [];

      for (const file of files) {
        const uploadData = new FormData();
        uploadData.append("file", file);

        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { Authorization: authHeader },
          body: uploadData,
        });

        if (!response.ok)
          throw new Error(`Media server error: ${response.status}`);

        const result = (await response.json()) as NostrBuildResponse;

        if (result.status === "success" && result.nip94_event?.tags) {
          const urlTag = result.nip94_event.tags.find(
            (t: string[]) => t[0] === "url",
          );
          if (urlTag && urlTag[1]) newUrls.push(urlTag[1]);
        } else if (result.data && result.data[0] && result.data[0].url) {
          newUrls.push(result.data[0].url);
        }
      }

      setFormData((prev) => ({
        ...prev,
        imageUrls: [...prev.imageUrls, ...newUrls],
      }));
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload one or more images. Please try again.");
    } finally {
      setIsUploadingImage(false);
      e.target.value = "";
    }
  };

  const removeImage = (indexToRemove: number) => {
    setFormData((prev) => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_, index) => index !== indexToRemove),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ndk || !currentUser) {
      toast.error("You have to log in to publish");
      return;
    }

    setIsLoading(true);

    try {
      const geoResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.locationName)}&email=${import.meta.env.VITE_NOMINATIM_EMAIL}`,
        { headers: { Accept: "application/json" } },
      );

      if (!geoResponse.ok) throw new Error("Error in nominatim API");
      const geoData = (await geoResponse.json()) as NominatimResponse[];

      if (!geoData || geoData.length === 0) {
        toast.error("Local not found. Type a valid region");
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

      formData.imageUrls.forEach((url) => {
        tags.push(["image", url]);
      });

      event.tags = tags;

      await event.publish();
      toast.success("Product posted succesfully!");

      navigate("/");
    } catch (error) {
      console.error("Failed to post: ", error);
      toast.error("Error posting the product. Check your connection");
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
            className="w-full p-2 rounded bg-background border border-input focus:ring-2 
            focus:ring-ring focus:border-ring resize-none"
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
              className="w-full p-2 rounded bg-background border border-input focus:ring-2 
              focus:ring-ring focus:border-ring"
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
              className="w-full p-2 rounded bg-background border border-input focus:ring-2 
              focus:ring-ring focus:border-ring cursor-pointer"
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
            Product Images
          </label>

          {formData.imageUrls.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              {formData.imageUrls.map((url, index) => (
                <div
                  key={index}
                  className="relative group w-full h-24 border border-border rounded-md overflow-hidden bg-muted/20"
                >
                  <img
                    src={url}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute inset-0 bg-red-500/80 text-white opacity-0 group-hover:opacity-100
                    flex items-center justify-center transition-opacity text-sm font-semibold cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-center w-full">
            <label
              htmlFor="image-upload"
              className={`flex flex-col items-center justify-center w-full h-50 border-2 
                border-dashed rounded-lg cursor-pointer bg-muted/20 border-input hover:bg-muted/40 transition-colors
                ${isUploadingImage ? "opacity-60 cursor-not-allowed" : ""}
              `}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                {isUploadingImage ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2"></div>
                    <p className="text-sm text-muted-foreground">
                      Uploading...
                    </p>
                  </>
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
                        d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 
                        5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
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
              </div>
              <input
                id="image-upload"
                type="file"
                multiple
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
          className="mt-6 w-full rounded-md bg-primary px-5 py-3 text-base font-semibold text-primary-foreground 
          hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
        >
          {isLoading ? "Publishing to Nostr..." : "Publish Product Listing"}
        </button>
      </form>
    </div>
  );
}
