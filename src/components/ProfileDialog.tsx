import { useState, useEffect } from "react";
import { UserProfile } from "@/data/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cancerTypes, provinces } from "@/data/trials";

interface ProfileDialogProps {
  userProfile: UserProfile;
  onProfileUpdate: (profile: UserProfile) => void;
}

const CANADIAN_CITIES: Record<string, { city: string; lat: number; lon: number }[]> = {
  Ontario: [
    { city: "Toronto", lat: 43.6629, lon: -79.3957 },
    { city: "Ottawa", lat: 45.4215, lon: -75.6972 },
    { city: "Hamilton", lat: 43.2557, lon: -79.8711 },
    { city: "London", lat: 42.9849, lon: -81.2453 },
    { city: "Kingston", lat: 44.2312, lon: -76.4860 },
    { city: "Mississauga", lat: 43.5890, lon: -79.6441 },
    { city: "Brampton", lat: 43.7315, lon: -79.7624 },
    { city: "Markham", lat: 43.8561, lon: -79.3370 },
    { city: "Vaughan", lat: 43.8361, lon: -79.4983 },
    { city: "Richmond Hill", lat: 43.8828, lon: -79.4403 },
  ],
  Quebec: [
    { city: "Montreal", lat: 45.5017, lon: -73.5673 },
    { city: "Quebec City", lat: 46.8139, lon: -71.2080 },
    { city: "Laval", lat: 45.6066, lon: -73.7124 },
    { city: "Gatineau", lat: 45.4765, lon: -75.7013 },
    { city: "Longueuil", lat: 45.5312, lon: -73.5185 },
    { city: "Sherbrooke", lat: 45.4042, lon: -71.8929 },
  ],
  "British Columbia": [
    { city: "Vancouver", lat: 49.2827, lon: -123.1207 },
    { city: "Victoria", lat: 48.4628, lon: -123.3132 },
    { city: "Surrey", lat: 49.1913, lon: -122.8490 },
    { city: "Burnaby", lat: 49.2488, lon: -122.9805 },
    { city: "Richmond", lat: 49.1666, lon: -123.1336 },
    { city: "Kelowna", lat: 49.8880, lon: -119.4960 },
  ],
  Alberta: [
    { city: "Calgary", lat: 51.0447, lon: -114.0719 },
    { city: "Edmonton", lat: 53.5461, lon: -113.4938 },
    { city: "Red Deer", lat: 52.2681, lon: -113.8111 },
    { city: "Lethbridge", lat: 49.6942, lon: -112.8328 },
  ],
  Manitoba: [
    { city: "Winnipeg", lat: 49.8951, lon: -97.1384 },
    { city: "Brandon", lat: 49.8483, lon: -99.9501 },
  ],
  Saskatchewan: [
    { city: "Saskatoon", lat: 52.1333, lon: -106.5243 },
    { city: "Regina", lat: 50.4452, lon: -104.6189 },
  ],
  "Nova Scotia": [
    { city: "Halifax", lat: 44.6426, lon: -63.2181 },
    { city: "Dartmouth", lat: 44.6710, lon: -63.5727 },
  ],
  "New Brunswick": [
    { city: "Moncton", lat: 46.0878, lon: -64.7782 },
    { city: "Saint John", lat: 45.2733, lon: -66.0633 },
    { city: "Fredericton", lat: 45.9636, lon: -66.6431 },
  ],
};

function ProfileDialog({ userProfile, onProfileUpdate }: ProfileDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<UserProfile>(userProfile);

  // Update form data when userProfile changes or dialog opens
  useEffect(() => {
    if (open) {
      setFormData(userProfile);
    }
  }, [open, userProfile]);

  const handleChange = (field: keyof UserProfile, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCityChange = (city: string) => {
    const cityData = CANADIAN_CITIES[formData.province]?.find(
      (c) => c.city === city
    );
    if (cityData) {
      setFormData((prev) => ({
        ...prev,
        city: cityData.city,
        location: cityData.city,
        latitude: cityData.lat,
        longitude: cityData.lon,
      }));
    }
  };

  const handleProvinceChange = (province: string) => {
    setFormData((prev) => ({
      ...prev,
      province: province,
      city: "",
      location: "",
    }));
  };

  const handleSave = () => {
    onProfileUpdate(formData);
    setOpen(false);
  };

  const availableCities = formData.province
    ? CANADIAN_CITIES[formData.province] || []
    : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 rounded-full"
        >
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
            {formData.name.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs font-medium hidden sm:inline max-w-[80px] truncate">
            {formData.name}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>My Health Profile</DialogTitle>
          <DialogDescription>
            Update your health information for personalized recommendations
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {/* Personal Info */}
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-xs font-semibold">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Your name"
              className="text-sm"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="age" className="text-xs font-semibold">Age</Label>
            <Input
              id="age"
              type="number"
              value={formData.age}
              onChange={(e) => handleChange("age", parseInt(e.target.value))}
              placeholder="Age"
              min="18"
              max="120"
              className="text-sm"
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Location</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select value={formData.province} onValueChange={handleProvinceChange}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Province" />
                </SelectTrigger>
                <SelectContent>
                  {provinces.filter(p => Object.keys(CANADIAN_CITIES).includes(p)).map((prov) => (
                    <SelectItem key={prov} value={prov}>
                      {prov}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={formData.city} onValueChange={handleCityChange}>
                <SelectTrigger disabled={!formData.province} className="text-sm">
                  <SelectValue placeholder="City" />
                </SelectTrigger>
                <SelectContent>
                  {availableCities.map((c) => (
                    <SelectItem key={c.city} value={c.city}>
                      {c.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Health Info */}
          <div className="space-y-2 border-t pt-3 mt-2">
            <h3 className="text-xs font-semibold">Health Information</h3>

            <div className="grid gap-2">
              <Label htmlFor="cancer-type" className="text-xs font-semibold">Cancer Type</Label>
              <Select value={formData.cancer_type} onValueChange={(value) => handleChange("cancer_type", value)}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select cancer type" />
                </SelectTrigger>
                <SelectContent>
                  {cancerTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="stage" className="text-xs font-semibold">Disease Stage</Label>
              <Select value={formData.disease_stage} onValueChange={(value) => handleChange("disease_stage", value)}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {["Stage I", "Stage II", "Stage III", "Stage IV"].map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="biomarkers" className="text-xs font-semibold">Biomarkers (comma-separated)</Label>
              <Input
                id="biomarkers"
                value={formData.biomarkers.join(", ")}
                onChange={(e) =>
                  handleChange(
                    "biomarkers",
                    e.target.value
                      .split(",")
                      .map((b) => b.trim())
                      .filter(Boolean)
                  )
                }
                placeholder="e.g., BRCA1, PD-L1"
                className="text-sm"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="history" className="text-xs font-semibold">Medical History</Label>
              <Input
                id="history"
                value={formData.medical_history}
                onChange={(e) => handleChange("medical_history", e.target.value)}
                placeholder="e.g., Prior chemotherapy, allergies"
                className="text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" onClick={() => setOpen(false)} size="sm">
            Cancel
          </Button>
          <Button onClick={handleSave} size="sm">Save Profile</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ProfileDialog;
