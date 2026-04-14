import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";

interface LocationOption {
  place_id: number;
  display_name: string;
  addresstype?: string;
  lat: string;
  lon: string;
  name?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    state?: string;
    country?: string;
  };
}

const formatLocation = (opt: LocationOption) => {
  if (!opt.address) return opt.display_name;

  const local =
    opt.address.city ||
    opt.address.town ||
    opt.address.village ||
    opt.address.suburb ||
    opt.name ||
    opt.display_name.split(",")[0];
  const state = opt.address.state || "";
  const country = opt.address.country || "";

  const parts: string[] = [];

  if (local) parts.push(local.trim());

  if (state) {
    if (opt.addresstype === "state" && state.trim() === local.trim()) {
    } else {
      parts.push(state.trim());
    }
  }

  if (country) parts.push(country.trim());

  return parts.join(", ");
};

interface LocationAutocompleteProps {
  onSelect: (location: LocationOption | null) => void;
  placeholder?: string;
}

export function LocationAutocomplete({
  onSelect,
  placeholder = "Type the region...",
}: LocationAutocompleteProps) {
  const [locationInput, setLocationInput] = useState("");
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setLocationOptions([]);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleFetchLocationOptions = async () => {
    if (!locationInput) return;

    setIsSearchingLocation(true);
    onSelect(null);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          locationInput,
        )}&email=${import.meta.env.VITE_NOMINATIM_EMAIL}&addressdetails=1`,
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const uniqueOptions: LocationOption[] = [];
        const seenNames = new Set<string>();

        for (const opt of data) {
          const shortName = formatLocation(opt);
          if (!seenNames.has(shortName)) {
            seenNames.add(shortName);
            uniqueOptions.push({ ...opt, display_name: shortName });
          }
        }

        setLocationOptions(uniqueOptions);
      } else {
        toast.error("No region found");
        setLocationOptions([]);
      }
    } catch (error) {
      console.error("Failed to find the region: ", error);
      toast.error("Failed to connect with the maps server");
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const handleSelectOption = (option: LocationOption) => {
    const shortName = formatLocation(option);
    setLocationInput(option.display_name);
    setLocationOptions([]);
    onSelect({ ...option, display_name: shortName });
  };

  return (
    <div ref={wrapperRef} className="relative flex-1 w-full">
      <div className="flex">
        <input
          type="text"
          value={locationInput}
          onChange={(e) => {
            setLocationInput(e.target.value);
            onSelect(null);
          }}
          placeholder={placeholder}
          className="w-full p-2 rounded-l bg-background border border-input text-foreground focus:outline-none
          "
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleFetchLocationOptions();
            }
          }}
        />
        <button
          type="button"
          onClick={handleFetchLocationOptions}
          disabled={isSearchingLocation || !locationInput}
          className="bg-secondary px-3 py-2 rounded-r border border-l-0 border-input hover:bg-secondary/80
          disabled:opacity-50 text-secondary-foreground cursor-pointer"
        >
          {isSearchingLocation ? "Searching..." : "Search"}
        </button>
      </div>

      {locationOptions.length > 0 && (
        <ul
          className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto bg-card border border-border
        rounded shadow-lg"
        >
          {locationOptions.map((opt) => (
            <li
              key={opt.place_id}
              onClick={() => handleSelectOption(opt)}
              className="p-3 hover:bg-accent hover:text-accent-foreground text-sm border-b border-border 
              last:border-0 cursor-pointer"
            >
              {formatLocation(opt)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
