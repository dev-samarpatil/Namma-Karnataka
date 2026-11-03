# Karnataka Regional Food Intelligence & Eatery Guide

## 1. Overview
The Karnataka Local Food Intelligence Engine (`LocalFoodGuideService` in `backend/app/services/local_food_guide.py`) brings deep regional gastronomic knowledge to travel itineraries. It eliminates generic "Lunch Break" cards and replaces them with authentic regional dishes, verified heritage eateries/darshinis/messes, realistic pricing, and one-click Google Maps navigation.

## 2. Gastronomic Zones & Regional Specialities
Karnataka encompasses 8 distinct culinary regions:

| Culinary Region | Representative Districts | Signature Specialties | Venue Type |
| :--- | :--- | :--- | :--- |
| **Bengaluru Urban & Rural** | Bengaluru, Ramanagara | Crispy Benne Masala Dosa, Bisi Bele Bath, Bidadi Thatte Idli, Filter Coffee | Heritage Darshini, Highway Idli Mane |
| **Old Mysuru** | Mysuru, Mandya | Original Mylari Dosa, Mysore Pak, Shahi Royal Oota, Ragi Mudde with Bassaru | Heritage Tiffin Room, Kaveri Rural Mess |
| **Coastal Karavali** | Udupi, Dakshina Kannada, Uttara Kannada | Neer Dosa, Goli Baje, Kane Rava Fry, Kori Rotti, Kundapura Chicken Curry | Udupi Brahmin Darshini, Coastal Seafood Shack |
| **Kodagu (Coorg)** | Kodagu / Madikeri | Kadambuttu (Rice Dumplings), Pandi Curry, Bamboo Shoot Curry (Bimbale) | Kodava Ainmane Kitchen, Hill Homestay |
| **Malnad** | Shivamogga, Chikkamagaluru, Hassan | Akki Rotti with Yennegai, Halasina Hannina Kadubu, Benne Coffee | Malnad Country Kitchen |
| **North Karnataka** | Dharwad, Belagavi, Vijayapura, Bagalkote | Jolada Rotti Oota, Shenga Chutney Pudi, Dharwad Pedha, Kunda | Lingayat Khanavali |

## 3. Verified Eateries Knowledge Base
Over 30 verified authentic food establishments with real coordinates, opening hours, verified ratings, and Google Maps queries:
- **Vidyarthi Bhavan** (Basavanagudi, Bengaluru) — Benne Masala Dosa, Filter Coffee
- **Mavalli Tiffin Room (MTR)** (Lalbagh, Bengaluru) — Rava Idli, Traditional Lunch
- **Central Tiffin Room (CTR / Shri Sagar)** (Malleswaram, Bengaluru) — Benne Dosa
- **Hotel Vinayaka Mylari** (Nazarbad, Mysuru) — Original Mylari Dosa
- **Guru Sweet Mart** (Sayyaji Rao Road, Mysuru) — Original Mysore Pak
- **Mandya Mess & Ragi Mudde Mane** (VV Road, Mandya) — Mudde & Bassaru
- **Tonnur Lake Country Kitchen** (Kere Thondanur, Mandya) — Kaveri Fish Fry & Country Meals
- **Mitra Samaj** (Car Street, Udupi) — Goli Baje, Masala Dosa
- **Giri Manja's & Machali** (Mangaluru) — Coastal Anjal / Kane Seafood
- **Coorg Cuisine** (Madikeri, Kodagu) — Kadambuttu, Pandi Curry
- **Basaveshwara Khanavali** (Dharwad / Belagavi) — Jolada Rotti Meals

## 4. Dietary Preference Filtering & Budget Alignment
- Strict vegetarian, vegan, and jain safety verification.
- Price tier calibration (`budget`, `standard`, `comfort`) aligning dining costs with the traveler's financial limit.
- Direct integration into `DeterministicScheduler` where meal stops contain verified eatery name, location summary, and maps links.

