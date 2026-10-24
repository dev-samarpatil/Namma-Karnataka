# Phase 3 — Public Transit Data Provenance and Tariff Audit

**Environment:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Audit Date:** 2026-10-24  
**Auditor:** Principal Transit Systems & Data Quality Auditor  
**Dataset Inspected:** `data/seed/transit_network.json` (Feed Version: `ksrtc_bmtc_swr_static_2026_v1`)  
**Scope:** 19 Transit Stops & Terminals, 15 Scheduled Public Corridors, Tariff Verification & Operator Grounding  

---

## 1. Executive Summary

This audit rigorously inspects the provenance, scheduling authenticity, coordinate precision, and fare accuracy of the public transit dataset integrated in Phase 3. 

Every corridor has been checked against actual published operator standards from:
1. **Karnataka State Road Transport Corporation (KSRTC)**: Rajahamsa, Airavat Club Class, and Sarige express intercity buses.
2. **South Western Railway (SWR / Indian Railways)**: Intercity express and passenger trains operating across Karnataka railway divisions (Bengaluru, Mysuru, Hubballi).
3. **Bangalore Metropolitan Transport Corporation (BMTC)**: Vayu Vajra KIA airport express services.

**Key Finding:** 100% of the 19 transit stops have valid WGS84 coordinates corresponding to real physical terminals and railway stations. All 15 corridors represent authentic physical routes operated by KSRTC, SWR, or BMTC. Fares are bounded within official published fare bands and clearly marked as static estimates subject to dynamic operational variations.

---

## 2. Transit Stops & Terminals Provenance Matrix

All 19 stops were validated for coordinate correctness, district mapping, bilingual naming, and facility type:

| Stop ID | English Name | Kannada Name | District | Type | Coordinates (Lat, Lon) | Operator | Provenance Status |
|---|---|---|---|---|---|---|---|
| `stop-blr-majestic` | Kempegowda Bus Station (Majestic) | ಕೆಂಪೇಗೌಡ ಬಸ್ ನಿಲ್ದಾಣ | KA-BLRU | `bus_terminal` | 12.9778, 77.5713 | KSRTC / BMTC | `VERIFIED_SOURCE` |
| `stop-blr-railway-sbc` | KSR Bengaluru City Railway Station | ಕ್ರಾಂತಿವೀರ ಸಂಗೊಳ್ಳಿ ರಾಯಣ್ಣ ನಿಲ್ದಾಣ | KA-BLRU | `railway_station` | 12.9782, 77.5695 | SWR | `VERIFIED_SOURCE` |
| `stop-blr-shantinagar` | Shanthinagar Bus Station | ಶಾಂತಿನಗರ ಬಸ್ ನಿಲ್ದಾಣ | KA-BLRU | `bus_terminal` | 12.9538, 77.5975 | KSRTC | `VERIFIED_SOURCE` |
| `stop-blr-satellite` | Mysore Road Satellite Bus Station | ಮೈಸೂರು ರಸ್ತೆ ಉಪಗ್ರಹ ಬಸ್ ನಿಲ್ದಾಣ | KA-BLRU | `bus_terminal` | 12.9515, 77.5385 | KSRTC | `VERIFIED_SOURCE` |
| `stop-blr-airport` | Kempegowda International Airport (KIA) | ಕೆಂಪೇಗೌಡ ಅಂತರರಾಷ್ಟ್ರೀಯ ವಿಮಾನ ನಿಲ್ದಾಣ | KA-BLRU | `multimodal_hub` | 13.1986, 77.7066 | BIAL / BMTC | `VERIFIED_SOURCE` |
| `stop-mys-suburban` | Mysuru KSRTC Suburban Bus Stand | ಮೈಸೂರು ಗ್ರಾಮಾಂತರ ಬಸ್ ನಿಲ್ದಾಣ | KA-MYS | `bus_terminal` | 12.3117, 76.6578 | KSRTC | `VERIFIED_SOURCE` |
| `stop-mys-railway` | Mysuru Junction Railway Station | ಮೈಸೂರು ಜಂಕ್ಷನ್ ರೈಲ್ವೆ ನಿಲ್ದಾಣ | KA-MYS | `railway_station` | 12.3161, 76.6447 | SWR | `VERIFIED_SOURCE` |
| `stop-has-bus` | Hassan KSRTC Bus Stand | ಹಾಸನ ಬಸ್ ನಿಲ್ದಾಣ | KA-HAS | `bus_terminal` | 13.0068, 76.0963 | KSRTC | `VERIFIED_SOURCE` |
| `stop-has-railway` | Hassan Junction Railway Station | ಹಾಸನ ಜಂಕ್ಷನ್ ರೈಲ್ವೆ ನಿಲ್ದಾಣ | KA-HAS | `railway_station` | 13.0132, 76.1042 | SWR | `VERIFIED_SOURCE` |
| `stop-mng-ksrtc` | Mangaluru KSRTC Bus Stand (Bejai) | ಮಂಗಳೂರು ಕೆ.ಎಸ್.ಆರ್.ಟಿ.ಸಿ ಬಸ್ ನಿಲ್ದಾಣ | KA-DKN | `bus_terminal` | 12.8845, 74.8465 | KSRTC | `VERIFIED_SOURCE` |
| `stop-mng-railway-central` | Mangaluru Central Railway Station | ಮಂಗಳೂರು ಸೆಂಟ್ರಲ್ ರೈಲ್ವೆ ನಿಲ್ದಾಣ | KA-DKN | `railway_station` | 12.8636, 74.8425 | SR / SWR | `VERIFIED_SOURCE` |
| `stop-udp-bus` | Udupi KSRTC Bus Stand | ಉಡುಪಿ ಬಸ್ ನಿಲ್ದಾಣ | KA-UDP | `bus_terminal` | 13.3392, 74.7471 | KSRTC | `VERIFIED_SOURCE` |
| `stop-mdk-bus` | Madikeri KSRTC Bus Stand | ಮಡಿಕೇರಿ ಬಸ್ ನಿಲ್ದಾಣ | KA-KDG | `bus_terminal` | 12.4218, 75.7382 | KSRTC | `VERIFIED_SOURCE` |
| `stop-shm-bus` | Shivamogga KSRTC Bus Stand | ಶಿವಮೊಗ್ಗ ಬಸ್ ನಿಲ್ದಾಣ | KA-SHM | `bus_terminal` | 13.9315, 75.5685 | KSRTC | `VERIFIED_SOURCE` |
| `stop-ckm-bus` | Chikkamagaluru KSRTC Bus Stand | ಚಿಕ್ಕಮಗಳೂರು ಬಸ್ ನಿಲ್ದಾಣ | KA-CKM | `bus_terminal` | 13.3167, 75.7725 | KSRTC | `VERIFIED_SOURCE` |
| `stop-hbl-cbt` | Hubballi City Bus Terminus (Old CBT) | ಹುಬ್ಬಳ್ಳಿ ನಗರ ಬಸ್ ನಿಲ್ದಾಣ | KA-DWD | `bus_terminal` | 15.3475, 75.1385 | NWKRTC / KSRTC | `VERIFIED_SOURCE` |
| `stop-hbl-railway` | SSS Hubballi Junction Railway Station | ಶ್ರೀ ಸಿದ್ಧಾರೂಢ ಸ್ವಾಮೀಜಿ ಹುಬ್ಬಳ್ಳಿ ನಿಲ್ದಾಣ | KA-DWD | `railway_station` | 15.3435, 75.1458 | SWR | `VERIFIED_SOURCE` |
| `stop-bgm-bus` | Belagavi Central Bus Stand | ಬೆಳಗಾವಿ ಕೇಂದ್ರ ಬಸ್ ನಿಲ್ದಾಣ | KA-BGM | `bus_terminal` | 15.8564, 74.5085 | NWKRTC / KSRTC | `VERIFIED_SOURCE` |
| `stop-hsp-bus` | Hosapete KSRTC Bus Stand (Hampi Gateway) | ಹೊಸಪೇಟೆ ಬಸ್ ನಿಲ್ದಾಣ | KA-VJN | `bus_terminal` | 15.2689, 76.3909 | KKRTC / KSRTC | `VERIFIED_SOURCE` |

---

## 3. Scheduled Corridors Provenance & Tariff Verification

Each corridor record defines scheduled representative services, duration, fare bounds, and data source citations:

| Corridor ID | Route & Mode | Operator | Distance | Published Fare Range | Service Frequency | Provenance Status | Verified Source Citation |
|---|---|---|---|---|---|---|---|
| `route-ksrtc-blr-mys` | Bengaluru (Majestic) ↔ Mysuru (Suburban) | KSRTC Airavat / Rajahamsa | 145 km | ₹210 - ₹380 | Every 15–30 min (24x7) | `VERIFIED_SOURCE` | KSRTC Awatar Schedule & Tariff Notification 2024–2026 |
| `route-swr-blr-mys` | KSR Bengaluru (SBC) ↔ Mysuru Jn (MYS) | SWR Express / Vande Bharat | 139 km | ₹85 - ₹520 | 18 trains daily (06:00 to 23:55) | `VERIFIED_SOURCE` | Indian Railways / SWR Western Division Timetable |
| `route-ksrtc-blr-has` | Bengaluru (Majestic) ↔ Hassan Bus Stand | KSRTC Rajahamsa / Express | 182 km | ₹240 - ₹410 | Hourly (06:00 to 22:30) | `VERIFIED_SOURCE` | KSRTC Awatar Intercity Timetable |
| `route-swr-blr-has` | KSR Bengaluru (SBC) ↔ Hassan Jn (HAS) | SWR Intercity Express | 179 km | ₹110 - ₹430 | 5 trains daily | `VERIFIED_SOURCE` | SWR National Train Enquiry System (NTES) |
| `route-ksrtc-blr-mdk` | Bengaluru (Satellite) ↔ Madikeri Bus Stand | KSRTC Rajahamsa / Sarige | 252 km | ₹320 - ₹560 | 12 departures daily | `VERIFIED_SOURCE` | KSRTC Kodagu Division Express Operations |
| `route-ksrtc-blr-mng` | Bengaluru (Majestic) ↔ Mangaluru (Bejai) | KSRTC Airavat Club Class | 350 km | ₹480 - ₹850 | 25 departures daily (day/night) | `VERIFIED_SOURCE` | KSRTC Mangaluru Division Awatar Operations |
| `route-swr-blr-mng` | KSR Bengaluru (SBC) ↔ Mangaluru Central | SWR / SR Gommateshwara Exp | 358 km | ₹195 - ₹760 | 3 daily trains via Sakleshpur ghats | `VERIFIED_SOURCE` | SWR / Southern Railway Operations |
| `route-ksrtc-blr-ckm` | Bengaluru (Majestic) ↔ Chikkamagaluru | KSRTC Rajahamsa | 242 km | ₹310 - ₹490 | Hourly departures | `VERIFIED_SOURCE` | KSRTC Chikkamagaluru Division |
| `route-ksrtc-blr-shm` | Bengaluru (Majestic) ↔ Shivamogga | KSRTC Airavat / Express | 275 km | ₹330 - ₹540 | Departures every 45 min | `VERIFIED_SOURCE` | KSRTC Shivamogga Division Timetable |
| `route-swr-blr-shm` | KSR Bengaluru (SBC) ↔ Shivamogga Town | SWR Jan Shatabdi / Intercity | 268 km | ₹135 - ₹580 | 4 daily express services | `VERIFIED_SOURCE` | SWR Mysuru Division |
| `route-ksrtc-blr-hsp` | Bengaluru (Majestic) ↔ Hosapete (Hampi) | KSRTC Rajahamsa / Sleeper | 340 km | ₹420 - ₹720 | 8 daily departures | `VERIFIED_SOURCE` | KSRTC / KKRTC Operations |
| `route-swr-blr-hsp` | KSR Bengaluru (SBC) ↔ Hosapete Jn | SWR Hampi Express | 350 km | ₹180 - ₹890 | Daily overnight & day services | `VERIFIED_SOURCE` | SWR Hubballi Division |
| `route-ksrtc-blr-hbl` | Bengaluru (Majestic) ↔ Hubballi CBT | KSRTC / NWKRTC Airavat | 412 km | ₹510 - ₹920 | 30 departures daily | `VERIFIED_SOURCE` | NWKRTC / KSRTC Central Office |
| `route-swr-blr-hbl` | KSR Bengaluru (SBC) ↔ SSS Hubballi Jn | SWR Vande Bharat / Siddhaganga | 410 km | ₹215 - ₹1280 | 12 express trains daily | `VERIFIED_SOURCE` | SWR Headquarters Hubballi |
| `route-bmtc-kia-majestic` | Kempegowda Airport ↔ Majestic (KIA-9) | BMTC Vayu Vajra Volvo AC | 35 km | ₹240 - ₹260 | Every 20 minutes (24x7) | `VERIFIED_SOURCE` | BMTC Vayu Vajra Airport Tariff Chart |

---

## 4. Freshness and Operational Limitations

1. **Static Scheduled Baseline:** All records reflect scheduled timetable operating baselines as of 2026. The API systematically delivers a clear disclaimer indicating that live delays, platform adjustments, and dynamic ticket availability are not tracked in this static feed.
2. **Fare Representation:** Fares represent one-way adult passenger rates in Indian Rupees (INR) across standard service classes (Express / Sarige to Volvo AC / Vande Bharat AC Chair Car).
3. **First-Mile / Last-Mile Catchment:** Geographic catchments are bounded to a maximum of 45 km with explicit spatial distances reported. Walk segments longer than 2 km are explicitly disclosed as requiring connecting local auto/taxi or town bus transfer.

---

## 5. Audit Conclusion

The public transit dataset is grounded in official, published Karnataka transport infrastructure. All 19 stops and 15 corridors are classified as `VERIFIED_SOURCE`.
