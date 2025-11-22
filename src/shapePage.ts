/**
 * Shape Page Schema
 * Structured data model for representing web content as tactile geometry
 */

/**
 * Height tiers - canonical levels for consistent tactile representation
 */
export const HeightTier = {
  Level0: 0, // Background plane (minHeight)
  Level1: 1, // Text areas (subtle raise)
  Level2: 2, // Interactive surfaces (buttons, links, cards)
  Level3: 3, // Structural emphasis (headings, nav bars)
  Level4: 4, // Alerts/modals/critical focus
} as const;

export type HeightTier = typeof HeightTier[keyof typeof HeightTier];

/**
 * Texture types - tactile patterns for instant recognition
 */
export const TextureType = {
  Smooth: 'smooth',                    // No microtexture - background and containers
  FineRidges: 'fineRidges',            // Fine horizontal ridges - headings
  UltraFineRidges: 'ultraFineRidges',  // Ultra-fine ridges - paragraphs
  Dots: 'dots',                        // Stipple pattern - links/buttons
  Pebbled: 'pebbled',                  // Coarse pebbled texture - media placeholders
} as const;

export type TextureType = typeof TextureType[keyof typeof TextureType];

/**
 * Landmark types - major page regions
 */
export const LandmarkType = {
  Header: 'header',
  Nav: 'nav',
  Main: 'main',
  Sidebar: 'sidebar',
  Footer: 'footer',
} as const;

export type LandmarkType = typeof LandmarkType[keyof typeof LandmarkType];

/**
 * Content block types - semantic elements
 */
export const ContentBlockType = {
  Heading: 'heading',
  Paragraph: 'paragraph',
  List: 'list',
  Media: 'media',
  Button: 'button',
  Link: 'link',
  Table: 'table',
  FormField: 'formField',
  Alert: 'alert',
} as const;

export type ContentBlockType = typeof ContentBlockType[keyof typeof ContentBlockType];

/**
 * Rectangle bounds in normalized coordinates (0-1)
 */
export interface Rectangle {
  x: number;      // Left edge (0 = left, 1 = right)
  y: number;      // Top edge (0 = top, 1 = bottom)
  width: number;  // Width (0-1)
  height: number; // Height (0-1)
}

/**
 * Base interface for all tactile primitives
 */
export interface TactilePrimitive {
  bounds: Rectangle;
  heightTier: HeightTier;
  textureType: TextureType;
  interactive: boolean; // Can be focused/activated
  id?: string;          // Optional identifier for navigation
}

/**
 * Landmark - major page region containing content blocks
 */
export interface Landmark extends TactilePrimitive {
  landmarkType: LandmarkType;
  blocks?: ContentBlock[]; // Contained content blocks
}

/**
 * Content block - semantic element within a landmark
 */
export interface ContentBlock extends TactilePrimitive {
  blockType: ContentBlockType;
  text?: string;        // Optional text content (for Braille)
  imageUrl?: string;    // Optional image URL (for tactile bitmap rendering)
  imageAlt?: string;    // Optional image alt text (for accessibility)
  children?: ContentBlock[]; // Nested blocks (e.g., list items)
}

/**
 * Shape Page - complete tactile representation of a web page
 */
export interface ShapePage {
  gridSize: number;           // Pin grid size (NxN)
  landmarks: Landmark[];     // Major page regions
  primitives?: TactilePrimitive[]; // Additional standalone primitives
}

