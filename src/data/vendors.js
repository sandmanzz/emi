// Seed vendors. ids 6-14 are referenced by the production seed (data/productionSeed.js) and
// 5-6 + 15-19 by the rental seed (data/eventLoanSeed.js) — keep the ids stable.
// ids 1-4 were Item Loan *borrowers* (people we lent our items to). That module was removed
// on 2026-10-16 (a loan in EMI always means WE rent), so those 4 are gone; see vendorStore.
// Fields: { id, name, origin: 'Internal' | 'External', kinds, description, phone, address }
//   kinds — which CMS lists the vendor: 'production' (Master Data → Vendor) and/or
//           'loan' (Master Data → Loan, vendors we borrow/rent items from).
export const initialVendors = [
  { id: 5,  name: 'Wedding Organizer Mitra', origin: 'External', kinds: ['loan'], phone: '0819-4567-8901', address: 'Jl. Kemang Raya No. 7, South Jakarta',
    description: 'Partner wedding organizer. Rents out tableware, charger plates and décor to us.' },
  { id: 6,  name: 'Toko Dekorasi Rina',      origin: 'External', kinds: ['production', 'loan'], phone: '0821-9988-7766', address: 'Pasar Kumbasari Blok B-12, Denpasar, Bali',
    description: 'Decoration rental shop. Produces small decorative pieces on request.' },
  { id: 7,  name: 'Bengkel Las Maju Jaya',   origin: 'External', kinds: ['production'], phone: '0812-7788-1200', address: 'Jl. Gatot Subroto Barat No. 88, Denpasar, Bali',
    description: 'Iron and steel workshop. Makes flower arches, stands and metal frames.' },
  { id: 8,  name: 'Workshop Kayu Internal',  origin: 'Internal', kinds: ['production'], phone: 'Ext. 221',       address: 'Warehouse Bali 70 – workshop area',
    description: 'Our in-house carpentry team. Builds wooden furniture, panels and display risers.' },
  { id: 9,  name: 'Tim Florist Internal',    origin: 'Internal', kinds: ['production'], phone: 'Ext. 230',       address: 'Warehouse Bali 66 – florist room',
    description: 'In-house florists. Make artificial and fresh flower arrangements and walls.' },
  { id: 10, name: 'CV Kain Nusantara',       origin: 'External', kinds: ['production'], phone: '0822-4455-9000', address: 'Jl. Cigondewah Kaler No. 12, Bandung',
    description: 'Textile supplier and tailor. Sews drapes, table linen and chair sashes.' },
  { id: 11, name: 'Akrilik Prima',           origin: 'External', kinds: ['production'], phone: '0818-6060-3131', address: 'Jl. Mangga Dua Raya Blok C-5, North Jakarta',
    description: 'Acrylic laser-cutting shop. Makes signage, table numbers and acrylic décor.' },
  { id: 12, name: 'Tim Lighting Internal',   origin: 'Internal', kinds: ['production'], phone: 'Ext. 245',       address: 'Warehouse C9 – electrical room',
    description: 'In-house lighting technicians. Assemble light curtains and marquee letters.' },
  { id: 13, name: 'Rattan Craft Cirebon',    origin: 'External', kinds: ['production'], phone: '0813-2020-7878', address: 'Desa Tegalwangi, Weru, Cirebon',
    description: 'Rattan craftsmen. Weave hanging rattan décor and peacock chairs.' },
  { id: 14, name: 'Lilin Aroma Jogja',       origin: 'External', kinds: ['production'], phone: '0274-555-1919',  address: 'Jl. Kaliurang Km 9, Sleman, Yogyakarta',
    description: 'Candle maker. Supplies pillar candles and tealights in bulk.' },
  { id: 15, name: 'Sewa Kursi Jaya Rental',  origin: 'External', kinds: ['loan'], phone: '0812-9000-1515', address: 'Jl. Imam Bonjol No. 301, Denpasar, Bali',
    description: 'Chair and table rental: Tiffany, cross-back, banquet tables. Delivers and picks up.' },
  { id: 16, name: 'Bali Party Rental',       origin: 'External', kinds: ['loan'], phone: '0361-777-262',  address: 'Jl. Bypass Ngurah Rai No. 88, Sanur, Bali',
    description: 'Party equipment rental: lounge sets, cocktail tables, linens and tableware.' },
  { id: 17, name: 'Glassware Pro Rental',    origin: 'External', kinds: ['loan'], phone: '0811-3838-404', address: 'Jl. Kenjeran No. 120, Surabaya',
    description: 'Glassware and champagne tower sets for rent, charged per piece.' },
  { id: 18, name: 'Nusantara Sound & Light', origin: 'External', kinds: ['loan'], phone: '0821-5454-7070', address: 'Jl. Fatmawati No. 15, South Jakarta',
    description: 'Sound system, microphones, moving heads and stage lighting rental with operator.' },
  { id: 19, name: 'Tenda Megah Rental',      origin: 'External', kinds: ['loan'], phone: '0813-1122-3344', address: 'Jl. Soekarno-Hatta No. 9, Malang',
    description: 'Tents, flooring and generator rental for outdoor events.' },
];
