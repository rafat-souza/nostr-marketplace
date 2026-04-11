import { useEffect, useState } from "react";
import { NDKEvent, type NDKUserProfile } from "@nostr-dev-kit/ndk";
import { Link } from "react-router-dom";

interface ListingCardProps {
  event: NDKEvent;
}

export function ListingCard({ event }: ListingCardProps) {
  const [profile, setProfile] = useState<NDKUserProfile | null>(null);

  useEffect(() => {
    event.author
      .fetchProfile()
      .then((p) => {
        if (p) setProfile(p);
      })
      .catch(console.error);
  }, [event]);

  const title = event.tags.find((t) => t[0] === "title")?.[1] || "Untitled";
  const price =
    event.tags.find((t) => t[0] === "price")?.[1] || "Price upon request";
  const currency = event.tags.find((t) => t[0] === "price")?.[2] || "";
  const fullLocation =
    event.tags.find((t) => t[0] === "location")?.[1] ||
    event.tags.find((t) => t[0] === "l")?.[1] ||
    "Unknown location";
  const shortLocation =
    fullLocation !== "Unknown location" && fullLocation.includes(",")
      ? fullLocation.split(",").slice(0, 2).join(",").trim()
      : fullLocation;
  const imageUrl = event.tags.find((t) => t[0] === "image")?.[1];

  const sellerName = profile?.name || profile?.displayName || "Anonymous";
  const sellerPicture = profile?.image || profile?.picture;

  return (
    <Link
      to={`/listing/${event.id}`}
      className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="w-full aspect-square bg-muted/10 border-b border-border overflow-hidden relative">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
            <svg
              className="w-12 h-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 
                2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div>
          <h4 className="font-bold text-lg truncate" title={title}>
            {title}
          </h4>
          <p className="text-xl font-black text-primary">
            {price} {currency}
          </p>
        </div>

        <div className="flex items-center gap-1 text-sm text-muted-foreground pt-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 shrink-0"
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
          <span className="truncate">{shortLocation}</span>
        </div>

        <div className="pt-3 border-t border-border flex items-center gap-3">
          {sellerPicture ? (
            <img
              src={sellerPicture}
              alt={sellerName}
              className="w-9 h-9 rounded-full object-cover border border-border shadow-sm"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <span className="text-xs font-bold text-primary">
                {sellerName.substring(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              Seller
            </span>
            <span className="text-sm font-bold truncate text-foreground">
              {sellerName}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
