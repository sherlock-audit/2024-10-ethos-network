// Define the Images interface
export type Images = {
  ethosWhiteLogo: string;
};

// Define the images object with type annotations
export const images: Images = {
  ethosWhiteLogo: chrome.runtime.getURL('assets/ethos-white-logo.png'),
};
