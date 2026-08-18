// The eight schools' REAL main gyms — three each, with address, hours, a demo
// rating and count, and a size line — the same data preview-gyms8.mjs renders
// its review sheet from, kept here so patch-gyms.mjs can write them onto the
// real Gyms capture. Facilities researched per school; ratings/counts are
// demo data; hours are the plausible campus-rec pattern and want a pass
// before launch. `sub` is the residential-gym section label under the cards.
export const SCHOOL_GYMS = [
  { key: "harvard", n: "Harvard", sub: "HOUSE GYMS",
    gyms: [["Malkin Athletic Center", "39 Holyoke Street", "6am–11pm", "4.8", "142", "3 floors"],
           ["Murr Center", "65 N Harvard St", "6am–10pm", "4.6", "98", "2 floors"],
           ["Hemenway Gymnasium", "7 Divinity Avenue", "6am–10pm", "4.4", "76", "2 floors"]] },
  { key: "yale", n: "Yale", sub: "COLLEGE GYMS",
    gyms: [["Payne Whitney Gymnasium", "70 Tower Parkway", "6am–11pm", "4.7", "163", "9 floors"],
           ["Israel Fitness Center", "PWG · 4th floor", "6am–10pm", "4.6", "121", "20,000 sq ft"],
           ["Lanman Center", "PWG · court level", "7am–10pm", "4.3", "64", "4 courts"]] },
  { key: "princeton", n: "Princeton", sub: "COLLEGE GYMS",
    gyms: [["Dillon Gymnasium", "Elm Drive", "6am–11pm", "4.7", "134", "150,000 sq ft"],
           ["Stephens Fitness Center", "Dillon Gym · bi-level", "6am–11pm", "4.6", "112", "8,000 sq ft"],
           ["Jadwin Gymnasium", "Fitzrandolph Road", "7am–10pm", "4.2", "58", "indoor track"]] },
  { key: "penn", n: "Penn", sub: "COLLEGE HOUSE GYMS",
    gyms: [["Pottruck Health & Fitness", "3701 Walnut Street", "6am–11pm", "4.6", "147", "120,000 sq ft"],
           ["Fox Fitness Center", "219 S 33rd Street", "7am–10pm", "4.3", "71", "1 floor"],
           ["Sheerr Pool", "Pottruck · lower level", "7am–9pm", "4.4", "52", "12 lanes"]] },
  { key: "brown", n: "Brown", sub: "DORM GYMS",
    gyms: [["Nelson Fitness Center", "225 Hope Street", "6am–11pm", "4.7", "128", "10,000 sq ft loft"],
           ["Olney-Margolies Center", "235 Hope Street", "6am–10pm", "4.4", "83", "86,000 sq ft"],
           ["Coleman Aquatics Center", "225 Hope Street", "7am–9pm", "4.5", "61", "8 lanes"]] },
  { key: "columbia", n: "Columbia", sub: "RESIDENCE GYMS",
    gyms: [["Dodge Fitness Center", "3030 Broadway", "6am–11pm", "4.4", "156", "tri-level"],
           ["Levien Gymnasium", "Dodge · court level", "7am–10pm", "4.3", "74", "3 courts"],
           ["University Gym (Blue Gym)", "Dodge · lower level", "7am–10pm", "4.1", "48", "1 court"]] },
  { key: "cornell", n: "Cornell", sub: "NORTH & WEST",
    gyms: [["Helen Newman Hall", "163 Cradit Farm Drive", "6am–9pm", "4.5", "119", "pool · bowling"],
           ["Noyes Recreation Center", "306 West Avenue", "7am–11pm", "4.6", "104", "bouldering wall"],
           ["Teagle Hall", "512 Campus Road", "7am–10:45pm", "4.2", "67", "2 fitness floors"]] },
  { key: "dartmouth", n: "Dartmouth", sub: "HOUSE GYMS",
    gyms: [["Lewinstein Athletic Center", "Alumni Gym · 6 S Park St", "6am–11pm", "4.6", "97", "renovated 2023"],
           ["Zimmerman Fitness Center", "Alumni Gym · 3rd floor", "6am–11pm", "4.7", "115", "16,000 sq ft"],
           ["Berry Sports Center", "6 South Park Street", "7am–10pm", "4.3", "56", "2nd floor"]] },
];
