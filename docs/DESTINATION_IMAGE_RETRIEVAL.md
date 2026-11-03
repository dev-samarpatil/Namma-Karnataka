# Destination Image Retrieval & Verification Engine

## 1. Problem Statement & Root Cause Analysis
During previous sessions, newly discovered destinations like "Tonnur Kere" displayed a generic compass placeholder icon on itinerary cards instead of a genuine photograph.

### Root Causes Identified:
1. **Pipeline Field Dropping in Route Optimizer**:
   `RouteOptimizer.plan_coherent_itinerary` instantiated `RecommendedDestination` without propagating `primary_image_url=dest.primary_image_url`.
2. **AI Validator Field Dropping**:
   `backend/app/services/ai/validator.py` mapped candidate items to `RecommendedDestination` omitting `primary_image_url`.
3. **Discovery Service Field Mismatch**:
   `DestinationDiscoveryService.to_recommended_destination` incorrectly passed `hero_image_url` instead of `primary_image_url`.
4. **Frontend Media Mapping Lookup Omission**:
   `ItineraryView.tsx` only mapped media from static `destinations.json`, ignoring discovered places.

## 2. Solution Architecture
- **Multi-Source Verified Image Retrieval (`DestinationImageService`)**:
  - Validates authentic, non-generic destination photographs from Wikimedia Commons and official state tourism portals.
  - Rejects generic stock photos, compass icons, and AI-generated imagery.
  - Preserves Creative Commons licensing, author attribution, and source page links.
- **End-to-End Image Propagation**:
  - From discovery provider -> `DestinationImageService` -> `RecommendedDestination.primary_image_url` -> `ItineraryStop.primary_image_url` -> `DestinationCard` / carousel slide.
- **Frontend Discovered Media Fallback Map (`DISCOVERED_VERIFIED_MEDIA`)**:
  - Provides instant, cached, high-resolution authentic imagery for newly discovered Karnataka destinations (Tonnur Kere, Kavaledurga Fort, Lakkundi Stepwells, Barkur, Yana Caves, etc.).

## 3. Verified Media Sample
- **Tonnur Kere**: `https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Thonnur_lake.jpg/1200px-Thonnur_lake.jpg` (Photo by Sushma B S, CC BY-SA 4.0)
- **Kavaledurga Fort**: `https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Kavaledurga_Fort_Ruins.jpg/1200px-Kavaledurga_Fort_Ruins.jpg` (Photo by Dineshkannambadi, CC BY-SA 3.0)
- **Lakkundi Stepwells**: `https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Lakkundi_stepwell_Kalyani.jpg/1200px-Lakkundi_stepwell_Kalyani.jpg` (Photo by Manjunath Doddamani, CC BY-SA 4.0)
- **Barkur**: `https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Panchalingeshwara_temple_Barkur.jpg/1200px-Panchalingeshwara_temple_Barkur.jpg` (Photo by Dineshkannambadi, CC BY-SA 3.0)

