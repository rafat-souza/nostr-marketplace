import { useEffect, useState } from "react";
import { NDKEvent, type NDKUserProfile } from "@nostr-dev-kit/ndk";
import { useNDK } from "../providers/NDKProvider";
import { useAuth } from "../providers/AuthProvider";
import { ListingCard } from "../components/ListingCard";
import toast from "react-hot-toast";

export function Profile() {
  const { ndk } = useNDK();
  const { currentUser } = useAuth();

  const [profile, setProfile] = useState<NDKUserProfile | null>(null);
  const [listings, setListings] = useState<NDKEvent[]>([]);
  const [followersCount, setFollowersCount] = useState<number | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [listingToDelete, setListingToDelete] = useState<NDKEvent | null>(null);

  useEffect(() => {
    if (!ndk || !currentUser) return;

    const fetchProfileData = async () => {
      try {
        const userProfile = await currentUser.fetchProfile().catch(() => null);
        if (userProfile) setProfile(userProfile);

        const userListings = await ndk
          .fetchEvents({
            kinds: [30402],
            authors: [currentUser.pubkey],
          })
          .catch(() => new Set<NDKEvent>());
        setListings(Array.from(userListings));

        const followingEvent = await ndk
          .fetchEvents({
            kinds: [3],
            authors: [currentUser.pubkey],
          })
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
          .fetchEvents({
            kinds: [3],
            "#p": [currentUser.pubkey],
          })
          .catch(() => null);
        if (followersEvents) {
          setFollowersCount(followersEvents.size);
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [ndk, currentUser]);

  const confirmDelete = async () => {
    if (!ndk || !listingToDelete) return;

    try {
      const deleteEvent = new NDKEvent(ndk);
      deleteEvent.kind = 5;
      deleteEvent.tags = [["e", listingToDelete.id]];
      await deleteEvent.publish();

      setListings((prev) => prev.filter((e) => e.id !== listingToDelete.id));
      setListingToDelete(null);
      toast.success("Listing deleted successfully");
    } catch (error) {
      console.error("Error deleting listing:", error);
      toast.error("Failed to delete listing.");
    }
  };

  if (!currentUser)
    return (
      <p className="p-8 text-center">Please log in to view your profile.</p>
    );
  if (isLoading) return <p className="p-8 text-center">Loading profile...</p>;

  const avatar = profile?.image || profile?.picture;
  const name = profile?.name || profile?.displayName || "Anonymous User";
  const bio = profile?.about || "No biography provided.";

  return (
    // Profile stats
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
                {followersCount !== null ? followingCount : "-"}
              </span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                Followers
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Product Listing */}
      <section>
        <h3 className="text-xl font-bold mb-4 border-b border-border pb-2">
          My Advertisements
        </h3>

        {listings.length === 0 ? (
          <p className="text-muted-foreground bg-muted/20 p-6 rounded-lg text-center border border-border border-dashed">
            You haven't posted any products yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((event) => (
              <div key={event.id} className="relative group">
                <ListingCard event={event} />

                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setListingToDelete(event);
                  }}
                  className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 shadow-sm cursor-pointer"
                  title="Delete Listing"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
      {/* Exclusion Modal */}
      {listingToDelete && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-card p-6 rounded-lg shadow-lg w-96 border border-border">
            <h3 className="text-lg font-bold mb-2 text-foreground">
              Delete Listing
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              Are you sure you want to delete this listing? This action cannot
              be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setListingToDelete(null)}
                className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
