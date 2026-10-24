# Phase 7 Official Tourism and Accommodation Links

**Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)**  
**Version:** Phase 7.0  
**Verification Audit:** `data/validation/audit_official_links.py` (Passed — 0 errors, 0 warnings)

---

## 1. Objectives & Principles of Provenance

Travellers need reliable pathways to book government-operated lodges, heritage hotels, and access official entry information without being deceived by unauthorized intermediaries, fake booking pages, or arbitrary price markups.

Namma Karnataka connects travellers directly to legitimate official tourism organizations, primarily:
1. **Karnataka State Tourism Development Corporation (KSTDC):** Operates the state's flagship *Mayura* chain of hotels and tour packages.
2. **Jungle Lodges & Resorts (JLR):** Pioneer eco-tourism undertaking of the Government of Karnataka operating lodges and wildlife camps across tiger reserves and national parks.
3. **Mysore Palace Board:** Official statutory board overseeing Amba Vilas Palace.
4. **Department of Tourism, Government of Karnataka:** Canonical tourism directory and heritage registry (`karnatakatourism.org`).

---

## 2. Verified Domain Allowlist

| Organization | Canonical Domain | Authority Type |
|---|---|---|
| **Karnataka State Tourism Development Corporation (KSTDC)** | `https://kstdc.co` | State Public Sector Undertaking |
| **Jungle Lodges & Resorts (JLR)** | `https://www.junglelodges.com` | Government of Karnataka Undertaking |
| **Department of Tourism, Karnataka** | `https://karnatakatourism.org` | Official State Tourism Portal |
| **Mysore Palace Board** | `https://www.mysorepalace.gov.in` | Statutory Heritage Board |
| **Archaeological Survey of India (ASI)** | `https://asi.nic.in` | Central Heritage Custodian |

---

## 3. Curated Property & Destination Associations

| Property ID | Property Name | District | Nearby Destination | Verified Booking / Website URL |
|---|---|---|---|---|
| `kstdc-mayura-hoysala-mysuru` | KSTDC Hotel Mayura Hoysala | KA-MYS | Mysuru Palace | `https://kstdc.co/hotels/hotel-mayura-hoysala-mysuru/` |
| `kstdc-mayura-bhuvaneshwari-hampi` | KSTDC Hotel Mayura Bhuvaneshwari | KA-VJN | Virupaksha Temple Hampi | `https://kstdc.co/hotels/hotel-mayura-bhuvaneshwari-kamalapur/` |
| `kstdc-mayura-valley-view-madikeri` | KSTDC Hotel Mayura Valley View | KA-KOD | Raja's Seat Madikeri | `https://kstdc.co/hotels/hotel-mayura-valley-view-madikeri/` |
| `the-serai-chikkamagaluru` | The Serai Chikmagalur | KA-CKM | Mullayanagiri Peak | `https://www.theserai.in/chikmagalur-resort/` |
| `kstdc-mayura-gerusoppa-jogfalls` | KSTDC Hotel Mayura Gerusoppa | KA-SHI | Jog Falls | `https://kstdc.co/hotels/hotel-mayura-gerusoppa-jogfalls/` |
| `kstdc-mayura-samudra-gokarna` | KSTDC Hotel Mayura Samudra | KA-UKN | Om Beach Gokarna | `https://kstdc.co/hotels/hotel-mayura-samudra-gokarna/` |
| `kstdc-mayura-velapuri-belur` | KSTDC Hotel Mayura Velapuri | KA-HAS | Chennakeshava Temple Belur | `https://kstdc.co/hotels/hotel-mayura-velapuri-belur/` |
| `kstdc-mayura-chalukya-badami` | KSTDC Hotel Mayura Chalukya | KA-BAG | Badami Cave Temples | `https://kstdc.co/hotels/hotel-mayura-chalukya-badami/` |
| `kstdc-mayura-adil-shahi-vijayapura` | KSTDC Hotel Mayura Adil Shahi | KA-VIJ | Gol Gumbaz Vijayapura | `https://kstdc.co/hotels/hotel-mayura-adil-shahi-bijapur/` |
| `bandipur-safari-lodge-jlr` | Bandipur Safari Lodge (JLR) | KA-CHA | Bandipur National Park | `https://www.junglelodges.com/resort/bandipur-safari-lodge/` |

---

## 4. UI Presentation & Security Safeguards

1. **Clear Distinctions:**
   - **Official Government Hotel:** Distinct green/blue government crest indicator.
   - **Curated Private Lodging:** Indicated as verified private property, never misrepresented as KSTDC/JLR.
2. **Security Headers on Outbound Links:**
   - Always rendered with `target="_blank" rel="noopener noreferrer"`.
   - Prevents tab-napping and isolates referrer context.
3. **Explicit Disclaimer:**
   - Namma Karnataka is an independent discovery and trip-planning guide.
   - We do not process transactions, charge convenience fees, or claim live inventory guarantees.
   - Booking, cancellations, and tariff rules remain subject to the respective official operator.

---
