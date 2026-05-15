// image-loader.js
export default function productionImageLoader({ src }) {
    // Directly returns the remote URL string as-is to the frontend image element
    return src;
  }