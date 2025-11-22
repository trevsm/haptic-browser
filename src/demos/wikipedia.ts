/**
 * Saturn Blog Demo
 * Hand-authored ShapePage representing a blog site about Saturn
 */

import type { ShapePage, Landmark } from "../shapePage";
import {
  HeightTier,
  TextureType,
  LandmarkType,
  ContentBlockType,
} from "../shapePage";

/**
 * Create Saturn blog demo page
 * @param gridSize - Grid size for the pin field (defaults to 50)
 */
export function createWikipediaDemo(gridSize: number = 50): ShapePage {
  // Header landmark - centered layout
  const header: Landmark = {
    bounds: { x: 0, y: 0, width: 1, height: 0.1 },
    heightTier: HeightTier.Level3,
    textureType: TextureType.Smooth,
    interactive: false,
    landmarkType: LandmarkType.Header,
    id: "header",
    blocks: [
      // Blog title/logo (centered)
      {
        bounds: { x: 0.35, y: 0.02, width: 0.3, height: 0.05 },
        heightTier: HeightTier.Level3,
        textureType: TextureType.Dots,
        interactive: true,
        blockType: ContentBlockType.Button,
        text: "Saturn Blog",
        id: "site-identity",
      },
      // Navigation links (centered below title)
      {
        bounds: { x: 0.35, y: 0.08, width: 0.08, height: 0.02 },
        heightTier: HeightTier.Level2,
        textureType: TextureType.Dots,
        interactive: true,
        blockType: ContentBlockType.Link,
        text: "Home",
        id: "nav-home",
      },
      {
        bounds: { x: 0.44, y: 0.08, width: 0.08, height: 0.02 },
        heightTier: HeightTier.Level2,
        textureType: TextureType.Dots,
        interactive: true,
        blockType: ContentBlockType.Link,
        text: "About",
        id: "nav-about",
      },
      {
        bounds: { x: 0.53, y: 0.08, width: 0.08, height: 0.02 },
        heightTier: HeightTier.Level2,
        textureType: TextureType.Dots,
        interactive: true,
        blockType: ContentBlockType.Link,
        text: "Contact",
        id: "nav-contact",
      },
    ],
  };

  // Main content landmark - wider, no left sidebar
  const mainContent: Landmark = {
    bounds: { x: 0.1, y: 0.1, width: 0.65, height: 0.85 },
    heightTier: HeightTier.Level1,
    textureType: TextureType.Smooth,
    interactive: false,
    landmarkType: LandmarkType.Main,
    id: "main-content",
    blocks: [
      // Blog post title
      {
        bounds: { x: 0.02, y: 0.02, width: 0.61, height: 0.06 },
        heightTier: HeightTier.Level3,
        textureType: TextureType.FineRidges,
        interactive: false,
        blockType: ContentBlockType.Heading,
        text: "Exploring Saturn: The Ringed Planet",
        id: "post-title",
      },
      // Post metadata (date, author)
      {
        bounds: { x: 0.02, y: 0.09, width: 0.61, height: 0.03 },
        heightTier: HeightTier.Level1,
        textureType: TextureType.UltraFineRidges,
        interactive: false,
        blockType: ContentBlockType.Paragraph,
        text: "Published: March 15, 2024 | Author: Space Explorer",
        id: "post-meta",
      },
      // Featured image - Saturn (full width)
      {
        bounds: { x: 0.02, y: 0.14, width: 0.61, height: 0.22 },
        heightTier: HeightTier.Level2,
        textureType: TextureType.Pebbled,
        interactive: true,
        blockType: ContentBlockType.Media,
        imageUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Dscovrepicmoontransitfull.gif/250px-Dscovrepicmoontransitfull.gif",
        imageAlt: "Saturn during equinox showing its rings edge-on",
        id: "featured-image",
      },
      // Introduction paragraph
      {
        bounds: { x: 0.02, y: 0.38, width: 0.61, height: 0.08 },
        heightTier: HeightTier.Level1,
        textureType: TextureType.UltraFineRidges,
        interactive: true,
        blockType: ContentBlockType.Paragraph,
        text: "Saturn, the sixth planet from the Sun, is one of the most recognizable planets in our solar system. Known for its spectacular ring system, Saturn has captivated astronomers and space enthusiasts for centuries. In this post, we'll explore what makes this gas giant so fascinating.",
        id: "intro-paragraph",
      },
      // Section heading: The Rings
      {
        bounds: { x: 0.02, y: 0.48, width: 0.61, height: 0.04 },
        heightTier: HeightTier.Level3,
        textureType: TextureType.FineRidges,
        interactive: false,
        blockType: ContentBlockType.Heading,
        text: "The Magnificent Rings",
        id: "section-rings",
      },
      // Paragraph about rings
      {
        bounds: { x: 0.02, y: 0.54, width: 0.38, height: 0.1 },
        heightTier: HeightTier.Level1,
        textureType: TextureType.UltraFineRidges,
        interactive: true,
        blockType: ContentBlockType.Paragraph,
        text: "Saturn's rings are composed primarily of ice particles and rocky debris. The ring system extends hundreds of thousands of kilometers from the planet but is remarkably thin—only about 10 meters thick in some places. The rings are divided into several major groups, each with its own unique characteristics.",
        id: "paragraph-rings",
      },
      // Image - Ring detail (right side)
      {
        bounds: { x: 0.42, y: 0.54, width: 0.21, height: 0.15 },
        heightTier: HeightTier.Level2,
        textureType: TextureType.Pebbled,
        interactive: true,
        blockType: ContentBlockType.Media,
        imageUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Saturn_during_Equinox.jpg/330px-Saturn_during_Equinox.jpg",
        imageAlt: "Detailed view of Saturn's rings showing their structure",
        id: "image-rings",
      },
      // Section heading: Moons
      {
        bounds: { x: 0.02, y: 0.66, width: 0.61, height: 0.04 },
        heightTier: HeightTier.Level3,
        textureType: TextureType.FineRidges,
        interactive: false,
        blockType: ContentBlockType.Heading,
        text: "A World of Moons",
        id: "section-moons",
      },
      // Paragraph about moons
      {
        bounds: { x: 0.02, y: 0.72, width: 0.38, height: 0.1 },
        heightTier: HeightTier.Level1,
        textureType: TextureType.UltraFineRidges,
        interactive: true,
        blockType: ContentBlockType.Paragraph,
        text: "Saturn has over 140 known moons, with Titan being the largest and most intriguing. Titan is larger than Mercury and has a thick atmosphere, making it one of the most Earth-like worlds in our solar system. Other notable moons include Enceladus, which spews water ice from its south pole, and Mimas, which resembles the Death Star from Star Wars.",
        id: "paragraph-moons",
      },
      // GIF example - Moon transit animation (first frame)
      {
        bounds: { x: 0.42, y: 0.72, width: 0.21, height: 0.15 },
        heightTier: HeightTier.Level2,
        textureType: TextureType.Pebbled,
        interactive: true,
        blockType: ContentBlockType.Media,
        imageUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Dscovrepicmoontransitfull.gif/250px-Dscovrepicmoontransitfull.gif",
        imageAlt: "Animated GIF showing moon transit (first frame displayed)",
        id: "gif-example",
      },
      // Tags section
      {
        bounds: { x: 0.02, y: 0.84, width: 0.61, height: 0.04 },
        heightTier: HeightTier.Level1,
        textureType: TextureType.UltraFineRidges,
        interactive: false,
        blockType: ContentBlockType.Paragraph,
        text: "Tags: Saturn, Rings, Moons, Space Exploration, Astronomy",
        id: "post-tags",
      },
    ],
  };

  // Right sidebar - Categories, Recent posts, Subscribe
  const rightSidebar: Landmark = {
    bounds: { x: 0.77, y: 0.1, width: 0.2, height: 0.85 },
    heightTier: HeightTier.Level2,
    textureType: TextureType.Smooth,
    interactive: false,
    landmarkType: LandmarkType.Sidebar,
    id: "right-sidebar",
    blocks: [
      // Categories heading
      {
        bounds: { x: 0.02, y: 0.02, width: 0.16, height: 0.04 },
        heightTier: HeightTier.Level3,
        textureType: TextureType.FineRidges,
        interactive: false,
        blockType: ContentBlockType.Heading,
        text: "Categories",
        id: "categories-heading",
      },
      // Category links
      {
        bounds: { x: 0.02, y: 0.08, width: 0.16, height: 0.03 },
        heightTier: HeightTier.Level2,
        textureType: TextureType.Dots,
        interactive: true,
        blockType: ContentBlockType.Link,
        text: "Rings",
        id: "cat-rings",
      },
      {
        bounds: { x: 0.02, y: 0.12, width: 0.16, height: 0.03 },
        heightTier: HeightTier.Level2,
        textureType: TextureType.Dots,
        interactive: true,
        blockType: ContentBlockType.Link,
        text: "Moons",
        id: "cat-moons",
      },
      {
        bounds: { x: 0.02, y: 0.16, width: 0.16, height: 0.03 },
        heightTier: HeightTier.Level2,
        textureType: TextureType.Dots,
        interactive: true,
        blockType: ContentBlockType.Link,
        text: "Exploration",
        id: "cat-exploration",
      },
      // Recent posts heading
      {
        bounds: { x: 0.02, y: 0.24, width: 0.16, height: 0.04 },
        heightTier: HeightTier.Level3,
        textureType: TextureType.FineRidges,
        interactive: false,
        blockType: ContentBlockType.Heading,
        text: "Recent Posts",
        id: "recent-heading",
      },
      {
        bounds: { x: 0.02, y: 0.3, width: 0.16, height: 0.03 },
        heightTier: HeightTier.Level2,
        textureType: TextureType.Dots,
        interactive: true,
        blockType: ContentBlockType.Link,
        text: "Saturn's Rings",
        id: "recent-1",
      },
      {
        bounds: { x: 0.02, y: 0.34, width: 0.16, height: 0.03 },
        heightTier: HeightTier.Level2,
        textureType: TextureType.Dots,
        interactive: true,
        blockType: ContentBlockType.Link,
        text: "Titan Exploration",
        id: "recent-2",
      },
      {
        bounds: { x: 0.02, y: 0.38, width: 0.16, height: 0.03 },
        heightTier: HeightTier.Level2,
        textureType: TextureType.Dots,
        interactive: true,
        blockType: ContentBlockType.Link,
        text: "Cassini Mission",
        id: "recent-3",
      },
      // Subscribe section heading
      {
        bounds: { x: 0.02, y: 0.46, width: 0.16, height: 0.04 },
        heightTier: HeightTier.Level3,
        textureType: TextureType.FineRidges,
        interactive: false,
        blockType: ContentBlockType.Heading,
        text: "Subscribe",
        id: "subscribe-heading",
      },
      // Email input
      {
        bounds: { x: 0.02, y: 0.52, width: 0.16, height: 0.04 },
        heightTier: HeightTier.Level1,
        textureType: TextureType.Smooth,
        interactive: true,
        blockType: ContentBlockType.FormField,
        id: "email-input",
      },
      // Subscribe button
      {
        bounds: { x: 0.02, y: 0.58, width: 0.16, height: 0.04 },
        heightTier: HeightTier.Level2,
        textureType: TextureType.Dots,
        interactive: true,
        blockType: ContentBlockType.Button,
        text: "Subscribe",
        id: "subscribe-button",
      },
      // About section heading
      {
        bounds: { x: 0.02, y: 0.66, width: 0.16, height: 0.04 },
        heightTier: HeightTier.Level3,
        textureType: TextureType.FineRidges,
        interactive: false,
        blockType: ContentBlockType.Heading,
        text: "About",
        id: "about-heading",
      },
      // About text
      {
        bounds: { x: 0.02, y: 0.72, width: 0.16, height: 0.12 },
        heightTier: HeightTier.Level1,
        textureType: TextureType.UltraFineRidges,
        interactive: false,
        blockType: ContentBlockType.Paragraph,
        text: "Welcome to Saturn Blog! Join us as we explore the mysteries and wonders of the ringed planet through articles, images, and discoveries.",
        id: "about-text",
      },
    ],
  };

  // Footer landmark
  const footer: Landmark = {
    bounds: { x: 0, y: 0.95, width: 1, height: 0.05 },
    heightTier: HeightTier.Level1,
    textureType: TextureType.Smooth,
    interactive: false,
    landmarkType: LandmarkType.Footer,
    id: "footer",
    blocks: [
      {
        bounds: { x: 0.1, y: 0.01, width: 0.65, height: 0.03 },
        heightTier: HeightTier.Level1,
        textureType: TextureType.UltraFineRidges,
        interactive: false,
        blockType: ContentBlockType.Paragraph,
        text: "© 2024 Saturn Blog. All rights reserved. | Privacy Policy | Terms of Service",
        id: "footer-text",
      },
    ],
  };

  return {
    gridSize,
    landmarks: [header, mainContent, rightSidebar, footer],
  };
}
