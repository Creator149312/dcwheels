"use client";

import { useContext, useEffect, useState } from "react";
import { FaTools } from "react-icons/fa";
import { Button } from "./ui/button";
import { SegmentsContext } from "@app/SegmentsContext";
import Tooltip from "./Tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import imageCompression from "browser-image-compression";
import toast from "react-hot-toast";
import { FaImage, FaSpinner } from "react-icons/fa";

const themes = [
  {
    name: "Vibrant Sunset",
    colors: ["#FF5733", "#FF8D1A", "#FFBD33", "#FFDF33", "#FFD700"], // Warm oranges and yellows
  },
  {
    name: "Mystic Forest",
    colors: ["#2E8B57", "#228B22", "#6B8E23", "#9ACD32", "#98FB98"], // Fresh greens and earthy tones
  },
  {
    name: "Birds Paradise",
    colors: ["#FF6347", "#FFD700", "#00FA9A", "#FF1493", "#40E0D0"], // Coral reds, sunny yellows, vibrant greens, and ocean blues
  },
  {
    name: "Electric Vibes",
    colors: ["#00FFFF", "#00BFFF", "#1E90FF", "#FFD700", "#FF4500"], // Bright blues, yellows, and oranges
  },
  {
    name: "Ocean Breeze",
    colors: ["#0099FF", "#00BFFF", "#1E90FF", "#00CED1", "#7FFFD4"], // Blues and turquoise tones
  },
  {
    name: "Tropical Paradise",
    colors: ["#FF1493", "#FF6347", "#FF4500", "#32CD32", "#FFD700"], // Bright pink, orange, green, yellow
  },
  {
    name: "Neon Lights",
    colors: ["#39FF14", "#FF007F", "#00FFFF", "#FFFC00", "#FF6600"], // Neon green, pink, cyan, yellow, and orange
  },
  {
    name: "Rock Paper Scissors",
    colors: [
      "#808080", // Rock (Gray)
      "#F5F5F5", // Paper (Light Gray)
      "#FF6347", // Scissors (Red)
      "#2F4F4F", // Background (Dark Slate)
      "#FFD700", // Victory Highlight (Gold)
    ],
  },
  {
    name: "Urban Pulse",
    colors: [
      "#FF6347", // Bright Coral (Vibrant Energy / Sunset)
      "#FFD700", // Golden Yellow (City Lights)
      "#32CD32", // Fresh Green (Parks & Nature)
      "#D3D3D3", // Light Gray (Modern Architecture & Infrastructure)
      "#FF4500", // Vibrant Orange (Sunset / Energy)
    ],
  },
  {
    name: "Days of the Week",
    colors: [
      "#FFD700", // Monday (Golden Yellow for a fresh start and optimism)
      "#00BFFF", // Tuesday (Sky Blue for productivity and focus)
      "#32CD32", // Wednesday (Green for balance and harmony)
      "#FF6347", // Thursday (Coral for energy and excitement)
      "#8A2BE2", // Friday (Purple for creativity and relaxation)
    ],
  },
  {
    name: "Sports Vibes",
    colors: [
      "#FF4500", // Energy (Bright Orange for passion and excitement)
      "#1E90FF", // Focus (Bright Blue for concentration and teamwork)
      "#32CD32", // Victory (Green for success and growth)
      "#FFD700", // Glory (Golden Yellow for achievement and excellence)
      "#8B0000", // Intensity (Deep Red for strength and determination)
    ],
  },
  {
    name: "Anime Vibes",
    colors: [
      "#F9A8D4", // Soft Pink (Popular in anime art and character design)
      "#7DD3FC", // Light Sky Blue (Reflects anime's dynamic backgrounds)
      "#FEE2E2", // Light Peach (Represents anime's warmth and charm)
      "#A78BFA", // Lavender Purple (Often seen in fantasy and magical anime)
      "#D1FAE5", // Mint Green (Used in calming and serene anime scenes)
    ],
  },
  {
    name: "Cosmic Wonders",
    colors: ["#9B4F96", "#4A90E2", "#FFD700", "#F39C12", "#D32F2F"],
  },
  {
    name: "Geographic Wonders",
    colors: ["#006994", "#228B22", "#EDC9AF", "#A9A9A9", "#FFD700"],
  },
  {
    name: "Music Vibes",
    colors: ["#D32F2F", "#0288D1", "#FFC107", "#8E24AA", "#43A047"],
  },
  {
    name: "Global Community",
    colors: ["#F57C00", "#8E24AA", "#0288D1", "#388E3C", "#F44336"],
  },
  {
    name: "Halloween Vibes",
    colors: [
      "#FF5733", // Pumpkin Orange
      "#900C3F", // Blood Red
      "#F39C12", // Neon Yellow (associated with spooky lights)
      "#F1C40F", // Witch's Gold
      "#8E44AD", // Haunted Purple
    ],
  },
  {
    name: "Chemistry Vibes",
    colors: [
      "#0077FF", // Atomic Blue
      "#4CAF50", // Molecule Green
      "#D32F2F", // Chemical Reaction Red
      "#FFEB3B", // Lab Glass Yellow
      "#8E44AD", // Chemical Compound Purple
    ],
  },
  {
    name: "Light Woodish Foolish",
    colors: ["#F5DEB3", "#FFF8DC", "#FAEBD7", "#D3D3D3", "#E8E8E8"],
  },
  {
    name: "Food Theme",
    colors: [
      "#FF6347", // Tomato Red (representing pizza and pasta)
      "#FFD700", // Gold (representing golden fries and croissants)
      "#32CD32", // Lime Green (representing fresh vegetables and salads)
      "#FF4500", // Orange Red (representing spicy foods like tacos and chili)
      "#D2691E", // Chocolate (representing desserts like chocolate cake and brownies)
    ],
  },
  {
    name: "Movie Theme",
    colors: ["#AC1C1C", "#F1C40F", "#D35400", "#2980B9", "#2ECC71"],
  },
  {
    name: "Fortnite Theme",
    colors: [
      "#F5A623", // Orange (representing the game's vibrant, energetic aesthetic)
      "#1E2A47", // Dark Blue (representing the game's night-time or battle royale atmosphere)
      "#9B59B6", // Purple (representing the vibrant skins and the in-game universe)
      "#2ECC71", // Green (representing the game's more natural elements like forests and fields)
      "#E74C3C", // Red (representing the intense action and explosions in the game)
    ],
  },
  {
    name: "Minecraft Theme",
    colors: ["#4E8B1B", "#7C8A42", "#1E2B23", "#D8A96A", "#E0D7B9"],
  },
  {
    name: "Twister Theme",
    colors: ["#FF0000", "#FFFF00", "#00FF00", "#0000FF"],
  },
  {
    name: "Love Theme",
    colors: ["#FF4C7A", "#FF6F61", "#FFB6C1", "#8B0000", "#FFC0CB"],
  },
  {
    name: "Christmas Theme",
    colors: ["#FF0000", "#008000", "#FFD700", "#FFFFFF", "#FF6347"],
  },
  {
    name: "Mild Woodish",
    colors: ["#C19A6B", "#A0522D", "#8B4513", "#D2691E", "#CD853F"],
  },
  {
    name: "Into The Wild",
    colors: ["#F4A261", "#2A9D8F", "#8D6E63", "#3B82F6", "#FF6F61"],
  },
  {
    name: "Marvel Universe",
    colors: ["#D32F2F", "#1976D2", "#FFC107", "#4CAF50", "#9C27B0"],
  },
  {
    name: "Ice Cream Delight",
    colors: [
      "#F8C8DC", // Strawberry Pink (Sweet and fruity)
      "#D2691E", // Chocolate Brown (Rich and indulgent)
      "#98FB98", // Mint Green (Fresh and cool)
      "#FFF5A1", // Vanilla Cream (Classic and smooth)
      "#FF7F50", // Coral (Fruity and refreshing, like tropical flavors)
    ],
  },
  {
    name: "Anatomical Essence",
    colors: [
      "#F4C2C2", // Skin tone (soft pink)
      "#FF6347", // Heart (red)
      "#98FB98", // Lungs (light green)
      "#8B4513", // Muscles (brown)
      "#FFD700", // Bones (golden yellow)
    ],
  },
  {
    name: "Electric Purple",
    colors: ["#8A2BE2", "#9B30FF", "#9400D3", "#DA70D6", "#FF00FF"], // Shades of purple, violet, and magenta
  },
  {
    name: "Rainbow",
    colors: [
      "#FF0000",
      "#FF7F00",
      "#FFFF00",
      "#00FF00",
      "#0000FF",
      "#4B0082",
      "#8B00FF",
    ], // Full spectrum of rainbow colors
  },
  {
    name: "Cyberpunk",
    colors: ["#FF00FF", "#00FF00", "#00FFFF", "#FF00CC", "#FFFF00"], // Bright cyberpunk neon colors
  },
  {
    name: "Sunset Beach",
    colors: ["#FF4500", "#FF6347", "#FF7F50", "#FF8C00", "#FFD700"], // Sunset oranges, reds, and yellows
  },
  {
    name: "Electric Blue",
    colors: ["#00BFFF", "#1E90FF", "#4169E1", "#0000FF", "#00008B"], // Different shades of blue with some vibrant highlights
  },
  {
    name: "Tropical Sunset",
    colors: ["#F56B00", "#FF4500", "#FF6347", "#FFD700", "#FF8C00"], // A warm tropical sunset palette with oranges and reds
  },
  {
    name: "Argentina",
    colors: ["#75AADB", "#FFFFFF"], // Light blue and white
  },
  {
    name: "Australia",
    colors: ["#002868", "#FFFFFF", "#EF3340"], // Blue, white, and red
  },
  {
    name: "Brazil",
    colors: ["#009C3B", "#FFDF00", "#002776"], // Green, yellow, and blue
  },
  {
    name: "Canada",
    colors: ["#FF0000", "#FFFFFF"], // Red and white
  },
  {
    name: "China",
    colors: ["#FF0000", "#FFD700"], // Red and gold
  },
  {
    name: "France",
    colors: ["#002395", "#FFFFFF", "#ED2939"], // Blue, white, and red
  },
  {
    name: "Germany",
    colors: ["#000000", "#FFCC00", "#FF0000"], // Black, gold, and red
  },
  {
    name: "India",
    colors: ["#FF9933", "#FFFFFF", "#138808"], // Orange, white, and green
  },
  {
    name: "Indonesia",
    colors: ["#FF0000", "#FFFFFF"], // Red and white
  },
  {
    name: "Italy",
    colors: ["#009246", "#FFFFFF", "#CE2B37"], // Green, white, and red
  },
  {
    name: "Japan",
    colors: ["#BC002D", "#FFFFFF"], // Red and white
  },
  {
    name: "Republic of Korea",
    colors: ["#003478", "#FFFFFF", "#C60C30"], // Blue, white, and red
  },
  {
    name: "Mexico",
    colors: ["#006847", "#FFFFFF", "#CE1126"], // Green, white, and red
  },
  {
    name: "Russia",
    colors: ["#0039A6", "#FFFFFF", "#D52B1E"], // Blue, white, and red
  },
  {
    name: "Saudi Arabia",
    colors: ["#006C35", "#FFFFFF"], // Green and white
  },
  {
    name: "South Africa",
    colors: ["#007847", "#FFC72C", "#EF2B2D", "#000000", "#FFFFFF"], // Green, yellow, red, black, and white
  },
  {
    name: "Turkey",
    colors: ["#E30A17", "#FFFFFF"], // Red and white
  },
  {
    name: "United Kingdom",
    colors: ["#00247D", "#FFFFFF", "#CF142B"], // Blue, white, and red
  },
  {
    name: "United States",
    colors: ["#B22234", "#FFFFFF", "#3C3B6E"], // Red, white, and blue
  },
  {
    name: "European Union",
    colors: ["#003399", "#FFD700"], // Blue and gold
  },
  {
    name: "Medical Marvel",
    colors: ["#FFFFFF", "#1E90FF", "#008000"], // White, dodger blue, green
  },
  {
    name: "Corporate Office",
    colors: ["#000080", "#808080", "#FFFFFF"], // Navy blue, grey, white
  },
  {
    name: "Creative Studio",
    colors: ["#FFFF00", "#FF00FF", "#00FFFF"], // Yellow, magenta, cyan
  },
];

/**
 *
 * @returns a popup window for all the wheel settings like theme, spin duration and max number of segments to show
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "./ui/dialog";

const SettingsAdv = ({ advOptions }) => {
  const {
    handleWheelSettingsChange,
    wheelData,
    MAX_OPTIONS_ON_WHEEL,
    MAX_SPIN_TIME,
    FONT_SIZE,
    setSegData,
  } = useContext(SegmentsContext);
  const [isOpen, setIsOpen] = useState(false);
  const currentTheme = { name: "Current", colors: wheelData.segColors };
  const [selectedTheme, setSelectedTheme] = useState(currentTheme);
  const [spinDuration, setSpinDuration] = useState(wheelData.spinDuration); // Size default to 1.0 (maximum size)
  const [maxOptions, setMaxOptions] = useState(wheelData.maxNumberOfOptions);
  const [rmvWinnerAfterSpin, setRmvWinnerAfterSpin] = useState(
    wheelData?.removeWinnerAfterSpin ? wheelData.removeWinnerAfterSpin : false
  );
  const [customPopupDisplayMessage, setCustomPopupDisplayMessage] = useState(
    wheelData?.customPopupDisplayMessage
      ? wheelData.customPopupDisplayMessage
      : "The Winner is..."
  );
  const [fontSize, setFontSize] = useState(
    wheelData?.fontSize ? wheelData.fontSize : 1
  );
  const [innerRadius, setInnerRadius] = useState(
    wheelData?.innerRadius ? wheelData.innerRadius : 1
  );
  const [mysteryMode, setMysteryMode] = useState(
    wheelData?.mysteryMode || false
  );
  const [centerText, setCenterText] = useState(
    wheelData?.centerText || ""
  );
  const [centerImage, setCenterImage] = useState(
    wheelData?.centerImage || ""
  );
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (file) => {
    if (!file) return;

    try {
      setUploadingImage(true);
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 400,
        useWebWorker: true,
      });

      // Store as a data: URL. Wheel-save (useSaveWheel) pushes this to
      // Blob storage only if the user commits the wheel.
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(compressed);
      });

      setCenterImage(dataUrl);
      setCenterText(""); // clear text if image is set
      toast.success("Image added");
    } catch (error) {
      toast.error(error.message || "Failed to set image. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
  };

  // Handle theme change
  const handleThemeChange = (theme) => {
    setSelectedTheme(theme);
  };

  // Handle size change
  const onSpinDurationChange = (e) => {
    setSpinDuration(parseInt(e.target.value));
  };

  const onRmvWinnerAfterSpinChange = (e) => {
    setRmvWinnerAfterSpin(e.target.checked);
  };

  const onCustomPopupDisplayMessageChange = (e) => {
    setCustomPopupDisplayMessage(e.target.value);
  };

  // Handle options size change
  const onMaxOptionsChange = (e) => {
    setMaxOptions(parseInt(e.target.value));
  };

  const onFontSizeChange = (e) => {
    setFontSize(parseInt(e.target.value));
  };

  const onInnerRadiusChange = (e) => {
    setInnerRadius(parseInt(e.target.value));
  };

  // Handle close modal
  const handleClose = () => setIsOpen(false);

  // Handle apply changes
  const handleApply = () => {
    // console.log("rmvWinnerAfterSpin = ", rmvWinnerAfterSpin);
    handleWheelSettingsChange({
      segColors: selectedTheme.colors,
      maxNumberOfOptions: maxOptions,
      spinDuration,
      removeWinnerAfterSpin: rmvWinnerAfterSpin,
      customPopupDisplayMessage,
      fontSize,
      innerRadius,
      mysteryMode,
      centerText,
      centerImage,
    });

    setIsOpen(false); // Close the modal after applying changes
  };

  //this is used when we import a wheel with preset settings
  useEffect(() => {
    setMaxOptions(wheelData.maxNumberOfOptions);
    setSelectedTheme({ name: "Current", colors: wheelData.segColors });
    setSpinDuration(wheelData.spinDuration);
    setRmvWinnerAfterSpin(wheelData.removeWinnerAfterSpin);
    setCustomPopupDisplayMessage(wheelData.customPopupDisplayMessage);
    setFontSize(wheelData.fontSize);
    setInnerRadius(wheelData.innerRadius);
    setMysteryMode(wheelData?.mysteryMode || false);
    setCenterText(wheelData?.centerText || "");
    setCenterImage(wheelData?.centerImage || "");

    if (advOptions) {
      setSegData((prevSegData) =>
        prevSegData.map((segment, index) => ({
          text: segment.text,
          weight: segment.weight,
          visible: segment.visible,
          color: wheelData.segColors[index % wheelData.segColors.length],
        }))
      );
    }
  }, [wheelData]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip text="Customize Wheel">
        <DialogTrigger asChild>
          <Button className="my-1 px-2 py-0 h-7 text-xs">
            <FaTools size={20} />
          </Button>
        </DialogTrigger>
      </Tooltip>

      <DialogContent className="max-w-[90vw] md:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Wheel Settings</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="appearance" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="appearance" className="space-y-4 pt-4">
            {/* Theme Selection with Drop-down */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium leading-none">Select Theme</h3>
              <select
                onChange={(e) => {
                  const theme =
                    e.target.value === "Current"
                      ? currentTheme
                      : themes.find((t) => t.name === e.target.value);
                  handleThemeChange(theme);
                }}
                value={selectedTheme.name}
                className="w-full flex h-9 items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option key={currentTheme.name} value={currentTheme.name} className="dark:bg-gray-800">
                  {currentTheme.name}
                </option>
                {themes.map((theme) => (
                  <option key={theme.name} value={theme.name} className="dark:bg-gray-800">
                    {theme.name}
                  </option>
                ))}
              </select>

              {/* Grid of colors for the selected theme */}
              <div className="grid grid-cols-5 gap-2">
                {selectedTheme.colors.map((color, index) => (
                  <div
                    key={index}
                    className="h-8 rounded-md border"
                    style={{
                      backgroundColor: color,
                    }}
                  ></div>
                ))}
              </div>
            </div>

            {/* Range Input for Size Adjustment */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium leading-none">
                Max Options Displayed ({maxOptions})
              </h3>
              <input
                type="range"
                min="4"
                max={MAX_OPTIONS_ON_WHEEL}
                step="1"
                value={maxOptions}
                onChange={onMaxOptionsChange}
                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>4</span>
                <span>{MAX_OPTIONS_ON_WHEEL}</span>
              </div>
            </div>

            {/* Range Input for Inner Radius Adjustment */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium leading-none">
                Inner Radius ({innerRadius})
              </h3>
              <input
                type="range"
                min="0"
                max="30"
                step="1"
                value={innerRadius}
                onChange={onInnerRadiusChange}
                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0</span>
                <span>30</span>
              </div>
            </div>

            {/* Center Branding Content */}
            <div className="space-y-2 border-t pt-4 mt-2">
              <h3 className="text-sm font-medium leading-none">Center Branding</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={centerText}
                  onChange={(e) => {
                    setCenterText(e.target.value);
                    if (e.target.value) setCenterImage(""); // clear image if text is entered
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Center Text (e.g. SPIN)"
                />
                <div className="text-xs text-center text-muted-foreground">OR</div>
                
                {/* Drag and Drop Image Upload */}
                <div
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onClick={() => document.getElementById('center-image-upload').click()}
                  className={`w-full h-16 border-2 border-dashed rounded-md flex items-center justify-center cursor-pointer transition-colors ${
                    uploadingImage ? 'opacity-50 cursor-wait' : 'hover:bg-slate-50'
                  }`}
                >
                  <input
                    id="center-image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleImageUpload(e.target.files[0]);
                      }
                    }}
                    disabled={uploadingImage}
                  />
                  {uploadingImage ? (
                    <div className="flex items-center text-muted-foreground text-sm">
                      <FaSpinner className="animate-spin mr-2" /> Uploading...
                    </div>
                  ) : centerImage ? (
                    <div className="flex items-center space-x-2">
                      <img src={centerImage} alt="Center" className="h-10 w-10 object-cover rounded-full shadow-sm" />
                      <span className="text-xs text-blue-500 hover:text-blue-700 underline" onClick={(e) => {
                        e.stopPropagation(); // prevent opening file dialog
                        setCenterImage("");
                      }}>Remove Image</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-muted-foreground text-sm">
                      <FaImage className="mr-2" size={16} /> Click or drag image here
                    </div>
                  )}
                </div>
              </div>
            </div>

          </TabsContent>

          <TabsContent value="settings" className="space-y-4 pt-4">
            {/* Range Input for Size Adjustment */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium leading-none">
                Spin Duration ({spinDuration}s)
              </h3>
              <input
                type="range"
                min="1"
                max={MAX_SPIN_TIME}
                step="1"
                value={spinDuration}
                onChange={onSpinDurationChange}
                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Fast</span>
                <span>Slow</span>
              </div>
            </div>

            <div className="flex flex-row justify-between items-center rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <h4 className="text-sm font-medium">Auto Remove Winner</h4>
                <div className="text-xs text-muted-foreground">
                  Remove the winning segment from next spin
                </div>
              </div>
              <input
                type="checkbox"
                checked={rmvWinnerAfterSpin}
                onChange={onRmvWinnerAfterSpinChange}
                className="w-4 h-4 cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium leading-none">
                Applaud Message
              </h4>
              <input
                type="text"
                value={customPopupDisplayMessage}
                onChange={onCustomPopupDisplayMessageChange}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="The Winner is..."
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium leading-none">
                Font Size ({fontSize})
              </h3>
              <input
                type="range"
                min="10"
                max="50"
                step="1"
                value={fontSize}
                onChange={onFontSizeChange}
                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Small</span>
                <span>Large</span>
              </div>
            </div>

            {/* Mystery Mode */}
            <div className="flex flex-row justify-between items-center rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <h4 className="text-sm font-medium">Mystery Wheel</h4>
                <div className="text-xs text-muted-foreground">
                  Hide segment text until a spin reveals the winner
                </div>
              </div>
              <input
                type="checkbox"
                checked={mysteryMode}
                onChange={(e) => setMysteryMode(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
            </div>

          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button onClick={handleApply}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsAdv;
