const { Client } = require('pg');

// Raw text copied from the provided BOQ PDF (plain text)
const RAW_TEXT = `BILLS OF QUANTITIES
CONTENTS
BILLS OF QUANTITIES
CLIENT:
CONTRACTOR:
MECHANICAL SERVICES LANDSCAPING INTERIOR DESIGN
EMAIL: layonscoltd@gmail.com
TEL: 0720717463
August 1, 2025
LAYONS CONSTRUCTION LIMITED
ARCHITECTURE PROJECT MANAGEMENT ENGINEERING
PROPOSED DEVELOPMENT_HOUSE RENOVATION WORKS
MR. SOSPETER
P.O BOX ….. ………
…………………………
Bills of Quantities
ITEM DESCRIPTION AMOUNT (KSHS) 
SECTION NO. 1: PRELIMINARIES
A
Form of Contract
B
Existing Services -
C
Protective Clothing 5,000.00
D
Water and electricity for works 40,000.00
E
Concrete tests
F
Plant, tools and scaffolding 35,000.00
G
Signboard 35,000.00
H
Cleaning 10,000.00
TOTAL 125,000.00
Page 2
ITEM DESCRIPTION QTY UNIT RATE AMOUNT 
(Kshs) 
BILL NO. 01: DEMOLITIONS
Wall and Floor Tiles
A
Carefully hack 8mm ceramic tiles and wall tiles 
including plaster, make good disturbed surfaces to 
receive new screed and cart away debris.
Item 58,200.00
B
Carefully hack 8mm or remove 10mm thick ceramic 
tiles and including 32mm thick screed; make good 
disturbed surfaces to receive new screed and tiles, cart 
away debris.
Item 54,000.00
Doors
C
Carefully remove doors and frames in way of installing 
new, store as directed by client. Item 10,000.00
Windows
D
Carefully remove casement windows in way of installing 
new, store as directed by client. Item 13,000.00
Ceiling
E
Carefully remove existing ceiling in way of installing new 
and cart away resultant debris as directed by client. Item 27,000.00
Kitchens
F
Remove kitchens in way of installing new and cart 
away resulstant debris. Item 10,000.00
Walls
E
Carefully demolish existing internal wall and set aside 
any doors for client's direction {Approx. 42SM} Item 14,500.00
Roofing
G
Carefully remove main house roofing and timber 
members as directed, set aside any salvage and cart 
away debris and make good surfaces. ITEM 35,000.00
Other Demolitions works 
H
Allow a sum for any other demolition works and making 
good sufaces. ITEM 25,000.00
Total Carried to Summary 246,700.00
Page 3
Bills of Quantities
ITEM DESCRIPTION QTY UNIT RATE AMOUNT 
(Kshs) 
BILL NO. 02 : EXTENSION WORKS
EXCAVATION
A
Remove 200mm thick vegetable top soil 
commencing from existing ground but not 
exceeding 1500mm deep.
12 Sm 200 2,400.00
B Excavate pits to receive column bases abd 13 Cm 600 7,800.00
C Tenches 7 Cm 600 4,200.00
Filling and Carting away
D Load and cart away from site. 9 Cm 360 3,240.00
E Return, fill and ram with selected and approved 
excavated material around excavations 11 Cm 150 1,650.00
HARDCORE
F
300mm thick selected hardcore filling of approved 
inert material in making up levels under floors: 
spread, leveled, well rammed and consolidated in 
150 mm thick (maximum) layers
12 Sm 425 5,100.00
ANTI-TERMITE TREATMENT
G
Termidor 25 EC or other equal approved anti-termite 
chemical treatment: applied by an approved 
professional pest control specialist: 10 year warranty: 
strictly applied in accordance with the 
manufacturer's instructions
12 Sm 200 2,400.00
BLINDING
H
50 mm thick approved quality murram or quarry dust 
blinding to surfaces of hardcore to receive damp 
proof membrane
12 Sm 100 1,200.00
DPM
I
1000 Gauge polythene black sheet or other equal 
and approved polythene sheeting as damp proof 
membrane laid on blinded hardcore
12 Sm 200 2,400.00
CONCRETE WORKS
Insitu reinforced concrete class 25/20: in
H Strip footing 1 Cm 14,000 14,000.00
Page 4
Bills of Quantities
Total Carried to Collection 44,390.00
ITEM DESCRIPTION QTY UNIT RATE AMOUNT 
(Kshs) 
A Base columns 3 Cm 14,000 42,000.00
B Columns 1 Cm 14,000 14,000.00
C 150mm Thick floor bed 12 Sm 2,100 25,200.00
High yield square twisted steel bar reinforcement to 
BS 4461 and KS 02-22:1976 (Provisional)
D Assorted reinforcement bars 480 Kg 170 81,600.00
E Mesh reinforcement No. A142 weighing 2.22 kg per 
square metre: in floor slab: including all necessary 
supports: allow for laps and bonding 12 Sm 495 5,940.00
Formwork
Wrot cypress formwork as described to;
F Column bases 8 Sm 450 3,600.00
G Columns 6 Sm 450 2,700.00
H Edges of bed 8 Lm 150 1,200.00
FOUNDATION WALLING
Natural hard approved quarry stone walling with a 
crushing strength of 8.0 N/mm²; walling bedded and 
jointed in cement and sand (1:4) mortar, reinforced 
with and including 25mm wide x 20 gauge hoop iron 
at every alternate course as described in:
J Foundation walling 10 Sm 1,400 14,000.00
Plinths
K 12mm thick cement and sand (1:3) render to plinths 4 SM 450 1,800.00
L
Prepare and apply three coats bituminous paint to 
rendered plinths 4 SM 400 1,600.00
Page 5
Bills of Quantities
Total Carried to Collection 193,640.00
ITEM DESCRIPTION QTY UNIT RATE AMOUNT 
(Kshs) 
Collection
Brought down from Page 1 44,390.00
Brought down from Page 2 193,640.00
Page 6
Bills of Quantities
Total Carried to Summary 238,030.00
ITEM DESCRIPTION QTY UNIT RATE AMOUNT 
(Kshs) 
BILL NO. 03: REINFORCED CONCRETE SUPERSTRUCTURE
Insitu reinforced concrete class 25/20: in
A Columns 1 Cm 14,000 14,000.00
B Beams 3 Cm 13,500 40,500.00
C Ring beams 3 Cm 13,500 40,500.00
D 150mm Thick suspended slab 40 Sm 2,025 81,000.00
High yield square twisted steel bar reinforcement to 
BS 4461 and KS 02-22:1976 (Provisional)
E Assorted reinforcement bars 1,650 Kg 170 280,500.00
Formwork
Wrot cypress formwork as described to;
F Columns 32 Sm 450 14,400.00
G Beams 38 Sm 450 17,100.00
H Soffits of suspended slab 40 Sm 450 18,000.00
J Edges of suspended slab 29 Lm 150 4,350.00
Page 7
Bills of Quantities
Total Carried to Summary 510,350.00
Page 8
Bills of Quantities
ITEM DESCRIPTION QTY UNIT RATE AMOUNT 
(Kshs) 
BILL NO. 04: WALLING
Masonry Walling
Machine-cut block walling in cement and sand (1:4) 
mortar reinforced with and including 25 x 3mm thick 
hoop iron in every alternate course.
A 200mm thick masonry walling. 81 Sm 1900 153,900.00
Internal Wall Finishes
Plaster: 9 mm first coat of cement/lime putty/sand (1:2:9): 
3 mm second coat of cement/lime putty/sand (1:1:6): 
steel toweled: on masonry or concrete: to
B New masonry and bathroom walls. 354 Sm 550 194,700.00
Ceramic Wall tiles 
C
Supply and fix 250 x 250 x10mm non-slip ceramic floor 
tiles on floor screed and pointed in coloured cement laid 
diagonally.
194 Sm 2000 388,000.00
Prepare surfaces, skim, sand and apply one undercoat 
and two finishing coats silk vinyl paint as CROWN PAINTS 
or other equal and approved as described to;
D All walls. 613 Sm 400 245,200.00
External Wall Finishes
Plaster: 9 mm first coat of cement/lime putty/sand (1:2:9): 
3 mm second coat of cement/lime putty/sand (1:1:6): 
steel toweled: on masonry or concrete: to
E Exterior 1st floor walls. 108 Sm 550 59,400.00
F Key Pointing. 112 Sm 220 24,640.00
Exterior Quality Paint
Prepare surfaces, skim, sand and apply one undercoat 
and two coats weather resistant and exterior quality 
paint as CROWN PAINTS or other equal and approved as 
described to; 
H Both new and existing walls, permaplast. 132 Sm 1200 158,400.00
J Allow for backyard porch CNC securing. 1 Item 30000 30,000.00
Total Carried to Summary 1,254,240.00
Page 9
Bills of Quantities
ITEM DESCRIPTION QTY UNIT RATE AMOUNT 
(Kshs) 
BILL NO. 05: DOORS
TIMBER DOORS
Main Doors
A Steel Main doors; 1200 x 2400 mm high. 2 No 72000 144,000.00
Wooden Doors
45 mm thick solid core flush doors: hardwood 
lipped all round: mahogany faced both sides:
B Door size 1000 x 2400mm high 6 No 35000 210,000.00
C Ditto semi-solid size 800 x 2100mm high 4 No 8500 34,000.00
Wrot cypress: prime grade
D 250 x 50mm door frame with three labours 62 Lm 5,500 341,000.00 
E 40 x 15 mm Architrave: plugged 62 Lm 200 12,400.00 
F 30 x 30 mm Quadrant: plugged 62 Lm 175 10,850.00 
Ironmongery
Supply and fix English "Union" or other equal 
approved ironmongery: matching screws: locks to 
include a set of 3 keys: catalogue numbers refer to 
"Union catalogue issued by "Assa Abloy (E.A.) 
Limited" or other equal and appoved.
G 3 lever mortice lock complete with aluminium 
handles and set lever furniture 6 No 5,500 33,000.00 
H 2-Lever mortice door lock complete with aluminium 
handles and set lever furniture 4 No 3,500 14,000.00 
J 38 mm Diameter rubber door stop: cat. no. 8400 
10 No 250 2,500.00 
K 100 x 75mm Heavy duty stainless steel hinges 15 Prs 300 4,500.00 
Total Carried to Collection 806,250.00
Page 10
Bills of Quantities
ITEM DESCRIPTION QTY UNIT RATE AMOUNT 
(Kshs) 
Prepare and apply one coat aluminium hardwood 
primer as 'Crown Paints' or other equal and 
approved: on timber surfaces into contact with 
masonry or concrete: to
A General timber surfaces 100 - 200mm girth 62 Lm 80 4,960.00 
Prepare surfaces and apply three coats first grade 
clear polyurethane varnish as "Crown Paints" or 
other equal approved: on wood surfaces: to
B General timber surfaces 0 - 100mm girth 124 Lm 80 9,920.00 
C General timber surfaces 100 - 200mm girth 124 Lm 100 12,400.00 
D General timber surfaces 92 Sm 300 27,600.00 
Glazing
E 8mm Thick clear sheet glass and glazing to timber in 
panes 0.1-0.5 sm (beads m/s) 15 Sm 2,000 30,000.00
Total Carried to Collection 84,880.00
Collection
Total Brought Forward from Page 1 806,250.00
Total Brought Forward from Page 2 84,880.00
Total Carried to Summary 891,130.00
Page 11
Bills of Quantities
ITEM DESCRIPTION QTY UNIT RATE AMOUNT 
(Kshs) 
BILL NO. 06: WINDOWS
Supply and fix the following purpose made mild 
steel casement windows 50 x 50 x 3mm framing and 
approved "I" sections, complete with handles, peg 
stays and other ironmongery; fixing lugs to concrete 
or masonry jambs, bedding in cement and sand 
(1:3) mortar, pointing all around frames in mastic; 
easing, oiling and adjusting opening lights on 
completion all to Architect's approval
A Window size 2000 x 5000mm high 1 No 85000 85,000.00
B Window size 1800 x 1800mm high 8 No 27540 220,320.00
C Ditto size 750 x 750mm high 4 No 4780 19,120.00
Glazing
D
6mm Thick clear sheet glass and glazing to timber in 
panes 0.1-0.5 sm (beads m/s) 36 Sm 2,100 75,600.00
E Ditto but obscured glazing 2 Sm 2,400 4,800.00
Prepare surfaces and apply three coats gloss oil 
paint as "Crown Paints" or other equal approved: on 
steel surfaces: to
F General steel windows surfaces 76 SM 2400 182,400.00
Approved pre-cast concrete cill: bedded and 
jointed in cement (sand (1:3) mortar: pointed in 
matching coloured cement
G 300 x 75 mm Thick moulding to approval including 
formwork and all necessary reinfocements.
20 Lm 550 11,000.00 
Total Carried to Summary 598,240.00
Page 12
Bills of Quantities
ITEM DESCRIPTION QTY UNIT RATE AMOUNT 
(Kshs) 
BILL NO. 07: FLOOR FINISHES
Floor finishes
Cement and sand (1:4) screed: to concrete 
surfaces: in 
A 32 mm thick finished to receive ceramic tiles floor 
finish
240 Sm 480 115,200.00 
600 x 600 x 8 mm Approved first quality Porcelain 
tiles as 'Saj Ceramics' or other equal approved: to 
regular pattern: colour to architect's scheme: allow 
a rate of Kshs. 3000 per square metre for purchase: 
add for wastage, transport and fixing on site: allow 
for bedding and jointing in cement mortar (1:4): 
grouting joints with matching cement: All to the 
B Floor: fixing with approved quality adhesive 240 Sm 2,400 576,000.00 
C Skirting 112 Lm 240 26,880.00 
Total Carried to Summary 718,080.00
Page 13
Bills of Quantities
ITEM DESCRIPTION QTY UNIT RATE AMOUNT 
(Kshs) 
BILL NO. 08: CEILING FINISHES
Gypsum Ceilings
12mm thick suspended gypsum ceiling: taped and 
filled joints: with and including skimming and Teflon 
paint to approval; on and including pressed metal 
suspended brandering system fixed to soffits of 
suspended slab: allow for cutting and trimming to 
light fittings, AC unit or other equipments as required 
(all quantities measured flat overall over light 
fittings): with and including inspection trap doors 
where directed:
A Ceilings - Dining, Living room and 1st floor. 170 Sm 2,800 476,000.00 
B Cornice 112 Lm 475 53,200.00 
Ceiling finishes
C
Prepare and apply paint to ceiling - Gypsum and 
plastered ceiling. 268 Sm 400 107,200.00 
D Prepare and apply paint to cornice 112 Lm 120 13,440.00 
Total Carried to Summary 649,840.00
Page 14
Bills of Quantities
ITEM DESCRIPTION QTY UNIT RATE AMOUNT 
(Kshs) 
BILL NO. 09: STAIRCASE FINISHES
Staircase Balustrading
A 900mm high overall mild steel balustrading; 
comprising of 50 x 1.5 mm CHS moulded handrail: 
25 x 25mm m/s RHS footrail: 900mm high 40 x 40mm 
m/s balusters at 1000mm c/c, one end of balusters 
grouted to concrete floor complete with square ms 
cover rosette and other end welded to handrail: 
20mm dia. m/s member at 120mm c/c: all as per 
Architect's detail 12 Lm 7,500 90,000.00
Prepare surfaces and apply three coats gloss oil 
paint as "Crown Paints" or other equal approved: 
on steel surfaces: to
B General surfaces of steel balustrading - Measured 
both sides 11 Sm 400 4,320.00 
Total Carried to Summary 94,320.00
Page 15
ITEM DESCRIPTION QTY UNIT RATE AMOUNT 
(Kshs) 
BILL NO. 10: ROOF AND RAIN WATER GOODS.
ALL PROVISIONAL.
Construction
All timber be sawn cypress GS grade, seasoned to 
less than 20% moisture content and treated with 
approved preservative
The following to 20 No types of trusses of varying 
spans and heights 70 in No spaced at 1200 centres 
and hoisted over 7000mm above ground, all as per 
the Structural Eng. Drws (Assumed re-use of existing)
A 100x50mm Trusses and Rafters and ceiling joist. 300 LM 550 165,000.00
B
150x50mm Trusses and Rafters, ceiling joist and 
Ridge Board 519 LM 575 298,137.50
C 75 x 50 mm Purlins 625 LM 500 312,500.00
Roof Covering.
Decra roofing tiles as per "Space and Style"or other 
equal and approved manufacturer and to the 
approved coluor and guage.
D
Roofing tiles fixed to and including 50x50mm timber 
batterns at 300mm centres fixed to roof trusses (MS) 
in accordance with the manufacturer's instructions 
(measured net - no allowance made for laps). 264 SM 3200 844,800.00
Accessories.
E 150mm Diameter half round ridge and hip tile. 48 LM 750 36,000.00
F 350mm Diameter on vallies 52 LM 750 39,000.00
G Ditto flashings 128 LM 350 44,800.00
Total Carried Forward 1,740,237.50
Page 16
ITEM DESCRIPTION QTY UNIT RATE AMOUNT 
(Kshs) 
Brought Forward 1,740,237.50
Rain water goods
The following in uPVC heavy duty material
A
200x200 mm Box profile Rain water gutter with and 
including 150 mm x 4 mm thick mild steel brackets 
at 1000mm cc. 49 LM 1450 71,050.00
B Extra over gutter for closed end 4 No 550 2,200.00
C Ditto outlet nozzle for 100mm diameter pipe 4 No 550 2,200.00
D Ditto, for bend 700mm long 4 No 550 2,200.00
E 100 mm Diameter down pipe fixed to wall with and 
and including holder bats 48 LM 1100 52,800.00
F Extra over pipe for 700 mm long swan neck projection 4 No 250 1,000.00
G Ditto for 300mm long rainwater shoe 4 No 250 1,000.00
Eaves and verges finishes
H 25mm Thick wrot cypress prime grade toungue and
groove boarding 44 SM 3100 136,400.00
Prime grade wrot cypress
J 225 mm x 25 mm Fascia and barge board 52 LM 575 29,900.00
Painting
Knot, prime, stop, prepare and apply three coats
polyurethane clear varnish to:-
K General timber suraces 52 SM 120 6,240.00
Total Carried to Summary 2,045,227.50
Page 17
ITEM DESCRIPTION QTY UNIT RATE AMOUNT 
(Kshs) 
BILL NO. 11: JOINERY FITTINGS
Low Level Kitchen Cabinets
A
Supply and fix low level kitchen cabinets overall size 
5500 x 600 x 900mm high comprising 20mm thick 
MDF board as PG or any other equal and approved 
in 1 No. Shelf; 7 No. cabinet doors average size 550 x 
800mm high and 2No drawers sets comprising 3 
drawers each 550mm wide x 150mm high; complete 
with iron mongery for doors and drawers and 
100mm high hardwood skirting; All to Architect's 
detail and approval.
1 No 247500 247,500.00
B Ditto 2000 x 1200 island 1 No 90000 90,000.00
High Level Kitchen Cabinets
C
Supply and fix high level kitchen cabinets overall size 
3000 x 500 x 700mm high comprising 20mm thick 
MDF laminated Particle board as PG or any other 
equal and approved in 1 No. Shelf; 7 No. cabinet 
doors average size 500 x 600mm high; complete 
with iron mongery for doors; All to Architect's detail 
and approval (7500 x 500 x 700mm high
1 No 45000 45,000.00
Wardrobes
D
Wardrobe unit overall size 2000 x 600 x 2200mm high 
in 20mm thick laminated laminated Particle board 
as PG or any other equal and approved and PVC 
lipping; comprising of 1 No. high level storage 
overall size 4350 x 550 x 1150mm high; 3 No. drawers 
each of size 900 x 250mm high; 1 No. shoe rack 
overall size 4350 x 550 x 300mm high; 6 No. doors 
average size 700 x 2200mm high; 50 x 50mm 
rebated h.w. frame with 50 x 25mm moulded h.w. 
architrave; 100 x 25mm h.w. skirting; 4350mm long 
20mm dia. chrome hanging rail; complete with iron 
mongery; All to architect's detail and approval - 
New Bedroom 1 and 2
1 No 60000 60,000.00
Total Carried Forward 442,500.00
Page 18
ITEM DESCRIPTION QTY UNIT RATE AMOUNT 
(Kshs) 
Brought Forward 442,500.00
20mm thick Approved first quality Granite top with 
rounded edge: allow a rate of Kshs. 12,000 per 
square metre for purchase: add for wastage, 
transport and fixing on site: allow for bedding and 
jointing in cement mortar (1:4): grouting joints with 
matching cement
A Worktop 4 Sm 18000 72,000.00
B
Extra over ditto for making hole size 800 x 450mm for 
double bowl sink 1 No 2500 2,500.00
Total Carried to Summary 517,000.00
Page 19
ITEM DESCRIPTION QTY UNIT RATE AMOUNT 
(Kshs) 
BILL NO. 12: P.C. & PROVISIONAL SUMS
A
ELECTRICAL: Provide the sum of One Hundred and 
Fifty Thousands Shillings Only (Kshs. 150,000.00) to 
cover the cost of Electrical Works fittings.
Item 1 150,000.00 150,000.00
B
PLUMBING & SANITARY WORKS: Provide the sum of 
Three Hundred and Fifty Thousands Shillings Only 
(Kshs. 350,000.00) to cover the cost of Plumbing and 
Drainage Works fitting and fixtures.
Item 1 350,000.00 350,000.00
TOTAL CARRIED TO GENERAL SUMMARY KSHS. 500,000.00
Page 20
ITEM DESCRIPTION PAGE AMOUNT (KSH) 
1 PRELIMINARIES. 125,000.00
2 BILL NO. 01: DEMOLITIONS 246,700.00
3 BILL NO. 02 : EXTENSION WORKS 238,030.00
4
BILL NO. 03: REINFORCED CONCRETE 
SUPERSTRUCTURE 510,350.00
5 BILL NO. 04: WALLING 1,254,240.00
6 BILL NO. 05: DOORS 891,130.00
7 BILL NO. 06: WINDOWS 598,240.00
8 BILL NO. 07: FLOOR FINISHES 718,080.00
9 BILL NO. 08: CEILING FINISHES 649,840.00
10 BILL NO. 09: STAIRCASE FINISHES 94,320.00
11 BILL NO. 10: ROOF AND RAIN WATER GOODS. 2,045,227.50
12 BILL NO. 11: JOINERY FITTINGS 517,000.00
13 BILL NO. 12: P.C. & PROVISIONAL SUMS 500,000.00
GRAND TOTAL 8,388,157.50
 -
PROPOSED RENOVATION WORKS FOR RESIDENTIAL DEVELOPMENT.
GRAND SUMMARY
Page 21
SIGNED:
( CONTRACTOR) 
…………………………………...…………………..…………………………
Date: ……………………………….
Date: …………………
Address: ……… ……………………………….…………………………………………
Tel No: …….. ………...…………………………………………………
SIGNED:
( EMPLOYER ) …………………………………………………………………………….
Address: …………………………………………………..……………………………
Tel No: ……………………………………………………
Page 22`;

function parseNumber(s) {
  if (s == null) return 0;
  const n = Number(String(s).replace(/[,\s]/g, ''));
  return isFinite(n) ? n : 0;
}

function parseBOQText(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const sectionLine = /^(SECTION NO\.|BILL NO\.)/i;
  const letterOnly = /^[A-Z]$/;
  const ignoreStarts = [/^Page\b/i, /^Bills of Quantities$/i, /^ITEM DESCRIPTION/i, /^TOTAL CARRIED/i, /^Total Carried/i, /^Collection$/i, /^Brought /i, /^GRAND /i, /^SIGNED/i, /^CLIENT/i, /^CONTRACTOR/i, /^CONTENTS$/i];

  let currentSection = '';
  let order = 1;
  const items = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (ignoreStarts.some(rx => rx.test(line))) continue;

    if (sectionLine.test(line)) {
      currentSection = line;
      continue;
    }

    if (letterOnly.test(line)) {
      const item_code = line;
      const descParts = [];
      let capturedQty = 0;
      let capturedUnit = '';
      let capturedRate = 0;
      let j = i + 1;

      while (j < lines.length && !letterOnly.test(lines[j]) && !sectionLine.test(lines[j])) {
        const l = lines[j];
        if (ignoreStarts.some(rx => rx.test(l))) { j++; continue; }
        // Pattern 1: 12 Sm 200 2,400.00
        const m1 = l.match(/^(\d+[\d,]*(?:\.\d+)?)\s*(No|SM|Sm|sm|CM|Cm|cm|LM|Lm|lm|KG|Kg|kg|Item|ITEM|Prs)\b\s+(\d+[\d,]*(?:\.\d+)?)\s+(\d+[\d,]*(?:\.\d+)?)/);
        // Pattern 2: Item 58,200.00 or ITEM 25,000.00
        const m2 = !m1 && l.match(/^(Item|ITEM)\b\s+(\d+[\d,]*(?:\.\d+)?)/);
        // Pattern 3: inline amounts like "... Item 10,000.00"
        const m3 = !m1 && !m2 && l.match(/\b(Item|ITEM)\b\s+(\d+[\d,]*(?:\.\d+)?)/);

        if (m1) {
          capturedQty = parseNumber(m1[1]);
          capturedUnit = m1[2];
          capturedRate = parseNumber(m1[3]);
        } else if (m2) {
          capturedQty = 1;
          capturedUnit = 'Item';
          capturedRate = parseNumber(m2[2]);
        } else if (m3) {
          capturedQty = 1;
          capturedUnit = 'Item';
          capturedRate = parseNumber(m3[2]);
        } else {
          descParts.push(l);
        }
        j++;
      }

      const description = descParts.join(' ').replace(/\s+/g, ' ').trim();
      items.push({ section: currentSection || 'General', item_code, description, unit: capturedUnit || null, default_qty: capturedQty || null, default_rate: capturedRate || null, sort_order: order++ });
      i = j - 1;
    }
  }

  return items;
}

(async () => {
  try {
    const connectionString = process.env.DATABASE_URL || process.env.MIGRATE_DATABASE_URL;
    if (!connectionString) {
      console.error('Missing DATABASE_URL');
      process.exit(1);
    }
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();

    // Ensure table exists
    await client.query("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";");
    await client.query("CREATE TABLE IF NOT EXISTS fixed_boq_items (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), company_id UUID REFERENCES companies(id) ON DELETE CASCADE, section TEXT, item_code TEXT, description TEXT NOT NULL, unit TEXT DEFAULT 'Item', default_qty NUMERIC, default_rate NUMERIC, sort_order INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW());");
    await client.query("CREATE INDEX IF NOT EXISTS idx_fixed_boq_items_company ON fixed_boq_items(company_id);");

    // Pick company (Layons Construction Ltd if present; else first)
    const { rows: companies } = await client.query("SELECT id, name FROM companies ORDER BY created_at ASC LIMIT 1");
    if (!companies.length) {
      console.error('No companies found; seed company first.');
      process.exit(1);
    }
    const companyId = companies[0].id;

    const parsed = parseBOQText(RAW_TEXT);
    if (!parsed.length) {
      console.error('Parsed 0 items; aborting.');
      process.exit(1);
    }

    await client.query('BEGIN');
    // Clear existing for this company to avoid duplicates
    await client.query('DELETE FROM fixed_boq_items WHERE company_id = $1', [companyId]);

    const insertText = `INSERT INTO fixed_boq_items (company_id, section, item_code, description, unit, default_qty, default_rate, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`;
    for (const it of parsed) {
      await client.query(insertText, [companyId, it.section, it.item_code, it.description, it.unit, it.default_qty, it.default_rate, it.sort_order]);
    }

    await client.query('COMMIT');
    console.log(`✅ Seeded ${parsed.length} Fixed BOQ items for company ${companyId}`);
    await client.end();
  } catch (e) {
    console.error('❌ Seeding failed:', e?.message || e);
    process.exit(1);
  }
})();
