import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { NDKEvent, type NDKUserProfile, NDKUser } from "@nostr-dev-kit/ndk";
import { useNDK } from "../providers/NDKProvider";
import { ListingCard } from "../components/ListingCard";

export function SellerProfile() {
  const { pubkey } = useParams<{ pubkey: string }>();
  const { ndk } = useNDK();

  const [profile, setProfile] = useState<NDKUserProfile | null>(null);
  const [listings, setListings] = useState<NDKEvent[]>([]);
  const [followersCount, setFollowersCount] = useState<number | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!ndk || !pubkey) return;

    const fetchSellerData = async () => {
      try {
        const user = new NDKUser({ pubkey });
        user.ndk = ndk;

        const userProfile = await user.fetchProfile().catch(() => null);
        if (userProfile) setProfile(userProfile);

        const userListings = await ndk
          .fetchEvents({ kinds: [30402], authors: [pubkey] })
          .catch(() => new Set<NDKEvent>());
        setListings(Array.from(userListings));

        const followingEvent = await ndk
          .fetchEvents({ kinds: [3], authors: [pubkey] })
          .catch(() => null);

        if (followingEvent) {
          const followsArray = Array.from(followingEvent)[0];
          if (followsArray) {
            setFollowingCount(
              followsArray.tags.filter((t) => t[0] === "p").length,
            );
          } else {
            setFollowingCount(0);
          }
        }

        const followersEvents = await ndk
          .fetchEvents({ kinds: [3], "#p": [pubkey] })
          .catch(() => null);

        if (followersEvents) {
          setFollowersCount(followersEvents.size);
        }
      } catch (error) {
        console.error("Error fetching seller data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSellerData();
  }, [ndk, pubkey]);

  if (isLoading)
    return (
      <p className="p-8 text-center text-muted-foreground animate-pulse">
        Loading seller's profile...
      </p>
    );

  const avatar = profile?.image || profile?.picture;
  const name = profile?.name || profile?.displayName || "Anonymous user";
  const bio = profile?.about || "This user still didn't add a bio.";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <section className="bg-card p-6 rounded-xl border border-border shadow-sm flex flex-col md:flex-row items-center md:items-start gap-6">
        {avatar ? (
          <img
            src={avatar}
            alt={name}
            className="w-32 h-32 rounded-full object-cover border-4 border-background shadow-md"
          />
        ) : (
          <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center border-4 border-background shadow-md">
            <span className="text-4xl font-bold text-primary">
              {name.substring(0, 2).toUpperCase()}
            </span>
          </div>
        )}

        <div className="flex-1 text-center md:text-left">
          <h2 className="text-2xl font-bold text-foreground">{name}</h2>
          <p className="text-muted-foreground mt-2 max-w-xl whitespace-pre-wrap">
            {bio}
          </p>

          <div className="flex items-center justify-center md:justify-start gap-6 mt-4 pt-4 border-t border-border">
            <div className="flex flex-col">
              <span className="text-lg font-bold text-foreground">
                {followingCount !== null ? followingCount : "-"}
              </span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                Following
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-foreground">
                {followersCount !== null ? followersCount : "-"}
              </span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                Followers
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Seller listings */}
      <section>
        <h3 className="text-xl font-bold mb-4 border-b border-border pb-2">
          Listings from {name}
        </h3>

        {listings.length === 0 ? (
          <p className="text-muted-foreground bg-muted/20 p-6 rounded-lg text-center border border-border border-dashed">
            This user still doesn't have active listings.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((event) => (
              <ListingCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
