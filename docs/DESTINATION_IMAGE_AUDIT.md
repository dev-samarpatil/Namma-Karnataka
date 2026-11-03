# Destination Image Audit Report — Namma Karnataka

**Generated:** November 2026  
**Scope:** Complete verification of all primary seed destinations and dynamically discovered offbeat heritage destinations.  
**Provider Standards:** Authentic, verified photography sourced from Wikimedia Commons with direct canonical CDN endpoints and resilient backend image proxy caching.

---

## 1. Executive Summary

An audit of the destination photography pipeline was conducted to address instances where destinations (such as Tonnur Kere and newly discovered regional sites) exhibited fallback compass icons in the itinerary carousel.

### Root Cause Analysis & Rectification
1. **Case-Sensitivity & Typo Resolution:**  
   The image identifier for Tonnur Kere previously targeted `Thonnur_lake.jpg` with a lowercase `l`, returning HTTP 404 from Wikimedia. The canonical asset is `File:Thonnur_Lake.jpg` (`https://upload.wikimedia.org/wikipedia/commons/0/06/Thonnur_Lake.jpg`), returning HTTP 200 OK (88,711 bytes).
2. **Wikimedia CDN Thumbnail Protocol Enforcement:**  
   Requests to arbitrary thumbnail widths via `.../wikipedia/commons/thumb/.../1200px-...` now trigger HTTP 400 Bad Request under Wikimedia's updated thumbnail policy. All destination registries were updated to direct unscaled canonical Wikimedia Commons endpoints (`https://upload.wikimedia.org/wikipedia/commons/{h1}/{h1h2}/{filename}`).
3. **User-Agent Compliance:**  
   Direct automated requests without a declared User-Agent return HTTP 403 Forbidden. The backend proxy service enforces compliant identifying headers (`NammaKarnatakaTravelApp/1.0 (https://karnataka.gov.in; tourism@nammakarnataka.org)`).
4. **Backend Resilient Media Proxy:**  
   The dedicated endpoint `@router.get("/destinations/media/proxy")` in `backend/app/api/v1/destinations.py` verifies allowed domains, downloads authentic imagery, caches to local disk (`static/media_cache/`), and returns images with `Cache-Control: public, max-age=604800`.
5. **Frontend Two-Tier Fallback:**  
   `ItineraryView.tsx`, `DestinationCard.tsx`, and `polaroid-line-carousel.tsx` support primary proxied requests with automatic direct unscaled CDN fallback, ensuring zero broken image frames.

---

## 2. Discovered Offbeat Heritage Registry Audit

All 18 offbeat discovered destinations have been systematically tested and verified:

| Destination ID | Name / Title | Canonical Direct Wikimedia URL | HTTP Status | Size (Bytes) | License |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `gaz-kavaledurga-fort` | Kavaledurga Fort | `.../3/3b/Aerial_view_of_Kavale_Durga_Fort%2C_Thirthahalli%2C_Shimoga.jpg` | 200 OK | 9,366,870 | CC BY-SA 4.0 |
| `gaz-lakkundi-stepwells` | Lakkundi Stepwells | `.../4/44/Muskin_Bhanvi_in_Lakkundi_-_1.jpg` | 200 OK | 8,289,588 | CC BY-SA 3.0 |
| `gaz-barkur-temple-town` | Barkur Temple Town | `.../2/2d/Barkur_Fort_01.jpg` | 200 OK | 6,098,172 | CC BY-SA 3.0 |
| `gaz-tonnur-kere` | Tonnur Kere (Thonnur Lake) | `.../0/06/Thonnur_Lake.jpg` | 200 OK | 88,711 | CC BY-SA 4.0 |
| `gaz-yana-caves` | Yana Caves & Rock Formations | `.../b/b5/Yana_Karnataka.jpg` | 200 OK | 884,047 | CC BY-SA 3.0 |
| `osm-node-shettihalli-church`| Shettihalli Rosary Church | `.../3/3c/The_Floating_Church.jpg` | 200 OK | 9,244,213 | CC BY-SA 4.0 |
| `osm-node-maravanthe-beach` | Maravanthe Beach | `.../c/cf/Maravanthe_Beach.jpg` | 200 OK | 8,561,681 | CC BY-SA 3.0 |
| `osm-node-nandi-bhoga-temple` | Bhoga Nandeeshwara Temple | `.../7/73/Bhoga_Nandeeshwara_Temple_-_North_Side_View.jpg` | 200 OK | 10,013,770 | CC BY-SA 3.0 |
| `asi-lakshmi-devi-doddagaddavalli`| Lakshmi Devi Temple | `.../5/5d/1113_CE_Lakshmi_Devi_temple%2C_Doddagaddavalli_Karnataka.jpg` | 200 OK | 1,988,473 | CC BY-SA 3.0 |
| `asi-mahmud-gawan-madrasa-bidar`| Mahmud Gawan Madrasa | `.../f/fa/Complete_view_of_Mahumad_Gawan.JPG` | 200 OK | 1,511,282 | CC BY-SA 4.0 |
| `asi-aihole-durga-complex` | Aihole Durga Temple Complex | `.../9/90/Durga_Temple_of_Aihole.jpg` | 200 OK | 4,885,605 | CC BY-SA 3.0 |
| `asi-chitradurga-fort` | Chitradurga Fort | `.../2/2d/Chitradurga_Fort_Siddeshwara_Temple.jpg` | 200 OK | 5,899,002 | CC BY-SA 3.0 |
| `asi-pattadakal-group` | Pattadakal Temple Complex | `.../3/3f/Pattadakal_temple.jpg` | 200 OK | 130,858 | CC BY-SA 3.0 |
| `kstdc-gokarna-kudle` | Kudle Beach, Gokarna | `.../0/06/Kudle_beach.jpg` | 200 OK | 2,274,093 | CC BY-SA 4.0 |
| `kstdc-talakaveri` | Talakaveri Holy Spring & Tank | `.../e/e5/Talakaveri_temple_tank_01.jpg` | 200 OK | 7,410,375 | CC BY-SA 3.0 |
| `kstdc-mysore-palace` | Mysore Palace | `.../a/a4/Mysore_Palace_Morning.jpg` | 200 OK | 5,232,382 | CC BY-SA / GNU |
| `kstdc-chamundi-hills` | Chamundi Hills & Temple | `.../1/15/Chamundeshwari.jpg` | 200 OK | 157,348 | CC BY-SA 4.0 |
| `kstdc-jog-falls` | Jog Falls | `.../1/14/Jog-falls.jpg` | 200 OK | 94,226 | CC BY-SA 4.0 |

---

## 3. Verified Seed Destinations Photography Audit

The core seed destination catalogue across all 31 Karnataka districts utilizes verified authentic photography synchronized between `backend/app/services/media/image_search.py` and `frontend/src/features/itinerary/verifiedDestinationMedia.json`:

* **Bengaluru Urban & Rural:** Bangalore Palace, Lalbagh Botanical Garden, Bannerghatta National Park, Devanahalli Fort, Nandi Hills.
* **Mysuru & Mandya:** Mysore Palace, Chamundi Hills, Brindavan Gardens, Ranganathittu Bird Sanctuary, Shivanasamudra Falls, Tonnur Kere.
* **Hassan & Chikkamagaluru:** Belur Chennakeshava Temple, Halebidu Hoysaleshwara Temple, Mullayanagiri, Kudremukh, Doddagaddavalli.
* **Coastal & Uttara Kannada:** Murudeshwar Temple & Beach, Gokarna Om Beach, Kudle Beach, Yana Rocks, Maravanthe Beach, Barkur.
* **Northern Karnataka Heritage:** Hampi Virupaksha Temple, Vijaya Vittala Complex, Badami Cave Temples, Aihole Durga Complex, Pattadakal, Gol Gumbaz (Vijayapura), Bidar Fort, Mahmud Gawan Madrasa.

All entries resolve to valid Wikimedia Commons resources with clear creator attributions and permissive Creative Commons licensing.

