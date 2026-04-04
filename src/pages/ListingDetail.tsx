import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { NDKEvent, type NDKUserProfile } from "@nostr-dev-kit/ndk";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";

import { useNDK } from "../providers/NDKProvider";
import { useAuth } from "../providers/AuthProvider";

export function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { ndk } = useNDK();
  const { currentUser } = useAuth();

  const [event, setEvent] = useState<NDKEvent | null>(null);
  const [profile, setProfile] = useState<NDKUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (!ndk || !id) return;

    const fetchListing = async () => {
      try {
        const fetchedEvent = await ndk.fetchEvent({ ids: [id] });
        if (!fetchedEvent) {
          toast.error("Listing not found.");
          navigate("/");
          return;
        }

        setEvent(fetchedEvent);

        const fetchedProfile = await fetchedEvent.author.fetchProfile();
        if (fetchedProfile) setProfile(fetchedProfile);
      } catch (error) {
        console.error("Error fetching listing:", error);
        toast.error("Failed to load listing details.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchListing();
  }, [ndk, id, navigate]);

  if (isLoading)
    return (
      <p className="p-8 text-center text-muted-foreground">
        Loading details...
      </p>
    );
  if (!event) return null;

  // Data extraction
  const title = event.tags.find((t) => t[0] === "title")?.[1] || "Untitled";
  const price = event.tags.find((t) => t[0] === "price")?.[1] || "0";
  const currency = event.tags.find((t) => t[0] === "price")?.[2] || "";
  const location =
    event.tags.find((t) => t[0] === "location")?.[1] || "No location";
  const images = event.tags.filter((t) => t[0] === "image").map((t) => t[1]);
  const description =
    event.content ||
    event.tags.find((t) => t[0] === "summary")?.[1] ||
    "No description provided.";

  const sellerName = profile?.name || profile?.displayName || "Anonymous";
  const sellerPicture = profile?.image || profile?.picture;
  const publishDate = event.created_at
    ? new Date(event.created_at * 1000).toLocaleDateString()
    : "Unknown date";

  const handleContactSeller = () => {
    if (!currentUser) {
      toast.error("You must be logged in to contact the seller.");
      return;
    }
    toast("Chat system coming soon!", { icon: "💬" });
  };

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 bg-background">
      {/* Left side: gallery */}
      <div className="space-y-4">
        <div className="w-full aspect-square bg-muted/20 rounded-xl overflow-hidden border border-border">
          {images.length > 0 ? (
            <img
              src={images[currentImageIndex]}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground/30">
              <svg
                className="w-24 h-24"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* mini images */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentImageIndex(idx)}
                className={`w-20 h-20 shrink-0 rounded-md overflow-hidden border-2 transition-all cursor-pointer ${
                  currentImageIndex === idx
                    ? "border-primary"
                    : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <img
                  src={img}
                  alt={`Thumbnail ${idx}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right side: information */}
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
          <p className="text-3xl font-black text-primary">
            {price} {currency}
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-muted-foreground border-b border-border pb-6">
          <svg
            className="w-5 h-5 text-primary/70 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span>{location}</span>
          <span className="mx-2">•</span>
          <span>Listed on {publishDate}</span>
        </div>

        {/* Seller card and contact */}
        <div className="bg-card p-4 rounded-xl border border-border flex items-center justify-between shadow-sm">
          <Link
            to={`/seller/${event.pubkey}`}
            className="flex items-center gap-3"
          >
            {sellerPicture ? (
              <img
                src={sellerPicture}
                alt={sellerName}
                className="w-12 h-12 rounded-full object-cover border border-border"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                <span className="text-lg font-bold text-primary">
                  {sellerName.substring(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground uppercase font-semibold">
                Seller
              </span>
              <span className="font-bold text-foreground">{sellerName}</span>
            </div>
          </Link>

          <button
            onClick={handleContactSeller}
            className="bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Message
          </button>
        </div>

        {/* Description */}
        <div>
          <h3 className="text-lg font-bold mb-3 text-foreground">
            Description
          </h3>
          <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
