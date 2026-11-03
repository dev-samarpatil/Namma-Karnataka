# Karnataka Cultural Events & Festival Calendar

## 1. Overview
The Karnataka Events & Festival Calendar Engine (`KarnatakaEventsCalendarService` in `backend/app/services/karnataka_events.py`) provides date-aware celebration discovery. It discovers regional cultural festivals, heritage jathres, folk arts, and seasonal blooms coinciding with a traveler's trip dates.

## 2. Event Categories & Canonical Registry
1. **Major State Festivals**:
   - **Mysuru Dasara (Nada Habba)**: Oct 11 – Oct 20. Jumboo Savari, illuminated Amba Vilas Palace, classical music concerts.
   - **Bengaluru Karaga Shaktyotsava**: Apr 18 – Apr 22. 800-year-old nocturnal procession honoring Draupadi.
   - **Karnataka Rajyotsava**: Nov 01 – Nov 03. State formation day celebrations and cultural parades.
2. **Regional Jathres & Folk Traditions**:
   - **Dakshina Kannada Kambala (Mud Buffalo Races)**: Dec 01 – Mar 31 (Weekends). Traditional coastal agrarian races.
   - **Bhoota Kola Spirit Worship & Yakshagana**: Dec 01 – Apr 30 (Nights). Sacred ritual theater across coastal Daivasthanas.
   - **Kadalekai Parishe (Basavanagudi Groundnut Fair)**: Nov 23 – Nov 26. Historic street fair at Bull Temple.
   - **Kailpodh Festival of Weapons & Harvest (Kodagu)**: Sep 02 – Sep 04. Traditional martial feast and sports.
   - **Melukote Vairamudi Brahmotsava (Mandya)**: Mar 28 – Apr 01. Midnight procession with sacred diamond crown.
3. **Heritage Arts & Dance Festivals**:
   - **Hampi Utsav**: Nov 05 – Nov 08. Sound and light shows across Vijayanagara ruins.
   - **Pattadakal Dance Festival**: Jan 15 – Jan 18. Classical dances against 8th-century Chalukyan temple backdrops.
4. **Seasonal Nature Celebrations**:
   - **Lalbagh Botanical Flower Show**: Aug 08 – Aug 17 & Jan 18 – Jan 26. Grand glass house floral themes.
   - **Western Ghats Monsoon Jog Falls**: Jul 15 – Sep 15. Peak water discharge spectacles in Shivamogga.

## 3. Date-Aware Coincidence Matching
- Matches trip duration (`start_date` to `start_date + duration_days`) with verified festival annual windows.
- Triangulates proximity between destination stops and festival venues (within 60–80 km radius).
- Rejects non-coinciding events (e.g. June trips never return October Dasara).
- Preserves accurate ticket pricing (`free` entry or verified minimum cost).
- Surfaced in frontend as **"Happening During Your Trip"** with high-resolution photographs, venues, dates, and advisory notes.

