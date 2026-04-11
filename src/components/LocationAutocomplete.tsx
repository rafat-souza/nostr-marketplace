import { useState } from "react";
import toast from "react-hot-toast";

interface LocationOption {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

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

  const handleFetchLocationOptions = async () => {
    if (!locationInput) return;

    setIsSearchingLocation(true);
    onSelect(null);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          locationInput,
        )}&email=${import.meta.env.VITE_NOMINATIM_EMAIL}`,
      );
      const data = await response.json();

      if (data && data.length > 0) {
        setLocationOptions(data);
      } else {
        toast.error("No regions found");
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
    setLocationInput(option.display_name);
    setLocationOptions([]);
    onSelect(option);
  };
